import React from 'react';
import { RoundRead, RoundSummary } from '../../types/round';
import { GameRead } from '../../types/game';
import {
  aggregateRoundCompletionCounts,
  filterGamesForAggregateRoundCompletion,
  gameCountsAsScoredForRoundCompletion,
} from '../../utils/gameCompletion';
import Card from '../common/Card';
import Loading from '../common/Loading';

interface RoundProgressTrackerProps {
  round: RoundRead;
  summary?: RoundSummary;
  participants?: any[];
  games?: GameRead[];
  isLoading?: boolean;
  /** When true, use team-aware shell filtering (matches backend completion snapshot). */
  isTeamEvent?: boolean;
}

const RoundProgressTracker: React.FC<RoundProgressTrackerProps> = ({
  round,
  summary,
  participants,
  games,
  isLoading = false,
  isTeamEvent = false,
}) => {
  if (isLoading) {
    return (
      <Card title="Round Progress" className="mb-6">
        <div className="flex justify-center py-8">
          <Loading size="medium" />
        </div>
      </Card>
    );
  }
  
  // Calculate stats from the data
  const totalGames = round.game_count || 0;
  const totalParticipants = participants?.length || 0;
  
  // Get completed games count - either from summary or by checking games array
  // Note: Using any type assertion for summary due to type inconsistencies
  let completedGames = summary ? (summary as any).completed_games || 0 : 0;
  
  let totalExpectedGames = totalParticipants * totalGames;
  if (games && games.length > 0) {
    const counts = aggregateRoundCompletionCounts(games, {
      isTeamEvent,
      expectedGameCount: totalGames,
    });
    completedGames = counts.scored;
    totalExpectedGames = counts.total;
  }

  const completionPercentage =
    totalExpectedGames > 0
      ? Math.round((completedGames / totalExpectedGames) * 100)
      : 0;
  
  const authoritativeGames =
    games && games.length > 0
      ? filterGamesForAggregateRoundCompletion(games, {
          isTeamEvent,
          expectedGameCount: totalGames,
        })
      : [];

  // Calculate game-by-game completion if we have the games data
  const gameBreakdown = authoritativeGames.length > 0 && totalGames > 0
    ? Array.from({ length: totalGames }, (_, i) => {
    const gameNumber = i + 1;
    const gamesWithNumber = authoritativeGames.filter(
      (g) => g.game_number === gameNumber
    );
    const completedCount = gamesWithNumber.filter((g) =>
      gameCountsAsScoredForRoundCompletion(g)
    ).length;
    const totalCount = gamesWithNumber.length;
    const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    
    return {
      gameNumber,
      completedCount,
      totalCount,
      percentage
    };
  }) : [];
  
  // Determine status color
  const getStatusColor = (percent: number) => {
    if (percent === 100) return 'bg-green-500';
    if (percent > 75) return 'bg-green-400';
    if (percent > 50) return 'bg-yellow-400';
    if (percent > 25) return 'bg-orange-400';
    return 'bg-red-400';
  };
  
  // Note: Using any type assertion for summary due to type inconsistencies
  const highestScore = summary
    ? Number(summary.high_game || (summary as { highest_score?: number }).highest_score || 0)
    : 0;
  const averageScore = summary ? Number(summary.average_score || 0) : 0;
  
  return (
    <Card title="Round Progress" className="mb-6">
      <div className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-text-muted">
            <span>Game Completion</span>
            <span className="font-medium">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-border rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${getStatusColor(completionPercentage)}`} 
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-text-muted">
            <span>{completedGames} of {totalExpectedGames} games completed</span>
            <span>{totalParticipants} participants × {totalGames} games each</span>
          </div>
        </div>
        
        {/* Game-by-Game Progress */}
        {gameBreakdown.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium text-sm mb-2">Game-by-Game Completion</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {gameBreakdown.map((game) => (
                <div key={game.gameNumber} className="bg-surface-light rounded p-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Game #{game.gameNumber}</span>
                    <span className="font-medium">{Math.round(game.percentage)}%</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${getStatusColor(game.percentage)}`} 
                      style={{ width: `${game.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-text-muted mt-1">
                    {game.completedCount} of {game.totalCount} completed
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Key Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface-light p-4 rounded-lg">
            <div className="text-sm text-text-muted mb-1">Participants</div>
            <div className="text-2xl font-bold text-text">{totalParticipants}</div>
          </div>
          
          <div className="bg-surface-light p-4 rounded-lg">
            <div className="text-sm text-text-muted mb-1">Highest Score</div>
            <div className="text-2xl font-bold text-text">{highestScore}</div>
          </div>
          
          <div className="bg-surface-light p-4 rounded-lg">
            <div className="text-sm text-text-muted mb-1">Average Score</div>
            <div className="text-2xl font-bold text-text">{averageScore}</div>
          </div>
        </div>
        
        {/* Status Message */}
        <div className="text-center text-sm text-text-muted">
          {completionPercentage === 100 ? (
            <span className="text-green-600 font-medium">All games have been completed for this round!</span>
          ) : round.status === 'in_progress' ? (
            <span>Round is in progress. {totalExpectedGames - completedGames} games remaining.</span>
          ) : round.status === 'scheduled' ? (
            <span>Round is scheduled but not yet started.</span>
          ) : round.status === 'completed' ? (
            <span className="text-yellow-600">Round is marked as completed but some games may be missing.</span>
          ) : (
            <span>Round status: {round.status}</span>
          )}
        </div>
      </div>
    </Card>
  );
};

export default RoundProgressTracker; 
