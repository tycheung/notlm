import React from 'react';
import Button from '../common/Button';
import Label from '../common/Label';
import type { EventStandingsBasis, EventStandingsScope } from '../../api/event-reports';

export interface EventReportRoundOption {
  id: number;
  round_number: number;
  friendly_name?: string | null;
  /** Used for single-game report game picker. */
  game_count?: number | null;
  /** Used to gate “individual scores on team standings” for Baker-only events. */
  competition_method_config?: Record<string, unknown> | null;
  competition_method?: string | null;
  game_style?: string | null;
  eventId?: number | null;
  eventName?: string | null;
  eventFormat?: string | null;
}

export interface EventReportSquadOption {
  id: number;
  name: string;
  round_id?: number | null;
}

export interface EventStandingsReportOptionsProps {
  tournamentOnly: boolean;
  scope: EventStandingsScope;
  onScopeChange: (scope: EventStandingsScope) => void;
  basis: EventStandingsBasis;
  onBasisChange: (basis: EventStandingsBasis) => void;
  roundNumber: number;
  onRoundNumberChange: (roundNumber: number) => void;
  sortedRounds: EventReportRoundOption[];
  squadId: number | null;
  onSquadIdChange: (squadId: number) => void;
  squads: EventReportSquadOption[];
  includePrizes: boolean;
  onIncludePrizesChange: (value: boolean) => void;
  includeHandicap: boolean;
  onIncludeHandicapChange: (value: boolean) => void;
  includeGameScores: boolean;
  onIncludeGameScoresChange: (value: boolean) => void;
  showCutLine: boolean;
  onShowCutLineChange: (value: boolean) => void;
  showTeamNameOptions: boolean;
  /** False for Baker-only event/tournament (team scores only; no per-bowler Results). */
  allowIndividualTeamScores?: boolean;
  showIndividualTeamScores: boolean;
  onShowIndividualTeamScoresChange: (value: boolean) => void;
  showTeamNames: boolean;
  onShowTeamNamesChange: (value: boolean) => void;
  showBowlerNames: boolean;
  onShowBowlerNamesChange: (value: boolean) => void;
  busy: boolean;
  previewDisabled?: boolean;
  /** When false, omit Back / Preview (e.g. Event Details Standings tab). Default true. */
  showFooter?: boolean;
  /** When true, omit Entire tournament from the scope select (event-tab board). */
  hideTournamentScope?: boolean;
  onBack?: () => void;
  onPreview?: () => void;
  onExportExcel?: () => void;
}

