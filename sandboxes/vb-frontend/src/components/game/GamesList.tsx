import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GameRead } from '../../types/game';
import { useAuth } from '../../contexts/AuthContext';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';
import Button from '../common/Button';
import Loading from '../common/Loading';
import Card from '../common/Card';

interface GamesListProps {
  games: GameRead[];
  sourceType: 'round' | 'squad';
  isLoading?: boolean;
}

const GamesList: React.FC<GamesListProps> = ({
  games,
  sourceType,
  isLoading = false,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleAwareNav = useRoleAwareNavigation(user);

  const getGameStatusInfo = (game: GameRead) => {
    const status = (game as any).status || 'pending';

    let statusLabel;
    let statusColor;

    switch (status) {
      case 'completed':
        statusLabel = 'Completed';
        statusColor = 'bg-green-100 text-green-800';
        break;
      case 'in_progress':
        statusLabel = 'In Progress';
        statusColor = 'bg-yellow-100 text-yellow-800';
        break;
      case 'scheduled':
        statusLabel = 'Scheduled';
        statusColor = 'bg-blue-100 text-blue-800';
        break;
      case 'verified':
        statusLabel = 'Verified';
        statusColor = 'bg-purple-100 text-purple-800';
        break;
      default:
        statusLabel = 'Pending';
        statusColor = 'bg-surface-light text-text';
    }

    return { statusLabel, statusColor };
  };

  const handleViewGame = (gameId: number) => {
    navigate(roleAwareNav.getGamePath(gameId));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loading size="medium" />
      </div>
    );
  }

  if (!games || games.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-muted mb-4">
          No games have been created for this {sourceType} yet. Games are created when
          participants lock in from the event scoring tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {games.map((game) => {
        const { statusLabel, statusColor } = getGameStatusInfo(game);
        const userInfo = (game as any).user_name ? ` - ${(game as any).user_name}` : '';

        return (
          <Card key={game.id} className="p-4 hover:bg-surface-light">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center">
                  <h3 className="text-lg font-medium text-text">
                    Game #{game.game_number}{userInfo}
                  </h3>
                  <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-4 text-sm text-text-muted">
                  <div>
                    <span className="font-medium">Raw Score:</span> {game.score}
                  </div>
                  {game.handicap !== null && (
                    <div>
                      <span className="font-medium">Handicap:</span> {game.handicap}
                    </div>
                  )}
                  {game.total_score !== null && (
                    <div>
                      <span className="font-medium">Total:</span> {game.total_score}
                    </div>
                  )}
                </div>

                {game.strikes !== null && game.spares !== null && (
                  <div className="mt-1 text-sm text-text-muted">
                    <span className="font-medium">Strikes:</span> {game.strikes} |
                    <span className="font-medium ml-2">Spares:</span> {game.spares}
                    {game.splits !== null && (
                      <> | <span className="font-medium">Splits:</span> {game.splits}</>
                    )}
                  </div>
                )}

                {game.notes && (
                  <div className="mt-1 text-sm text-text-muted">
                    <span className="font-medium">Notes:</span> {game.notes}
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="darkbackground"
                  size="small"
                  onClick={() => handleViewGame(game.id)}
                >
                  View Game
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default GamesList;
