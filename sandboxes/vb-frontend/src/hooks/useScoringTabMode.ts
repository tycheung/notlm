import { useCallback, useEffect, useState } from 'react';

export type ScoringTabMode = 'horizontal' | 'vertical';
export type TeamScoringMode = 'individual' | 'mixed' | 'team';
export type ScoringViewMode = 'entry' | 'reconcile' | 'lanes';
export type ScoringParticipantSortOrder = import('../utils/scoringParticipantSort').ScoringParticipantSortOrder;

const TAB_MODE_STORAGE_KEY = 'victoryBowling.scoringTabMode';
const TEAM_SCORING_MODE_STORAGE_KEY = 'victoryBowling.teamScoringMode';
const SCORING_VIEW_MODE_STORAGE_KEY = 'victoryBowling.scoringViewMode';
const PARTICIPANT_SORT_STORAGE_KEY = 'victoryBowling.scoringParticipantSort';

function readStoredMode(): ScoringTabMode {
  try {
    const v = localStorage.getItem(TAB_MODE_STORAGE_KEY);
    if (v === 'vertical' || v === 'horizontal') return v;
  } catch {
    /* ignore */
  }
  return 'horizontal';
}

function readStoredTeamScoringMode(): TeamScoringMode {
  try {
    const v = localStorage.getItem(TEAM_SCORING_MODE_STORAGE_KEY);
    if (v === 'individual' || v === 'mixed' || v === 'team') return v;
  } catch {
    /* ignore */
  }
  return 'individual';
}

function readStoredScoringViewMode(): ScoringViewMode {
  try {
    const v = localStorage.getItem(SCORING_VIEW_MODE_STORAGE_KEY);
    if (v === 'entry' || v === 'reconcile' || v === 'lanes') return v;
  } catch {
    /* ignore */
  }
  return 'entry';
}

function readStoredParticipantSortOrder(): ScoringParticipantSortOrder {
  try {
    const v = localStorage.getItem(PARTICIPANT_SORT_STORAGE_KEY);
    if (v === 'assignment' || v === 'name' || v === 'starting_lane') return v;
  } catch {
    /* ignore */
  }
  return 'assignment';
}

export function useScoringTabMode(): {
  tabMode: ScoringTabMode;
  setTabMode: (m: ScoringTabMode) => void;
  teamScoringMode: TeamScoringMode;
  setTeamScoringMode: (m: TeamScoringMode) => void;
  scoringViewMode: ScoringViewMode;
  setScoringViewMode: (m: ScoringViewMode) => void;
  participantSortOrder: ScoringParticipantSortOrder;
  setParticipantSortOrder: (m: ScoringParticipantSortOrder) => void;
} {
  const [tabMode, setTabModeState] = useState<ScoringTabMode>(readStoredMode);
  const [teamScoringMode, setTeamScoringModeState] = useState<TeamScoringMode>(
    readStoredTeamScoringMode
  );
  const [scoringViewMode, setScoringViewModeState] = useState<ScoringViewMode>(
    readStoredScoringViewMode
  );
  const [participantSortOrder, setParticipantSortOrderState] = useState<ScoringParticipantSortOrder>(
    readStoredParticipantSortOrder
  );

  useEffect(() => {
    try {
      localStorage.setItem(TAB_MODE_STORAGE_KEY, tabMode);
    } catch {
      /* ignore */
    }
  }, [tabMode]);
  useEffect(() => {
    try {
      localStorage.setItem(TEAM_SCORING_MODE_STORAGE_KEY, teamScoringMode);
    } catch {
      /* ignore */
    }
  }, [teamScoringMode]);
  useEffect(() => {
    try {
      localStorage.setItem(SCORING_VIEW_MODE_STORAGE_KEY, scoringViewMode);
    } catch {
      /* ignore */
    }
  }, [scoringViewMode]);
  useEffect(() => {
    try {
      localStorage.setItem(PARTICIPANT_SORT_STORAGE_KEY, participantSortOrder);
    } catch {
      /* ignore */
    }
  }, [participantSortOrder]);

  const setTabMode = useCallback((m: ScoringTabMode) => {
    setTabModeState(m);
  }, []);
  const setTeamScoringMode = useCallback((m: TeamScoringMode) => {
    setTeamScoringModeState(m);
  }, []);
  const setScoringViewMode = useCallback((m: ScoringViewMode) => {
    setScoringViewModeState(m);
  }, []);
  const setParticipantSortOrder = useCallback((m: ScoringParticipantSortOrder) => {
    setParticipantSortOrderState(m);
  }, []);

  return {
    tabMode,
    setTabMode,
    teamScoringMode,
    setTeamScoringMode,
    scoringViewMode,
    setScoringViewMode,
    participantSortOrder,
    setParticipantSortOrder,
  };
}
