import React from 'react';
import Button from '../common/Button';
import Label from '../common/Label';
import type {
  EventReportRoundOption,
  EventReportSquadOption,
} from './EventStandingsReportOptions';

export interface LaneAssignmentSheetsReportOptionsProps {
  isTeamEvent: boolean;
  roundNumber: number;
  onRoundNumberChange: (roundNumber: number) => void;
  sortedRounds: EventReportRoundOption[];
  squadId: number | null;
  onSquadIdChange: (squadId: number | null) => void;
  squads: EventReportSquadOption[];
  busy: boolean;
  onBack: () => void;
  onPreview: () => void;
}

const LaneAssignmentSheetsReportOptions: React.FC<
  LaneAssignmentSheetsReportOptionsProps
> = ({
  isTeamEvent,
  roundNumber,
  onRoundNumberChange,
  sortedRounds,
  squadId,
  onSquadIdChange,
  squads,
  busy,
  onBack,
  onPreview,
}) => (
  <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label htmlFor="lane-assign-sheets-round">Round</Label>
        <select
          id="lane-assign-sheets-round"
          className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          value={roundNumber}
          onChange={(e) => onRoundNumberChange(Number(e.target.value))}
        >
          {sortedRounds.map((round) => (
            <option key={round.id ?? round.round_number} value={round.round_number}>
              Round {round.round_number}
              {round.game_count != null ? ` (${round.game_count} games)` : ''}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="lane-assign-sheets-squad">Squad</Label>
        <select
          id="lane-assign-sheets-squad"
          className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          value={squadId ?? ''}
          onChange={(e) =>
            onSquadIdChange(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">All squads</option>
          {squads.map((squad) => (
            <option key={squad.id} value={squad.id}>
              {squad.name}
            </option>
          ))}
        </select>
      </div>
    </div>

    <p className="text-xs text-text-muted">
      Landscape sheet: one row per {isTeamEvent ? 'team' : 'bowler'}, columns for each
      game with the assigned lane label (stamped when available, otherwise projected from
      home + movement). Games beyond 12 continue on the next page.
    </p>

    <div className="flex flex-wrap gap-2 justify-end">
      <Button variant="secondary" size="small" disabled={busy} onClick={onBack}>
        Back
      </Button>
      <Button
        variant="primary"
        size="small"
        disabled={busy || sortedRounds.length === 0}
        onClick={onPreview}
      >
        Preview lane assignments
      </Button>
    </div>
  </div>
);

export default LaneAssignmentSheetsReportOptions;
