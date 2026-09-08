import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Alert from '../common/Alert';
import { SideActionsAPI } from '../../api/side-actions';
import { getErrorMessage } from '../../api/apiErrors';
import { sideActionQueryKeys } from '../../features/side-actions/shared';
import type { SideAction } from '../../types/side_action';
import {
  destinationGameCount,
  findDeskScopeSquad,
  type DeskScopeRound,
} from './sideActionDeskScope';
import DestinationSquadPicker, {
  type DestinationSquadSelection,
} from './DestinationSquadPicker';
import {
  assertAllCopyGamesFitDestination,
  assertCopyGamesFitDestination,
  buildCopySideActionRequest,
  bulkCopySideActionName,
  defaultCopySideActionName,
  enabledSquadIdsForSideAction,
} from './buildCopySideActionRequest';
import { formatSideActionType } from '../../utils/sideActionDisplay';

export type CopySideActionRequestState = {
  action: SideAction;
  defaultSquadId?: number | null;
};

type CopySideActionsModalProps =
  | {
      mode: 'single';
      isOpen: boolean;
      onClose: () => void;
      onSuccess: () => void;
      request: CopySideActionRequestState | null;
      rounds: DeskScopeRound[];
    }
  | {
      mode: 'all';
      isOpen: boolean;
      onClose: () => void;
      onSuccess: () => void;
      actions: SideAction[];
      rounds: DeskScopeRound[];
      defaultSquadId?: number | null;
    };

function initialRoundForSquad(
  rounds: DeskScopeRound[],
  squadId: number | null | undefined
): number | null {
  if (squadId == null) return null;
  return rounds.find((r) => r.squads.some((s) => s.id === squadId))?.id ?? null;
}

const CopySideActionsModal: React.FC<CopySideActionsModalProps> = (props) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [destination, setDestination] = useState<DestinationSquadSelection>({
    roundId: null,
    squadId: null,
  });
  const [localError, setLocalError] = useState<string | null>(null);

  const isSingle = props.mode === 'single';
  const action = isSingle ? props.request?.action ?? null : null;
  const actions = !isSingle ? props.actions : action ? [action] : [];
  const defaultSquadId = isSingle
    ? props.request?.defaultSquadId
    : props.defaultSquadId;

  const initialRound = useMemo(
    () => initialRoundForSquad(props.rounds, defaultSquadId),
    [props.rounds, defaultSquadId]
  );

  useEffect(() => {
    if (!props.isOpen) return;
    setLocalError(null);
    setDestination({
      roundId: initialRound,
      squadId: defaultSquadId ?? null,
    });
    if (isSingle && action) {
      setName(defaultCopySideActionName(action.name));
    } else {
      setName('');
    }
  }, [props.isOpen, isSingle, action, initialRound, defaultSquadId]);

  const squadId = destination.squadId;
  const destinationLabel =
    props.rounds
      .flatMap((r) => r.squads)
      .find((s) => s.id === squadId)?.name ?? (squadId != null ? `Squad ${squadId}` : null);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (squadId == null) throw new Error('Choose a destination squad');
      if (actions.length === 0) throw new Error('Nothing to copy');

      const dest = findDeskScopeSquad(props.rounds, squadId);
      const gameCount = destinationGameCount(props.rounds, squadId);
      if (gameCount != null) {
        if (isSingle && action) {
          assertCopyGamesFitDestination(action, {
            name: dest?.name || `Squad ${squadId}`,
            gameCount,
          });
        } else {
          assertAllCopyGamesFitDestination(actions, {
            name: dest?.name || `Squad ${squadId}`,
            gameCount,
          });
        }
      }

      if (isSingle && action) {
        const payload = buildCopySideActionRequest(action, { name, squadId });
        return SideActionsAPI.createSideAction(payload);
      }

      const items = actions.map((source) => ({
        source_side_action_id: source.id,
        name: bulkCopySideActionName(source.name, {
          destinationSquadId: squadId,
          sourceSquadIds: enabledSquadIdsForSideAction(source),
        }),
        destination_squad_id: squadId,
      }));
      return SideActionsAPI.bulkCopySideActions({ copies: items });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sideActionQueryKeys.all });
      props.onSuccess();
      props.onClose();
    },
    onError: (err) => {
      setLocalError(
        getErrorMessage(
          err,
          isSingle ? 'Failed to copy side action.' : 'Failed to copy side actions.'
        )
      );
    },
  });

  if (isSingle && !action) return null;

  const title = isSingle ? 'Copy side action' : 'Copy side actions';
  const count = actions.length;

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={title}
      size="medium"
      closeOnOutsideClick={false}
    >
      <div className="space-y-4">
        {isSingle && action ? (
          <p className="text-sm text-text-muted">
            Creates a new {formatSideActionType(action.side_action_type)} with the same
            shared settings, scoped to one squad.
          </p>
        ) : (
          <p className="text-sm text-text-muted">
            Creates {count} new side action{count === 1 ? '' : 's'} on one destination
            squad. Names stay the same when the destination squad differs; same-squad
            copies get a “(copy)” suffix.
          </p>
        )}

        {!isSingle && count === 0 ? (
          <Alert variant="warning" message="There are no side actions to copy." />
        ) : !isSingle ? (
          <ul className="max-h-40 list-disc overflow-y-auto rounded border border-border bg-surface-light px-5 py-2 text-sm text-text">
            {actions.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        ) : null}

        {(localError || createMutation.isError) && (
          <Alert
            variant="error"
            message={localError || (isSingle ? 'Failed to copy side action.' : 'Failed to copy.')}
            onDismiss={() => setLocalError(null)}
          />
        )}

        {isSingle && action ? (
          <div>
            <label
              htmlFor="copy-sa-name"
              className="mb-1 block text-sm font-medium text-text-muted"
            >
              Name
            </label>
            <input
              id="copy-sa-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-primary"
              autoComplete="off"
              required
            />
          </div>
        ) : null}

        <DestinationSquadPicker
          idPrefix={isSingle ? 'copy-sa' : 'copy-all-sa'}
          rounds={props.rounds}
          selection={destination}
          onChange={setDestination}
        />

        {isSingle ? (
          <p className="text-xs text-text-muted">
            Destination can be the same squad as the original — useful for a second pot
            with a different name.
          </p>
        ) : destinationLabel && count > 0 ? (
          <p className="text-xs text-text-muted">
            Will create {count} pot{count === 1 ? '' : 's'} on{' '}
            <strong>{destinationLabel}</strong>.
          </p>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="lightbackground"
            onClick={props.onClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="darkbackground"
            disabled={
              createMutation.isPending ||
              squadId == null ||
              count === 0 ||
              (isSingle && !name.trim())
            }
            onClick={() => {
              setLocalError(null);
              createMutation.mutate();
            }}
          >
            {createMutation.isPending
              ? 'Copying…'
              : isSingle
                ? 'Copy side action'
                : `Copy (${count})`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CopySideActionsModal;
