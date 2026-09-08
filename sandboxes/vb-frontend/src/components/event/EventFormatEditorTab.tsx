import React, { useEffect, useMemo, useState } from 'react';
import type { EventComplete } from '../../types/event';
import type { RoundRead } from '../../types/round';
import { getCompetitionMethodDisplayLabel } from '../../utils/competitionMethodDisplay';
import {
  eventHasHeadToHeadFormatRounds,
  isHeadToHeadCompetitionMethod,
} from '../../utils/headToHeadFormatRounds';
import { gameStyleDisplayLabel } from '../../utils/roundGameScoring';
import { formatRoundDisplayLabel } from '../../utils/roundDisplayLabel';
import EventRoundFormatEditor from './EventRoundFormatEditor';
import FormatMatchupsPanel from './formatEditor/FormatMatchupsPanel';
import Alert from '../common/Alert';
import Button from '../common/Button';
import PageSectionHeading from '../common/PageSectionHeading';

interface EventFormatEditorTabProps {
  eventId: number;
  eventComplete: EventComplete;
  relationships?: Record<string, unknown>[];
}

/**
 * Event tab: H2H matchups + format settings modal (Baker, RR, bracket/pods options).
 */
const EventFormatEditorTab: React.FC<EventFormatEditorTabProps> = ({
  eventId,
  eventComplete,
  relationships = [],
}) => {
  const isTeamEvent = eventComplete.event_format === 'teams';
  const h2hRounds = useMemo(() => {
    const rounds = (eventComplete.rounds || []) as RoundRead[];
    return [...rounds]
      .filter((r) => isHeadToHeadCompetitionMethod(r.competition_method))
      .sort((a, b) => a.round_number - b.round_number);
  }, [eventComplete.rounds]);

  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!h2hRounds.length) {
      setSelectedRoundId(null);
      return;
    }
    if (
      selectedRoundId != null &&
      h2hRounds.some((r) => Number(r.id) === Number(selectedRoundId))
    ) {
      return;
    }
    setSelectedRoundId(h2hRounds[0].id);
  }, [h2hRounds, selectedRoundId]);

  const selectedRound = useMemo(
    () => h2hRounds.find((r) => Number(r.id) === Number(selectedRoundId)) ?? null,
    [h2hRounds, selectedRoundId]
  );

  if (!eventHasHeadToHeadFormatRounds(eventComplete)) {
    return (
      <Alert
        variant="info"
        message="Format Editor is available when this event includes round robin, bracket, stepladder, or pods (Beat the pair) rounds."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <PageSectionHeading>Format Editor</PageSectionHeading>
        <p className="mt-1 text-sm text-text-muted max-w-3xl">
          Event-specific tweaks for head-to-head rounds (pods, bracket, round robin, stepladder).
          Qualifying and eliminator rounds are not listed here — configure those on Squads and Game
          Scoring. Matchups builds the schedule grid; Edit settings covers Baker style, match
          decision, and bonus pins. Pods size and advance cuts live on Matchups.
          Library templates stay unchanged until you save back to the library.
        </p>
      </div>

      {successMessage && (
        <Alert
          variant="success"
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-light text-text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Round</th>
              <th className="px-4 py-2.5 font-medium">Format</th>
              <th className="px-4 py-2.5 font-medium">Game style</th>
              <th className="px-4 py-2.5 font-medium text-right"> </th>
            </tr>
          </thead>
          <tbody>
            {h2hRounds.map((round) => {
              const methodLabel = getCompetitionMethodDisplayLabel(
                String(round.competition_method || 'eliminator'),
                {
                  roundId: round.id,
                  relationships: relationships as any,
                }
              );
              const styleLabel = gameStyleDisplayLabel(
                (round.competition_method_config || {}) as Record<string, unknown>
              );
              const selected = Number(round.id) === Number(selectedRoundId);
              return (
                <tr
                  key={round.id}
                  className={`border-t border-border/60 cursor-pointer ${
                    selected ? 'bg-primary/5' : 'hover:bg-surface-light/40'
                  }`}
                  onClick={() => setSelectedRoundId(round.id)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-text">
                      {formatRoundDisplayLabel(round)}
                    </div>
                    {round.friendly_name?.trim() &&
                    formatRoundDisplayLabel(round) !== round.friendly_name.trim() ? (
                      <div className="text-xs text-text-muted">{round.friendly_name.trim()}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-text">{methodLabel}</td>
                  <td className="px-4 py-3 text-text-muted">{styleLabel}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs text-text-muted">
                      {selected ? 'Selected' : 'Select'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedRound && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 border-b border-border pb-2">
            <label className="text-sm text-text-muted" htmlFor="format-editor-round-select">
              Editing
            </label>
            <select
              id="format-editor-round-select"
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text"
              value={selectedRoundId ?? ''}
              onChange={(e) => setSelectedRoundId(Number(e.target.value) || null)}
            >
              {h2hRounds.map((round) => (
                <option key={round.id} value={round.id}>
                  {formatRoundDisplayLabel(round)} ·{' '}
                  {getCompetitionMethodDisplayLabel(String(round.competition_method || ''), {
                    roundId: round.id,
                    relationships: relationships as any,
                  })}
                </option>
              ))}
            </select>
            <span className="text-sm font-medium text-text">Matchups</span>
            <div className="ml-auto">
              <Button
                type="button"
                size="small"
                variant="lightbackground"
                onClick={() => setSettingsOpen(true)}
              >
                Edit settings…
              </Button>
            </div>
          </div>
          <FormatMatchupsPanel
            eventId={eventId}
            round={selectedRound}
            isTeamEvent={isTeamEvent}
            tournamentName={eventComplete.tournament?.name}
            eventName={eventComplete.name}
            onConfigSaved={() => {
              setSuccessMessage('Matchup schedule updated.');
              window.setTimeout(() => setSuccessMessage(null), 4000);
            }}
          />
        </div>
      )}

      <EventRoundFormatEditor
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        eventId={eventId}
        round={selectedRound}
        relationships={relationships}
        isTeamEvent={isTeamEvent}
        onSaved={() => {
          setSuccessMessage('Round format settings saved.');
          window.setTimeout(() => setSuccessMessage(null), 4000);
        }}
      />
    </div>
  );
};

export default EventFormatEditorTab;
