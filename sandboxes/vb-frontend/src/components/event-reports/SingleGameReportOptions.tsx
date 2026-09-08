import React from 'react';
import Button from '../common/Button';
import Label from '../common/Label';
import type { EventStandingsScope } from '../../api/event-reports';
import type {
  EventReportRoundOption,
  EventReportSquadOption,
} from './EventStandingsReportOptions';

export interface SingleGameReportOptionsProps {
  tournamentOnly: boolean;
  scope: EventStandingsScope;
  onScopeChange: (scope: EventStandingsScope) => void;
  roundNumber: number;
  onRoundNumberChange: (roundNumber: number) => void;
  sortedRounds: EventReportRoundOption[];
  gameNumber: number;
  onGameNumberChange: (gameNumber: number) => void;
  maxGames: number;
  squadId: number | null;
  onSquadIdChange: (squadId: number) => void;
  squads: EventReportSquadOption[];
  includeHandicap: boolean;
  onIncludeHandicapChange: (value: boolean) => void;
  showTeamNameOptions: boolean;
  allowIndividualTeamScores?: boolean;
  showIndividualTeamScores: boolean;
  onShowIndividualTeamScoresChange: (value: boolean) => void;
  showTeamNames: boolean;
  onShowTeamNamesChange: (value: boolean) => void;
  showBowlerNames: boolean;
  onShowBowlerNamesChange: (value: boolean) => void;
  busy: boolean;
  previewDisabled?: boolean;
  onBack: () => void;
  onPreview: () => void;
}

const SingleGameReportOptions: React.FC<SingleGameReportOptionsProps> = ({
  tournamentOnly,
  scope,
  onScopeChange,
  roundNumber,
  onRoundNumberChange,
  sortedRounds,
  gameNumber,
  onGameNumberChange,
  maxGames,
  squadId,
  onSquadIdChange,
  squads,
  includeHandicap,
  onIncludeHandicapChange,
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
  onBack,
  onPreview,
}) => {
  const gameOptions = Array.from(
    { length: Math.max(1, maxGames) },
    (_, i) => i + 1
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {!tournamentOnly && (
          <div>
            <Label htmlFor="single-game-scope">Scope</Label>
            <select
              id="single-game-scope"
              className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
              value={scope}
              onChange={(e) => onScopeChange(e.target.value as EventStandingsScope)}
            >
              <option value="event">This event</option>
              <option value="tournament">Entire tournament</option>
              <option value="squad">One squad</option>
            </select>
          </div>
        )}

        <div>
          <Label htmlFor="single-game-round">Round</Label>
          <select
            id="single-game-round"
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
        </div>

        <div>
          <Label htmlFor="single-game-number">Game</Label>
          <select
            id="single-game-number"
            className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
            value={gameNumber}
            onChange={(e) => onGameNumberChange(Number(e.target.value))}
          >
            {gameOptions.map((n) => (
              <option key={n} value={n}>
                Game {n}
              </option>
            ))}
          </select>
        </div>

        {!tournamentOnly && scope === 'squad' && (
          <div>
            <Label htmlFor="single-game-squad">Squad</Label>
            <select
              id="single-game-squad"
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
            checked={includeHandicap}
            onChange={(e) => onIncludeHandicapChange(e.target.checked)}
          />
          Include handicap (adds column; sorts by handicap)
        </label>
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

      <div className="flex flex-wrap justify-between gap-2 pt-2 border-t border-border">
        <Button variant="lightbackground" size="small" disabled={busy} onClick={onBack}>
          Back
        </Button>
        <Button
          variant="primary"
          size="small"
          disabled={busy || previewDisabled}
          onClick={onPreview}
        >
          {busy ? 'Building…' : 'Preview game results'}
        </Button>
      </div>
    </div>
  );
};

export default SingleGameReportOptions;
