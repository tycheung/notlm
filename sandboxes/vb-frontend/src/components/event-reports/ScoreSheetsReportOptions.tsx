import React from 'react';
import Button from '../common/Button';
import Label from '../common/Label';
import type { ScoreSheetLayout } from '../../api/event-reports';
import type {
  EventReportRoundOption,
  EventReportSquadOption,
} from './EventStandingsReportOptions';

export interface ScoreSheetsReportOptionsProps {
  isTeamEvent: boolean;
  layout: ScoreSheetLayout;
  onLayoutChange: (layout: ScoreSheetLayout) => void;
  roundNumber: number;
  onRoundNumberChange: (roundNumber: number) => void;
  sortedRounds: EventReportRoundOption[];
  squadId: number | null;
  onSquadIdChange: (squadId: number | null) => void;
  squads: EventReportSquadOption[];
  includeIndividualHandicap: boolean;
  onIncludeIndividualHandicapChange: (value: boolean) => void;
  includeTeamHandicap: boolean;
  onIncludeTeamHandicapChange: (value: boolean) => void;
  busy: boolean;
  onBack: () => void;
  onPreview: () => void;
}

function isRoundRobinRound(round: EventReportRoundOption | undefined): boolean {
  if (!round) return false;
  const method = String(round.competition_method || '').toLowerCase();
  if (method === 'round_robin') return true;
  // Fallback when method string is missing but RR schedule config is present.
  const cfg = round.competition_method_config;
  if (!cfg || typeof cfg !== 'object') return false;
  const scheduleMode = String(cfg.schedule_mode || '').toLowerCase();
  return scheduleMode === 'league' || scheduleMode === 'pairwise';
}

const ScoreSheetsReportOptions: React.FC<ScoreSheetsReportOptionsProps> = ({
  isTeamEvent,
  layout,
  onLayoutChange,
  roundNumber,
  onRoundNumberChange,
  sortedRounds,
  squadId,
  onSquadIdChange,
  squads,
  includeIndividualHandicap,
  onIncludeIndividualHandicapChange,
  includeTeamHandicap,
  onIncludeTeamHandicapChange,
  busy,
  onBack,
  onPreview,
}) => {
  const selectedRound = sortedRounds.find((r) => r.round_number === roundNumber);
  const rrAvailable = isTeamEvent && isRoundRobinRound(selectedRound);
  const isRrLayout = layout === 'round_robin';

  // RR vertical is only valid for team + round-robin rounds.
  React.useEffect(() => {
    if (layout === 'round_robin' && !rrAvailable) {
      onLayoutChange(isTeamEvent ? 'team' : 'bowler');
    }
  }, [layout, rrAvailable, isTeamEvent, onLayoutChange]);

  const handleRoundChange = (next: number) => {
    onRoundNumberChange(next);
    const nextRound = sortedRounds.find((r) => r.round_number === next);
    const nextIsRr = isTeamEvent && isRoundRobinRound(nextRound);
    if (nextIsRr) {
      onLayoutChange('round_robin');
    } else if (layout === 'round_robin') {
      onLayoutChange(isTeamEvent ? 'team' : 'bowler');
    }
  };

  const handleLayoutChange = (next: ScoreSheetLayout) => {
    if (next === 'round_robin' && !rrAvailable) return;
    onLayoutChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="score-sheets-round">Round</Label>
          <select
            id="score-sheets-round"
            className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
            value={roundNumber}
            onChange={(e) => handleRoundChange(Number(e.target.value))}
          >
            {sortedRounds.map((round) => (
              <option key={round.id ?? round.round_number} value={round.round_number}>
                Round {round.round_number}
                {round.game_count != null ? ` (${round.game_count} games)` : ''}
                {isRoundRobinRound(round) ? ' · RR' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="score-sheets-squad">Squad</Label>
          <select
            id="score-sheets-squad"
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

      <div>
        <Label htmlFor="score-sheets-layout">Layout</Label>
        <select
          id="score-sheets-layout"
          className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          value={layout}
          onChange={(e) => handleLayoutChange(e.target.value as ScoreSheetLayout)}
        >
          {rrAvailable && (
            <option value="round_robin">Round robin (vertical match card)</option>
          )}
          {isTeamEvent ? (
            <option value="team">One team per sheet (grid)</option>
          ) : (
            <option value="bowler">One bowler per sheet</option>
          )}
          <option value="pair">One pair per sheet (side-by-side grid)</option>
        </select>
        <p className="mt-1 text-xs text-text-muted">
          {isRrLayout ? (
            <>
              Portrait vertical sheet: Game · Lane · Score · Opponent Score · Bonus Pins ·
              Total Score · +/- · Opponent Initials (blank for opponent to initial). Baker =
              one row per game; non-Baker doubles/triples use one blank row per bowler per
              game. Scores stay blank for desk entry.
            </>
          ) : (
            <>
              Landscape grid: names × games (up to 8 columns). Longer rounds continue on
              the next page. A red <strong>Lane</strong> row shows the assigned lane under
              each game (stamped, or projected from home + movement).
            </>
          )}
        </p>
      </div>

      {!isRrLayout && (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={includeIndividualHandicap}
              onChange={(e) => onIncludeIndividualHandicapChange(e.target.checked)}
            />
            Individual handicap column
          </label>
          {isTeamEvent && (
            <label className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={includeTeamHandicap}
                onChange={(e) => onIncludeTeamHandicapChange(e.target.checked)}
              />
              Team handicap footer row
            </label>
          )}
        </div>
      )}

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
          Preview score sheets
        </Button>
      </div>
    </div>
  );
};

export default ScoreSheetsReportOptions;
