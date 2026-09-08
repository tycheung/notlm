import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Alert from '../common/Alert';
import ConfirmDialog from '../common/ConfirmDialog';
import { DirectorsAPI } from '../../api/directors';
import { TournamentsAPI } from '../../api/tournaments';
import { getErrorMessage } from '../../api/apiErrors';
import { formatDirectorIdentity } from '../../utils/directorIdentity';
import { effectiveMaxAssistants } from '../../api/tdAccess';
import type { TDSearchUser } from '../../types/director_delegation';

export type DirectorPermissionsScope = 'tournament' | 'event';

export interface DirectorPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  scope: DirectorPermissionsScope;
  tournamentId: number;
  eventId?: number;
}

const introTournament =
  'Tournament-level permissions apply to all current and future events in this tournament. ' +
  'Where you also set event-only permissions, effective access is the union (OR) of both permission sets.';

const introEvent =
  'These permissions apply only to this event. ' +
  'If the assistant also has tournament-wide grants, effective access on this event is the union of both.';

const TabPermRow: React.FC<{
  label: string;
  tooltip: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}> = ({ label, tooltip, checked, onChange, disabled }) => (
  <label className="flex items-start gap-3 py-2 cursor-pointer">
    <input
      type="checkbox"
      className="mt-1"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span>
      <span className="font-medium">{label}</span>
      <span className="block text-sm text-text-muted" title={tooltip}>
        {tooltip}
      </span>
    </span>
  </label>
);

