import { useState, useCallback } from 'react';
import { GamesAPI } from '../api/games';
import { GameUpdate, TemporaryGameShellData } from '../types/game';
import { getIndividualTempGameId } from '../utils/gameTempIds';

/**
 * Metadata required to create a game shell
 */
export interface TemporaryGameMetadata {
  event_participant_id: number;
  squad_participant_id?: number;
  team_id?: number;
  user_id: number;
  round_id?: number; // Optional for team member games (backend looks it up from team game)
  squad_id?: number; // Optional for team member games (backend looks it up from team game)
  team_game_id?: number; // Required for team member games - links to parent team game
  game_number: number;
  is_team_game: boolean;
}

/**
 * Temporary game shell with pending changes
 */
interface TemporaryGameShell {
  metadata: TemporaryGameMetadata;
  pendingChanges: Partial<GameUpdate>;
}

/**
 * Map of temporary IDs to game shells
 */
type TemporaryGameShells = Record<string, TemporaryGameShell>;

/**
 * Result of creating a game from a temporary shell
 */
export interface GameCreationResult {
  tempId: string;
  realGameId: number;
  game: any;
}

/**
 * Return type for useTemporaryGames hook
 */
interface UseTemporaryGamesReturn {
  /**
   * Create a temporary game shell and return its temporary ID
   */
  createTemporaryGameShell: (metadata: TemporaryGameMetadata) => string;

  /**
   * Create shell and set one pending field atomically (preferred for new shells)
   */
  createTemporaryGameShellWithPending: (
    metadata: TemporaryGameMetadata,
    field: keyof GameUpdate,
    value: any
  ) => string;
  
  /**
   * Stage a change on a temporary game shell
   */
  stageChangeOnTemporaryGame: (tempId: string, field: keyof GameUpdate, value: any) => void;
  
  /**
   * Get a pending value from a temporary game shell
   */
  getTemporaryGameValue: (tempId: string, field: keyof GameUpdate) => any;
  
  /**
   * Check if a temporary game shell exists
   */
  hasTemporaryGame: (tempId: string) => boolean;
  
  /**
   * Get all temporary game shells
   */
  getTemporaryGameShells: () => TemporaryGameShells;
  
  /**
   * Create games from temporary shells and return mapping of temp IDs to real IDs
   */
  createGamesFromShells: () => Promise<GameCreationResult[]>;
  
  /**
   * Clear all temporary game shells
   */
  clearTemporaryGames: () => void;
  
  /**
   * Check if there are any temporary games
   */
  hasAnyTemporaryGames: () => boolean;
  
  /**
   * Loading state - true when creating games
   */
  isCreatingGames: boolean;
}

/**
 * Hook for managing temporary game shells
 * 
 * This hook handles the lifecycle of temporary game shells:
 * 1. Create temporary shells when games don't exist yet
 * 2. Stage changes on temporary shells
 * 3. Create real games from shells when saving
 * 4. Map temporary IDs to real IDs
 */
