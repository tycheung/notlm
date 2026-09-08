import React from 'react';
import { GameRead } from '../../types/game';
import {
  aggregateRoundCompletionCounts,
  gameCountsAsScoredForRoundCompletion,
} from '../../utils/gameCompletion';
import Card from '../common/Card';
import Loading from '../common/Loading';

interface SquadProgressTrackerProps {
  squad: any; // Using any for flexibility, should be replaced with proper Squad type
  games?: GameRead[];
  participants?: any[]; // Should be replaced with proper participant type
  isLoading?: boolean;
  isTeamEvent?: boolean;
}

const SquadProgressTracker: React.FC<SquadProgressTrackerProps> = ({
  squad,
  games,
  participants,
  isLoading = false,
  isTeamEvent = false,
}) => {
  if (isLoading) {
    return (
      <Card title="Squad Progress" className="mb-6">
        <div className="flex justify-center py-8">
          <Loading size="medium" />
        </div>
      </Card>
    );
  }
  
  const totalParticipants = participants?.length || 0;
  const gameCount = squad.game_count || 0;

  const completionCounts =
    games && games.length > 0
      ? aggregateRoundCompletionCounts(games, {
          isTeamEvent,
          expectedGameCount: gameCount,
        })
      : null;
  const totalExpectedGames =
    completionCounts?.total ?? gameCount * totalParticipants;
  const completedGames = completionCounts?.scored ?? 0;
  const totalShells = completionCounts?.total ?? games?.length ?? 0;

  const completionPercentage =
    totalExpectedGames > 0
      ? Math.round((completedGames / totalExpectedGames) * 100)
      : 0;
  
  // Calculate average and highest score
  const scores =
    games
      ?.filter((game) => gameCountsAsScoredForRoundCompletion(game))
      .map((game) => game.score as number) || [];
  
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const averageScore = scores.length > 0 
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) 
    : 0;
  
  // Determine status color
  const getStatusColor = () => {
    if (completionPercentage === 100) return 'bg-green-500';
    if (completionPercentage > 75) return 'bg-green-400';
    if (completionPercentage > 50) return 'bg-yellow-400';
    if (completionPercentage > 25) return 'bg-orange-400';
    return 'bg-red-400';
  };
  
  return (
    <Card title="Squad Progress" className="mb-6">
      <div className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-text-muted">
            <span>Game Completion</span>
            <span className="font-medium">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-border rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${getStatusColor()}`} 
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-text-muted">
            <span>{completedGames} of {totalExpectedGames} games completed</span>
            <span>
              {totalShells > 0
                ? `${totalShells} game shell${totalShells === 1 ? '' : 's'}`
                : `${totalParticipants} participants × ${gameCount} games each`}
            </span>
          </div>
        </div>
        
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
            <span className="text-green-600 font-medium">All games have been completed for this squad!</span>
          ) : squad.status === 'in_progress' ? (
            <span>Squad is in progress. {totalExpectedGames - completedGames} games remaining.</span>
          ) : squad.status === 'scheduled' ? (
            <span>Squad is scheduled but not yet started.</span>
          ) : squad.status === 'completed' ? (
            <span className="text-yellow-600">Squad is marked as completed but some games may be missing.</span>
          ) : (
            <span>Squad status: {squad.status}</span>
          )}
        </div>
      </div>
    </Card>
  );
};

export default SquadProgressTracker; 
