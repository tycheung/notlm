import React from 'react';
import Button from '../common/Button';
import Label from '../common/Label';
import type { EventRosterScope } from '../../api/event-reports';
import type { EventReportSquadOption } from './EventStandingsReportOptions';

export interface EventRosterReportOptionsProps {
  scope: EventRosterScope;
  onScopeChange: (scope: EventRosterScope) => void;
  squadId: number | null;
  onSquadIdChange: (squadId: number) => void;
  squads: EventReportSquadOption[];
  includeCheckin: boolean;
  onIncludeCheckinChange: (value: boolean) => void;
  includeUsbc: boolean;
  onIncludeUsbcChange: (value: boolean) => void;
  includeAverage: boolean;
  onIncludeAverageChange: (value: boolean) => void;
  includeHandicap: boolean;
  onIncludeHandicapChange: (value: boolean) => void;
  includeLane: boolean;
  onIncludeLaneChange: (value: boolean) => void;
  includePaid: boolean;
  onIncludePaidChange: (value: boolean) => void;
  busy: boolean;
  onBack: () => void;
  onPreview: () => void;
}

const EventRosterReportOptions: React.FC<EventRosterReportOptionsProps> = ({
  scope,
  onScopeChange,
  squadId,
  onSquadIdChange,
  squads,
  includeCheckin,
  onIncludeCheckinChange,
  includeUsbc,
  onIncludeUsbcChange,
  includeAverage,
  onIncludeAverageChange,
  includeHandicap,
  onIncludeHandicapChange,
  includeLane,
  onIncludeLaneChange,
  includePaid,
  onIncludePaidChange,
  busy,
  onBack,
  onPreview,
}) => (
  <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label htmlFor="roster-scope">Scope</Label>
        <select
          id="roster-scope"
          className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          value={scope}
          onChange={(e) => onScopeChange(e.target.value as EventRosterScope)}
        >
          <option value="event">This event</option>
          <option value="squad">One squad</option>
        </select>
      </div>
      {scope === 'squad' && (
        <div>
          <Label htmlFor="roster-squad">Squad</Label>
          <select
            id="roster-squad"
            className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
            value={squadId ?? ''}
            onChange={(e) => onSquadIdChange(Number(e.target.value))}
          >
            {squads.map((squad) => (
              <option key={squad.id} value={squad.id}>
                {squad.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>

    <div className="grid gap-2 sm:grid-cols-2">
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={includeCheckin}
          onChange={(e) => onIncludeCheckinChange(e.target.checked)}
        />
        Check-in column (desk sheet)
      </label>
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={includeUsbc}
          onChange={(e) => onIncludeUsbcChange(e.target.checked)}
        />
        USBC ID
      </label>
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={includeAverage}
          onChange={(e) => onIncludeAverageChange(e.target.checked)}
        />
        Qualifying average
      </label>
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={includeHandicap}
          onChange={(e) => onIncludeHandicapChange(e.target.checked)}
        />
        Handicap
      </label>
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={includeLane}
          onChange={(e) => onIncludeLaneChange(e.target.checked)}
        />
        Assigned lane
      </label>
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={includePaid}
          onChange={(e) => onIncludePaidChange(e.target.checked)}
        />
        Paid / balance due
      </label>
    </div>

    <p className="text-xs text-text-muted">
      Check-in boxes are for paper marking. A check already appears when the bowler is
      checked in digitally.
    </p>

    <div className="flex flex-wrap justify-between gap-2 pt-2 border-t border-border">
      <Button variant="lightbackground" size="small" disabled={busy} onClick={onBack}>
        Back
      </Button>
      <Button variant="primary" size="small" disabled={busy} onClick={onPreview}>
        {busy ? 'Building…' : 'Preview roster'}
      </Button>
    </div>
  </div>
);

export default EventRosterReportOptions;