export const useTemporaryGames = (): UseTemporaryGamesReturn => {
  const [temporaryGameShells, setTemporaryGameShells] = useState<TemporaryGameShells>({});
  const [isCreatingGames, setIsCreatingGames] = useState<boolean>(false);

  /**
   * Generate a unique temporary ID for a game shell
   */
  const generateTempId = useCallback((metadata: TemporaryGameMetadata): string => {
    if (metadata.is_team_game && metadata.team_id) {
      return `temp-team-${metadata.team_id}-${metadata.game_number}`;
    }
    return getIndividualTempGameId({
      event_participant_id: metadata.event_participant_id,
      game_number: metadata.game_number,
      squad_participant_id: metadata.squad_participant_id,
    });
  }, []);

  /**
   * Create a temporary game shell
   */
  const createTemporaryGameShell = useCallback((metadata: TemporaryGameMetadata): string => {
    const tempId = generateTempId(metadata);
    
    setTemporaryGameShells(prev => {
      // Don't overwrite if shell already exists
      if (prev[tempId]) {
        return prev;
      }
      
      return {
        ...prev,
        [tempId]: {
          metadata,
          pendingChanges: {}
        }
      };
    });
    
    return tempId;
  }, [generateTempId]);

  /**
   * Create shell and pending field in one state update (avoids staging before shell exists).
   */
  const createTemporaryGameShellWithPending = useCallback(
    (metadata: TemporaryGameMetadata, field: keyof GameUpdate, value: any): string => {
      const tempId = generateTempId(metadata);
      setTemporaryGameShells(prev => {
        const existing = prev[tempId];
        if (existing) {
          return {
            ...prev,
            [tempId]: {
              ...existing,
              metadata: { ...existing.metadata, ...metadata },
              pendingChanges: {
                ...existing.pendingChanges,
                [field]: value
              }
            }
          };
        }
        return {
          ...prev,
          [tempId]: {
            metadata,
            pendingChanges: { [field]: value }
          }
        };
      });
      return tempId;
    },
    [generateTempId]
  );

  /**
   * Stage a change on a temporary game shell
   */
  const stageChangeOnTemporaryGame = useCallback((tempId: string, field: keyof GameUpdate, value: any) => {
    setTemporaryGameShells(prev => {
      const shell = prev[tempId];
      if (!shell) {
        // Shell doesn't exist, can't stage change
        console.warn(`Cannot stage change on non-existent temporary game: ${tempId}`);
        return prev;
      }
      
      return {
        ...prev,
        [tempId]: {
          ...shell,
          pendingChanges: {
            ...shell.pendingChanges,
            [field]: value
          }
        }
      };
    });
  }, []);

  /**
   * Get a pending value from a temporary game shell
   */
  const getTemporaryGameValue = useCallback((tempId: string, field: keyof GameUpdate) => {
    const shell = temporaryGameShells[tempId];
    return shell?.pendingChanges[field];
  }, [temporaryGameShells]);

  /**
   * Check if a temporary game shell exists
   */
  const hasTemporaryGame = useCallback((tempId: string) => {
    return !!temporaryGameShells[tempId];
  }, [temporaryGameShells]);

  /**
   * Get all temporary game shells
   */
  const getTemporaryGameShells = useCallback(() => {
    return temporaryGameShells;
  }, [temporaryGameShells]);

  /**
   * Create games from temporary shells and return mapping of temp IDs to real IDs
   * Uses the unified batch endpoint - backend handles all business logic
   */
  const createGamesFromShells = useCallback(async (): Promise<GameCreationResult[]> => {
    const shells = Object.entries(temporaryGameShells);
    
    if (shells.length === 0) {
      return [];
    }

    // Set loading state
    setIsCreatingGames(true);

    try {
      // Convert temporary shells to the format expected by the unified endpoint
      const temporaryShellsData: TemporaryGameShellData[] = shells.map(([tempId, shell]) => {
        const { metadata, pendingChanges } = shell;
        
        return {
          temp_id: tempId,
          event_participant_id: metadata.event_participant_id,
          squad_participant_id: metadata.squad_participant_id,
          team_id: metadata.team_id,
          user_id: metadata.user_id,
          game_number: metadata.game_number,
          round_id: metadata.round_id,
          squad_id: metadata.squad_id,
          team_game_id: metadata.team_game_id,
          is_team_game: metadata.is_team_game,
          score: pendingChanges.score !== undefined ? pendingChanges.score : null,
          handicap: pendingChanges.handicap !== undefined ? pendingChanges.handicap : null
        };
      });

      // Call the unified batch endpoint - backend handles everything!
      const response = await GamesAPI.unifiedBatchGameOperation({
        temporary_shells: temporaryShellsData,
        game_updates: [] // No existing game updates in this call - those are handled separately
      });

      // Convert response to GameCreationResult format
      const results: GameCreationResult[] = [];
      
      // Map created games using temp_id_mapping
      for (const [tempId, realGameId] of Object.entries(response.temp_id_mapping)) {
        const createdGame = response.created_games.find(g => g.id === realGameId);
        if (createdGame) {
          results.push({
            tempId,
            realGameId,
            game: createdGame
          });
        }
      }

      // Log any errors
      if (response.errors && response.errors.length > 0) {
        console.warn('Some games had errors during creation:', response.errors);
      }

      return results;
    } catch (error: any) {
      console.error('Error creating games from shells:', error);
      throw error;
    } finally {
      // Clear loading state
      setIsCreatingGames(false);
    }
  }, [temporaryGameShells]);

  /**
   * Clear all temporary game shells
   */
  const clearTemporaryGames = useCallback(() => {
    setTemporaryGameShells({});
  }, []);

  /**
   * Check if there are any temporary games
   */
  const hasAnyTemporaryGames = useCallback(() => {
    return Object.keys(temporaryGameShells).length > 0;
  }, [temporaryGameShells]);

  return {
    createTemporaryGameShell,
    createTemporaryGameShellWithPending,
    stageChangeOnTemporaryGame,
    getTemporaryGameValue,
    hasTemporaryGame,
    getTemporaryGameShells,
    createGamesFromShells,
    clearTemporaryGames,
    hasAnyTemporaryGames,
    isCreatingGames
  };
};
