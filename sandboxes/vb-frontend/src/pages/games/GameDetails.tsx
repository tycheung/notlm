import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GamesAPI } from '../../api/games';
import { RoundsAPI } from '../../api/rounds';
import { SquadsAPI } from '../../api/squads';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import Alert from '../../components/common/Alert';
import PageTitle from '../../components/common/PageTitle';
import Breadcrumb from '../../components/common/Breadcrumb';
import { formatDateTimeNaive } from '../../utils/dateUtils';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';
import { getErrorMessage } from '../../api/apiErrors';
import type { GameStatus } from '../../types/game';
import { Role } from '../../types/user';
import { isDirectorSuiteRole } from '../../utils/roles';

function statusDisplay(status: GameStatus | undefined): {
  statusLabel: string;
  statusColor: string;
} {
  switch (status) {
    case 'completed':
      return { statusLabel: 'Completed', statusColor: 'bg-green-100 text-green-800' };
    case 'in_progress':
      return {
        statusLabel: 'In Progress',
        statusColor: 'bg-yellow-100 text-yellow-800',
      };
    case 'scheduled':
      return { statusLabel: 'Scheduled', statusColor: 'bg-blue-100 text-blue-800' };
    case 'verified':
      return { statusLabel: 'Verified', statusColor: 'bg-purple-100 text-purple-800' };
    case 'rejected':
      return { statusLabel: 'Rejected', statusColor: 'bg-red-100 text-red-800' };
    case 'cancelled':
      return {
        statusLabel: 'Cancelled',
        statusColor: 'bg-surface-light text-text-muted',
      };
    default:
      return { statusLabel: 'Pending', statusColor: 'bg-surface-light text-text' };
  }
}

const GameDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const gameId = id ? parseInt(id, 10) : 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const roleAwareNav = useRoleAwareNavigation(user);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canReviewScores = isDirectorSuiteRole(user?.role);

  const {
    data: gameWithFrames,
    isLoading: gameLoading,
    error: gameError,
  } = useQuery({
    queryKey: ['gameWithFrames', gameId],
    queryFn: () => GamesAPI.getGameWithFrames(gameId),
    enabled: !!gameId,
  });

  const { data: roundWithEvent, isLoading: roundLoading } = useQuery({
    queryKey: ['roundWithEvent', gameWithFrames?.round_id],
    queryFn: () => RoundsAPI.getRoundWithEvent(gameWithFrames?.round_id || 0),
    enabled: !!gameWithFrames?.round_id && !gameWithFrames?.squad_id,
  });

  const { data: squadWithEvent, isLoading: squadLoading } = useQuery({
    queryKey: ['squadWithEvent', gameWithFrames?.squad_id],
    queryFn: () => SquadsAPI.getSquadWithEvent(gameWithFrames?.squad_id || 0),
    enabled: !!gameWithFrames?.squad_id,
  });

  const invalidateGame = async () => {
    await queryClient.invalidateQueries({ queryKey: ['gameWithFrames', gameId] });
  };

  const verifyMutation = useMutation({
    mutationFn: () => {
      if (!user?.id) throw new Error('Not signed in');
      return GamesAPI.verifyGame(gameId, user.id);
    },
    onSuccess: async () => {
      setActionError(null);
      await invalidateGame();
    },
    onError: (err) => {
      setActionError(getErrorMessage(err, 'Failed to verify game'));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) =>
      GamesAPI.rejectGame(gameId, reason, { synchronous: true }),
    onSuccess: async () => {
      setActionError(null);
      setShowRejectForm(false);
      setRejectReason('');
      await invalidateGame();
    },
    onError: (err) => {
      setActionError(getErrorMessage(err, 'Failed to reject game'));
    },
  });

  const handleBackToSource = () => {
    if (roundWithEvent) {
      navigate(roleAwareNav.getRoundPath(roundWithEvent.id));
    } else if (squadWithEvent) {
      navigate(roleAwareNav.getSquadPath(squadWithEvent.id));
    }
  };

  if (gameLoading || roundLoading || squadLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loading size="medium" />
      </div>
    );
  }

  if (gameError || !gameWithFrames) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4">
        <Alert variant="error" message="Error loading game details." className="mb-4" />
      </div>
    );
  }

  const { statusLabel, statusColor } = statusDisplay(gameWithFrames.status);
  const bowlerName = gameWithFrames.user_name || `Bowler #${gameWithFrames.user_id}`;
  const canVerify =
    canReviewScores &&
    gameWithFrames.score != null &&
    !gameWithFrames.verified &&
    gameWithFrames.status !== 'rejected';
  const canReject =
    canReviewScores &&
    gameWithFrames.score != null &&
    gameWithFrames.status !== 'rejected';

  const breadcrumbItems = [
    { label: 'Home', path: '/' },
    { label: 'Tournaments', path: roleAwareNav.getRoleAwarePath('/tournaments') },
  ];

  const roundEvent = roundWithEvent?.event as
    | {
        name?: string;
        id?: number;
        tournament_id?: number;
        tournament?: { name?: string };
      }
    | undefined;
  if (roundWithEvent && roundEvent) {
    breadcrumbItems.push(
      {
        label: roundEvent.tournament?.name || 'Tournament',
        path: roleAwareNav.getTournamentPath(roundEvent.tournament_id as number),
      },
      {
        label: roundEvent.name || 'Event',
        path: roleAwareNav.getEventPath(roundEvent.id as number),
      },
      {
        label: `Round ${roundWithEvent.round_number}`,
        path: roleAwareNav.getRoundPath(roundWithEvent.id),
      }
    );
  } else if (squadWithEvent) {
    const squadRecord = squadWithEvent as {
      event?: {
        name?: string;
        id?: number;
        tournament_id?: number;
        tournament?: { name?: string };
      };
      round?: {
        event?: {
          name?: string;
          id?: number;
          tournament_id?: number;
          tournament?: { name?: string };
        };
      };
      name?: string;
      squad_number?: number;
      id: number;
    };
    const event = squadRecord.event || squadRecord.round?.event;
    if (event?.id != null && event.tournament_id != null) {
      breadcrumbItems.push(
        {
          label: event.tournament?.name || 'Tournament',
          path: roleAwareNav.getTournamentPath(event.tournament_id),
        },
        {
          label: event.name || 'Event',
          path: roleAwareNav.getEventPath(event.id),
        },
        {
          label: squadRecord.name || `Squad ${squadRecord.squad_number || squadRecord.id}`,
          path: roleAwareNav.getSquadPath(squadRecord.id),
        }
      );
    }
  }

  breadcrumbItems.push({ label: `Game #${gameWithFrames.game_number}`, path: '' });

  const hasTenthFrame = gameWithFrames.frames.some((frame) => frame.frame === 10);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <Breadcrumb items={breadcrumbItems} className="mb-6" />

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4">
          <div>
            <div className="flex items-center mb-2">
              <PageTitle size="responsive">Game #{gameWithFrames.game_number}</PageTitle>
              <span
                className={`ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
              >
                {statusLabel}
              </span>
            </div>
            <p className="text-text-muted text-sm">
              {bowlerName}
              {roundWithEvent && ` - Round ${roundWithEvent.round_number}`}
              {squadWithEvent &&
                ` - ${squadWithEvent.name || `Squad ${squadWithEvent.id}`}`}
            </p>
          </div>

          <div className="flex mt-4 sm:mt-0 space-x-2">
            {(roundWithEvent || squadWithEvent) && (
              <Button
                variant="lightbackground"
                onClick={handleBackToSource}
                className="shrink-0"
              >
                Back to {roundWithEvent ? 'Round' : 'Squad'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {actionError && <Alert variant="error" message={actionError} className="mb-4" />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Frame Details">
            {gameWithFrames.frames && gameWithFrames.frames.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-primary">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                        Frame
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                        1st Ball
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                        2nd Ball
                      </th>
                      {hasTenthFrame && (
                        <th className="px-3 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                          3rd Ball
                        </th>
                      )}
                      <th className="px-3 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                        Strike
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                        Spare
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface divide-y divide-border">
                    {gameWithFrames.frames.map((frame) => (
                      <tr key={frame.frame} className="hover:bg-surface-light">
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-text">
                          {frame.frame}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-text">
                          {frame.first_ball}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-text">
                          {frame.second_ball || '-'}
                        </td>
                        {hasTenthFrame && (
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-text">
                            {frame.frame === 10 ? frame.third_ball || '-' : '-'}
                          </td>
                        )}
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-text">
                          {frame.is_strike ? '✓' : '-'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-text">
                          {frame.is_spare ? '✓' : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center py-6 text-text-muted">
                No frame-by-frame data available for this game. Scores are entered as
                totals; frame strings are optional display metadata.
              </p>
            )}
          </Card>

          <Card title="Game Source Information">
            <div className="space-y-3 text-text">
              {roundWithEvent && (
                <div>
                  <h3 className="font-medium text-text mb-2">Round Information</h3>
                  <p>
                    <span className="font-medium">Event:</span>{' '}
                    {roundWithEvent.event?.name}
                  </p>
                  <p>
                    <span className="font-medium">Round:</span>{' '}
                    {roundWithEvent.round_number}
                  </p>
                  <p>
                    <span className="font-medium">Round Status:</span>{' '}
                    {roundWithEvent.status}
                  </p>
                </div>
              )}

              {squadWithEvent && (
                <div>
                  <h3 className="font-medium text-text mb-2">Squad Information</h3>
                  <p>
                    <span className="font-medium">Squad:</span>{' '}
                    {squadWithEvent.name || `Squad ${squadWithEvent.id}`}
                  </p>
                  <p>
                    <span className="font-medium">Squad Status:</span>{' '}
                    {squadWithEvent.status}
                  </p>
                  {squadWithEvent.start_datetime && (
                    <p>
                      <span className="font-medium">Start Time:</span>{' '}
                      {formatDateTimeNaive(squadWithEvent.start_datetime)}
                    </p>
                  )}
                </div>
              )}

              {!roundWithEvent && !squadWithEvent && (
                <p className="text-text-muted">
                  No source information available for this game.
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Game Details">
            <div className="space-y-3 text-text">
              <p>
                <span className="font-medium">Game Number:</span>{' '}
                {gameWithFrames.game_number}
              </p>
              <p>
                <span className="font-medium">Score:</span>{' '}
                {gameWithFrames.score ?? 'Not scored'}
              </p>
              <p>
                <span className="font-medium">Handicap:</span>{' '}
                {gameWithFrames.handicap ?? 'None'}
              </p>
              <p>
                <span className="font-medium">Status:</span> {statusLabel}
              </p>
              <p>
                <span className="font-medium">Verified:</span>{' '}
                {gameWithFrames.verified ? 'Yes' : 'No'}
              </p>
              {gameWithFrames.rejection_reason && (
                <p>
                  <span className="font-medium">Rejection reason:</span>{' '}
                  {gameWithFrames.rejection_reason}
                </p>
              )}
            </div>

            {(canVerify || canReject) && (
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                <p className="text-sm text-text-muted">
                  Review this score (requires game scoring access).
                </p>
                <div className="flex flex-wrap gap-2">
                  {canVerify && (
                    <Button
                      type="button"
                      onClick={() => verifyMutation.mutate()}
                      disabled={verifyMutation.isPending || rejectMutation.isPending}
                    >
                      {verifyMutation.isPending ? 'Verifying…' : 'Verify score'}
                    </Button>
                  )}
                  {canReject && !showRejectForm && (
                    <Button
                      type="button"
                      variant="lightbackground"
                      onClick={() => setShowRejectForm(true)}
                      disabled={verifyMutation.isPending || rejectMutation.isPending}
                    >
                      Reject score
                    </Button>
                  )}
                </div>
                {showRejectForm && (
                  <div className="space-y-2">
                    <label htmlFor="reject-reason" className="block text-sm font-medium">
                      Rejection reason
                    </label>
                    <textarea
                      id="reject-reason"
                      className="w-full border border-border rounded-md px-3 py-2 text-sm bg-surface"
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Why is this score being rejected?"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() => {
                          const reason = rejectReason.trim();
                          if (!reason) {
                            setActionError('Rejection reason is required');
                            return;
                          }
                          rejectMutation.mutate(reason);
                        }}
                        disabled={rejectMutation.isPending || !rejectReason.trim()}
                      >
                        {rejectMutation.isPending ? 'Rejecting…' : 'Confirm reject'}
                      </Button>
                      <Button
                        type="button"
                        variant="lightbackground"
                        onClick={() => {
                          setShowRejectForm(false);
                          setRejectReason('');
                        }}
                        disabled={rejectMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card title="Bowler Information">
            <div className="space-y-3 text-text">
              <p>
                <span className="font-medium">Bowler:</span> {bowlerName}
              </p>
              <p>
                <span className="font-medium">User ID:</span> {gameWithFrames.user_id}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GameDetails;