const DirectorPermissionsModal: React.FC<DirectorPermissionsModalProps> = ({
  isOpen,
  onClose,
  scope,
  tournamentId,
  eventId,
}) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<TDSearchUser | null>(null);
  const [coOwner, setCoOwner] = useState(false);
  const [createEvents, setCreateEvents] = useState(false);
  const [info, setInfo] = useState(false);
  const [format, setFormat] = useState(false);
  const [participants, setParticipants] = useState(false);
  const [squads, setSquads] = useState(false);
  const [lanes, setLanes] = useState(false);
  const [gameScoring, setGameScoring] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [removeTargetId, setRemoveTargetId] = useState<number | null>(null);

  const searchQ = useMemo(() => search.trim(), [search]);

  const { data: tournament } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: () => TournamentsAPI.getTournament(tournamentId),
    enabled: isOpen && tournamentId > 0,
  });

  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ['tdSearch', searchQ],
    queryFn: () => DirectorsAPI.searchTDs(searchQ),
    enabled: isOpen && searchQ.length >= 2,
    staleTime: 30_000,
  });

  const { data: eventDelegations = [] } = useQuery({
    queryKey: ['eventDelegations', eventId],
    queryFn: () => DirectorsAPI.listEventDelegations(eventId!),
    enabled: isOpen && scope === 'event' && !!eventId,
  });

  const { data: tournamentPerms = [] } = useQuery({
    queryKey: ['tournamentDirectorPerms', tournamentId],
    queryFn: () => DirectorsAPI.listTournamentPermissions(tournamentId),
    enabled: isOpen && !!tournamentId,
  });

  const maxSeats = effectiveMaxAssistants({
    unique_participant_cap: tournament?.unique_participant_cap,
    max_assistants: tournament?.max_assistants,
  });
  const activeSeats = tournamentPerms.length;
  const atSeatCap = activeSeats >= maxSeats;
  const roster =
    scope === 'tournament'
      ? tournamentPerms
      : eventDelegations;

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedUser(null);
      setFormError(null);
      setCoOwner(false);
      setCreateEvents(false);
      setInfo(false);
      setFormat(false);
      setParticipants(false);
      setSquads(false);
      setLanes(false);
      setGameScoring(false);
      setRemoveTargetId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!selectedUser) return;
    if (scope === 'event' && eventId) {
      const row = eventDelegations.find((d) => d.delegate_user_id === selectedUser.id);
      if (row) {
        setInfo(row.can_manage_event_info);
        setFormat(row.can_manage_event_format);
        setParticipants(row.can_manage_participants);
        setSquads(row.can_manage_squads);
        setLanes(row.can_manage_lanes);
        setGameScoring(row.can_manage_game_scoring);
      } else {
        setInfo(false);
        setFormat(false);
        setParticipants(false);
        setSquads(false);
        setLanes(false);
        setGameScoring(false);
      }
    }
    if (scope === 'tournament') {
      const row = tournamentPerms.find((p) => p.delegate_user_id === selectedUser.id);
      if (row) {
        setCoOwner(row.is_tournament_co_owner);
        setCreateEvents(row.can_create_events);
        setInfo(row.can_manage_event_info);
        setFormat(row.can_manage_event_format);
        setParticipants(row.can_manage_participants);
        setSquads(row.can_manage_squads);
        setLanes(row.can_manage_lanes);
        setGameScoring(row.can_manage_game_scoring);
      } else {
        setCoOwner(false);
        setCreateEvents(false);
        setInfo(false);
        setFormat(false);
        setParticipants(false);
        setSquads(false);
        setLanes(false);
        setGameScoring(false);
      }
    }
  }, [selectedUser, scope, eventId, eventDelegations, tournamentPerms]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) {
        throw new Error('Select a user to grant permissions.');
      }
      const isExisting =
        scope === 'tournament'
          ? tournamentPerms.some((p) => p.delegate_user_id === selectedUser.id)
          : eventDelegations.some((d) => d.delegate_user_id === selectedUser.id);
      if (!isExisting && atSeatCap) {
        throw new Error(
          `Assistant seat limit reached (${maxSeats}). Remove an assistant before adding another.`
        );
      }
      if (scope === 'event' && eventId) {
        return DirectorsAPI.upsertEventDelegation(eventId, {
          delegate_user_id: selectedUser.id,
          can_manage_event_info: info,
          can_manage_event_format: format,
          can_manage_participants: participants,
          can_manage_squads: squads,
          can_manage_lanes: lanes,
          can_manage_game_scoring: gameScoring,
        });
      }
      return DirectorsAPI.upsertTournamentPermission(tournamentId, {
        delegate_user_id: selectedUser.id,
        is_tournament_co_owner: coOwner,
        can_create_events: createEvents,
        can_manage_event_info: info,
        can_manage_event_format: format,
        can_manage_participants: participants,
        can_manage_squads: squads,
        can_manage_lanes: lanes,
        can_manage_game_scoring: gameScoring,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['directorAccess'] });
      await queryClient.invalidateQueries({
        queryKey: ['myTournamentDirectorAccess', tournamentId],
      });
      await queryClient.invalidateQueries({ queryKey: ['eventDelegations'] });
      await queryClient.invalidateQueries({ queryKey: ['tournamentDirectorPerms'] });
      setSelectedUser(null);
      setFormError(null);
    },
    onError: (e: unknown) => {
      setFormError(getErrorMessage(e, 'Could not save permissions.'));
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (delegateUserId: number) => {
      if (scope === 'event' && eventId) {
        return DirectorsAPI.deleteEventDelegation(eventId, delegateUserId);
      }
      return DirectorsAPI.deleteTournamentPermission(tournamentId, delegateUserId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['eventDelegations'] });
      await queryClient.invalidateQueries({ queryKey: ['tournamentDirectorPerms'] });
      await queryClient.invalidateQueries({ queryKey: ['directorAccess'] });
      setRemoveTargetId(null);
    },
    onError: (e: unknown) => {
      setFormError(getErrorMessage(e, 'Could not remove assistant.'));
      setRemoveTargetId(null);
    },
  });

  const title =
    scope === 'tournament' ? 'Tournament assistant permissions' : 'Event assistant permissions';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        size="large"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setFormError(null);
                saveMutation.mutate();
              }}
              disabled={saveMutation.isPending || !selectedUser}
              title={
                atSeatCap && selectedUser
                  ? `Seat limit ${activeSeats} of ${maxSeats}`
                  : undefined
              }
            >
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-text-muted mb-2">
          {scope === 'tournament' ? introTournament : introEvent}
        </p>
        <p className="text-sm font-medium mb-4">
          Assistant seats: {activeSeats} of {maxSeats}
          {atSeatCap ? ' (full)' : ''}
        </p>

        {formError && (
          <Alert
            variant="error"
            message={formError}
            className="mb-4"
            onDismiss={() => setFormError(null)}
          />
        )}

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Active assistants</h3>
            {roster.length === 0 ? (
              <p className="text-sm text-text-muted">No assistants granted yet.</p>
            ) : (
              <ul className="border border-border rounded-md divide-y divide-border mb-4">
                {roster.map((row) => (
                  <li
                    key={row.delegate_user_id}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <span>User #{row.delegate_user_id}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="small"
                      onClick={() => setRemoveTargetId(row.delegate_user_id)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Find user by name, email, USBC ID, or phone
            </label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Start typing…"
              disabled={atSeatCap && !selectedUser}
            />
            {atSeatCap && !selectedUser && (
              <p className="mt-1 text-xs text-text-muted">
                Seat limit reached. Remove an assistant to add another.
              </p>
            )}
            {searchQ.length >= 2 && (
              <ul className="mt-2 max-h-40 overflow-y-auto border border-border rounded-md divide-y divide-border">
                {searching && (
                  <li className="px-3 py-2 text-sm text-text-muted">Searching…</li>
                )}
                {!searching &&
                  searchResults.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-muted ${
                          selectedUser?.id === u.id ? 'bg-surface-muted' : ''
                        }`}
                        onClick={() => setSelectedUser(u)}
                      >
                        <span className="font-medium">{formatDirectorIdentity(u)}</span>
                        {u.email && (
                          <span className="text-text-muted"> · {u.email}</span>
                        )}
                        {u.usbc_id && (
                          <span className="text-text-muted"> · USBC {u.usbc_id}</span>
                        )}
                        {u.state && (
                          <span className="text-text-muted"> · {u.state}</span>
                        )}
                      </button>
                    </li>
                  ))}
                {!searching && searchResults.length === 0 && (
                  <li className="px-3 py-2 text-sm text-text-muted">No users found.</li>
                )}
              </ul>
            )}
          </div>

          {selectedUser && (
            <div className="border border-border rounded-md p-4 space-y-2">
              <p className="text-sm font-medium">
                Selected: {formatDirectorIdentity(selectedUser)}
              </p>

              {scope === 'tournament' && (
                <>
                  <TabPermRow
                    label="Tournament co-owner (full TD parity)"
                    tooltip="Same powers as the primary tournament director for this tournament, including managing other assistants."
                    checked={coOwner}
                    onChange={setCoOwner}
                  />
                  <TabPermRow
                    label="Create events under this tournament"
                    tooltip="Allows creating new events; the creator is recorded as owner of those events."
                    checked={createEvents}
                    onChange={setCreateEvents}
                  />
                </>
              )}

              <TabPermRow
                label="Event Info tab"
                tooltip={
                  scope === 'tournament'
                    ? 'Applies to the Event Info tab on every event in this tournament.'
                    : 'Applies to the Event Info tab on this event only.'
                }
                checked={info}
                onChange={setInfo}
                disabled={scope === 'tournament' && coOwner}
              />
              <TabPermRow
                label="Format controls (Event Info)"
                tooltip={
                  scope === 'tournament'
                    ? 'Applies to format selection/save/manage controls shown on Event Info for every event.'
                    : "Applies to format selection/save/manage controls shown on this event's Event Info."
                }
                checked={format}
                onChange={setFormat}
                disabled={scope === 'tournament' && coOwner}
              />
              <TabPermRow
                label="Participant Management tab"
                tooltip={
                  scope === 'tournament'
                    ? 'Applies to participant management on every event.'
                    : 'Applies to participant management on this event only.'
                }
                checked={participants}
                onChange={setParticipants}
                disabled={scope === 'tournament' && coOwner}
              />
              <TabPermRow
                label="Squads tab"
                tooltip={
                  scope === 'tournament'
                    ? 'Applies to squad assignments and lock/unlock controls on every event.'
                    : 'Applies to squad assignments and lock/unlock controls on this event only.'
                }
                checked={squads}
                onChange={setSquads}
                disabled={scope === 'tournament' && coOwner}
              />
              <TabPermRow
                label="Lane Assignments tab"
                tooltip={
                  scope === 'tournament'
                    ? 'Applies to lane assignments and lane settings on every event.'
                    : 'Applies to lane assignments and lane settings on this event only.'
                }
                checked={lanes}
                onChange={setLanes}
                disabled={scope === 'tournament' && coOwner}
              />
              <TabPermRow
                label="Game Scoring tab"
                tooltip={
                  scope === 'tournament'
                    ? 'Applies to score entry and game editing on every event.'
                    : 'Applies to score entry and game editing on this event only.'
                }
                checked={gameScoring}
                onChange={setGameScoring}
                disabled={scope === 'tournament' && coOwner}
              />
            </div>
          )}
        </div>
      </Modal>
      <ConfirmDialog
        isOpen={removeTargetId != null}
        title="Remove assistant"
        message="Remove this assistant's permissions?"
        confirmText="Remove"
        confirmVariant="danger"
        onClose={() => setRemoveTargetId(null)}
        onConfirm={() => {
          if (removeTargetId != null) {
            removeMutation.mutate(removeTargetId);
          }
        }}
      />
    </>
  );
};

export default DirectorPermissionsModal;