const EventStandingsReportOptions: React.FC<EventStandingsReportOptionsProps> = ({
  tournamentOnly,
  scope,
  onScopeChange,
  basis,
  onBasisChange,
  roundNumber,
  onRoundNumberChange,
  sortedRounds,
  squadId,
  onSquadIdChange,
  squads,
  includePrizes,
  onIncludePrizesChange,
  includeHandicap,
  onIncludeHandicapChange,
  includeGameScores,
  onIncludeGameScoresChange,
  showCutLine,
  onShowCutLineChange,
  showTeamNameOptions,
  allowIndividualTeamScores = true,
  showIndividualTeamScores,
  onShowIndividualTeamScoresChange,
  showTeamNames,
  onShowTeamNamesChange,
  showBowlerNames,
  onShowBowlerNamesChange,
  busy,
  previewDisabled = false,
  showFooter = true,
  hideTournamentScope = false,
  onBack,
  onPreview,
  onExportExcel,
}) => (
  <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2">
      {!tournamentOnly && (
        <div>
          <Label htmlFor="standings-scope">Scope</Label>
          <select
            id="standings-scope"
            className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
            value={scope}
            onChange={(e) => onScopeChange(e.target.value as EventStandingsScope)}
          >
            <option value="event">This event</option>
            {!hideTournamentScope && (
              <option value="tournament">Entire tournament</option>
            )}
            <option value="squad">One squad</option>
          </select>
        </div>
      )}

      <div>
        <Label htmlFor="standings-basis">Basis</Label>
        <select
          id="standings-basis"
          className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          value={basis}
          onChange={(e) => onBasisChange(e.target.value as EventStandingsBasis)}
        >
          <option value="final">Final (as far as progressed)</option>
          <option value="round">Specific round</option>
        </select>
      </div>

      {basis === 'round' && (
        <div>
          <Label htmlFor="standings-round">Round number</Label>
          <select
            id="standings-round"
            className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
            value={roundNumber}
            onChange={(e) => onRoundNumberChange(Number(e.target.value))}
          >
            {sortedRounds.length === 0 ? (
              <option value={1}>Round 1</option>
            ) : (
              sortedRounds.map((round) => (
                <option key={round.id} value={round.round_number}>
                  Round {round.round_number}
                  {round.friendly_name ? ` — ${round.friendly_name}` : ''}
                </option>
              ))
            )}
          </select>
          {tournamentOnly && (
            <p className="mt-1 text-xs text-text-muted">
              Events without this round are omitted from the report.
            </p>
          )}
        </div>
      )}

      {!tournamentOnly && scope === 'squad' && (
        <div>
          <Label htmlFor="standings-squad">Squad</Label>
          <select
            id="standings-squad"
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
          checked={includePrizes}
          onChange={(e) => onIncludePrizesChange(e.target.checked)}
        />
        Include prizes (place + amount)
      </label>
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={includeHandicap}
          onChange={(e) => onIncludeHandicapChange(e.target.checked)}
        />
        Include handicap (adds column; sorts by handicap)
      </label>
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={includeGameScores}
          onChange={(e) => onIncludeGameScoresChange(e.target.checked)}
        />
        Include game scores (Results column)
      </label>
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={showCutLine}
          onChange={(e) => onShowCutLineChange(e.target.checked)}
        />
        Show cut / cash line
      </label>
      <p className="text-xs text-text-muted sm:col-span-2 -mt-1">
        Line after the last Advance place (format top-N) or cashing prize place.
      </p>
      {showTeamNameOptions && (
        <label
          className={`flex items-center gap-2 text-sm ${
            allowIndividualTeamScores ? 'text-text' : 'text-text-muted'
          }`}
        >
          <input
            type="checkbox"
            checked={allowIndividualTeamScores && showIndividualTeamScores}
            disabled={!allowIndividualTeamScores}
            onChange={(e) => onShowIndividualTeamScoresChange(e.target.checked)}
          />
          Show individual scores on team standings
        </label>
      )}
      {showTeamNameOptions && !allowIndividualTeamScores && (
        <p className="text-xs text-text-muted sm:col-span-2">
          Not available when every round is Baker (team scores only).
        </p>
      )}
      {showTeamNameOptions && (
        <>
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={showTeamNames}
              onChange={(e) => onShowTeamNamesChange(e.target.checked)}
            />
            Show team names
          </label>
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={showBowlerNames}
              onChange={(e) => onShowBowlerNamesChange(e.target.checked)}
            />
            Show bowler names
          </label>
        </>
      )}
    </div>

    {showTeamNameOptions && !showTeamNames && !showBowlerNames && (
      <p className="text-xs text-text-muted">
        With both team and bowler names off, team rows display as Team #.
      </p>
    )}

    {showFooter && (
      <div className="flex flex-wrap justify-between gap-2 pt-2 border-t border-border">
        <Button
          variant="lightbackground"
          size="small"
          disabled={busy}
          onClick={onBack}
        >
          Back
        </Button>
        <div className="flex flex-wrap gap-2">
          {onExportExcel && (
            <Button
              variant="lightbackground"
              size="small"
              disabled={busy || previewDisabled}
              onClick={onExportExcel}
            >
              {busy ? 'Building…' : 'Export Excel'}
            </Button>
          )}
          <Button
            variant="primary"
            size="small"
            disabled={busy || previewDisabled}
            onClick={onPreview}
          >
            {busy ? 'Building…' : 'Preview standings'}
          </Button>
        </div>
      </div>
    )}
  </div>
);

export default EventStandingsReportOptions;
