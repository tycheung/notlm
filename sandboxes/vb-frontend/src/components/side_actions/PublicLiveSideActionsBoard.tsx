import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SideActionsAPI } from '../../api/side-actions';
import { getErrorMessage } from '../../api/apiErrors';
import { SideAction, SideActionType } from '../../types/side_action';
import Alert from '../common/Alert';
import Button from '../common/Button';
import Loading from '../common/Loading';
import HighGameStandingsModal from './HighGameStandingsModal';
import HighSetStandingsModal from './HighSetStandingsModal';
import EliminatorStandingsModal from './EliminatorStandingsModal';
import PublicLiveBracketViewerModal from './PublicLiveBracketViewerModal';
import PublicLiveAliveListModal from './PublicLiveAliveListModal';
import { MysteryDoublesStandingsModal } from '../../features/side-actions/mystery-doubles';
import { MysteryGameSpinModal } from '../../features/side-actions/mystery-game';
import { LoveDoublesStandingsModal } from '../../features/side-actions/love-doubles';
import { AlibiDoublesStandingsModal } from '../../features/side-actions/alibi-doubles';

function typeLabel(type: SideActionType | string): string {
  switch (type) {
    case SideActionType.HIGH_GAME:
      return 'High Game';
    case SideActionType.HIGH_SET:
      return 'High Series';
    case SideActionType.ELIMINATOR:
      return 'Eliminator';
    case SideActionType.MYSTERY_DOUBLES:
      return 'Mystery Doubles';
    case SideActionType.MYSTERY_GAME:
      return 'Mystery Game';
    case SideActionType.LOVE_DOUBLES:
      return 'Love Doubles';
    case SideActionType.ALIBI_DOUBLES:
      return 'Alibi Doubles';
    case SideActionType.BRACKET:
      return 'Brackets';
    default:
      return String(type);
  }
}

interface PublicLiveSideActionsBoardProps {
  tournamentId: number;
  eventId: number;
}

/**
 * Read-only live side-action board for spectators / bowlers.
 * Dollar amounts are stripped by the API for non-participants.
 */
const PublicLiveSideActionsBoard: React.FC<PublicLiveSideActionsBoardProps> = ({
  tournamentId,
  eventId,
}) => {
  const [viewing, setViewing] = useState<SideAction | null>(null);
  const [aliveListSa, setAliveListSa] = useState<SideAction | null>(null);

  const { data: sideActions = [], isLoading, isError, error } = useQuery({
    queryKey: ['liveSideActions', tournamentId, eventId],
    queryFn: () =>
      SideActionsAPI.getSideActions({
        tournament_id: tournamentId,
        event_id: eventId,
        active_only: true,
      }),
    enabled: tournamentId > 0 && eventId > 0,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const liveActions = useMemo(() => sideActions, [sideActions]);

  const openStandings = (sa: SideAction) => {
    setViewing(sa);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-primary">Side action results</h3>
        <p className="text-sm text-text-muted mt-1">
          Results update as scores come in. Dollar amounts are hidden unless you
          participated in this event.
        </p>
      </div>

      {isLoading && <Loading />}
      {isError && (
        <Alert
          variant="error"
          message={getErrorMessage(error, 'Could not load side actions.')}
        />
      )}
      {!isLoading && !isError && liveActions.length === 0 && (
        <p className="text-sm text-text-muted">No side actions for this event yet.</p>
      )}

      {liveActions.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface overflow-hidden">
          {liveActions.map((sa) => (
            <li
              key={sa.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-text truncate">{sa.name}</p>
                <p className="text-xs text-text-muted">
                  {typeLabel(sa.side_action_type)}
                  {sa.status ? ` · ${String(sa.status).replace(/_/g, ' ')}` : ''}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {sa.side_action_type === SideActionType.BRACKET && (
                  <Button
                    type="button"
                    size="small"
                    variant="lightbackground"
                    className="min-h-11 w-full sm:w-auto"
                    onClick={() => setAliveListSa(sa)}
                    title="View live list"
                  >
                    Live list
                  </Button>
                )}
                <Button
                  type="button"
                  size="small"
                  variant="lightbackground"
                  className="min-h-11 w-full sm:w-auto"
                  onClick={() => openStandings(sa)}
                  title={
                    sa.side_action_type === SideActionType.BRACKET
                      ? 'View live brackets'
                      : 'View live standings'
                  }
                >
                  {sa.side_action_type === SideActionType.BRACKET
                    ? 'View brackets'
                    : 'View standings'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {viewing?.side_action_type === SideActionType.HIGH_GAME && (
        <HighGameStandingsModal
          isOpen
          onClose={() => setViewing(null)}
          sideActionId={viewing.id}
          sideActionName={viewing.name}
        />
      )}
      {viewing?.side_action_type === SideActionType.HIGH_SET && (
        <HighSetStandingsModal
          isOpen
          onClose={() => setViewing(null)}
          sideActionId={viewing.id}
          sideActionName={viewing.name}
        />
      )}
      {viewing?.side_action_type === SideActionType.ELIMINATOR && (
        <EliminatorStandingsModal
          isOpen
          onClose={() => setViewing(null)}
          sideActionId={viewing.id}
          sideActionName={viewing.name}
        />
      )}
      {viewing?.side_action_type === SideActionType.MYSTERY_DOUBLES && (
        <MysteryDoublesStandingsModal
          isOpen
          onClose={() => setViewing(null)}
          sideActionId={viewing.id}
          sideActionName={viewing.name}
          allowDrawPairs={false}
        />
      )}
      {viewing?.side_action_type === SideActionType.MYSTERY_GAME && (
        <MysteryGameSpinModal
          isOpen
          onClose={() => setViewing(null)}
          sideActionId={viewing.id}
          sideActionName={viewing.name}
          allowSpin={false}
        />
      )}
      {viewing?.side_action_type === SideActionType.LOVE_DOUBLES && (
        <LoveDoublesStandingsModal
          isOpen
          onClose={() => setViewing(null)}
          sideActionId={viewing.id}
          sideActionName={viewing.name}
        />
      )}
      {viewing?.side_action_type === SideActionType.ALIBI_DOUBLES && (
        <AlibiDoublesStandingsModal
          isOpen
          onClose={() => setViewing(null)}
          sideActionId={viewing.id}
          sideActionName={viewing.name}
        />
      )}
      {viewing?.side_action_type === SideActionType.BRACKET && (
        <PublicLiveBracketViewerModal
          isOpen
          onClose={() => setViewing(null)}
          sideActionId={viewing.id}
          sideActionName={viewing.name}
        />
      )}
      {aliveListSa && (
        <PublicLiveAliveListModal
          isOpen
          onClose={() => setAliveListSa(null)}
          sideActionId={aliveListSa.id}
          sideActionName={aliveListSa.name}
          tournamentId={tournamentId}
          eventId={eventId}
        />
      )}
    </div>
  );
};

export default PublicLiveSideActionsBoard;
