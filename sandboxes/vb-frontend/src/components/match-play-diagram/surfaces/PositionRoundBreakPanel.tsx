import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RoundMatchSeriesAPI, type MatchSeriesRead } from '../../../api/round-match-series';
import { getErrorMessage } from '../../../api/apiErrors';
import Button from '../../common/Button';

type StandingRow = {
  position?: number;
  user_name?: string;
  team_name?: string;
  display_name?: string;
  event_participant_id?: number | null;
  team_id?: number | null;
  total_pinfall?: number;
  total_score?: number;
  bonus_pins?: number;
  total_with_bonus?: number;
  match_wins?: number;
  match_losses?: number;
};

interface PositionRoundBreakPanelProps {
  roundId: number;
  isTeamEvent: boolean;
  matchSeries: MatchSeriesRead[];
  roundParticipants: StandingRow[];
  allGames: any[];
  /** 1-based game from config; falls back to first position segment. */
  positionRoundGame?: number | null;
  scheduledGames?: number | null;
}

function displayName(row: StandingRow, isTeam: boolean): string {
  if (isTeam) {
    return row.team_name || row.display_name || row.user_name || `Team ${row.team_id ?? '?'}`;
  }
  return row.user_name || row.display_name || `Bowler ${row.event_participant_id ?? '?'}`;
}

function pinfallDisplay(row: StandingRow): string {
  const bonus = Number(row.bonus_pins || 0);
  const withBonus = row.total_with_bonus;
  if (withBonus != null && Number.isFinite(Number(withBonus))) {
    return bonus ? `${withBonus} (+${bonus})` : String(withBonus);
  }
  const pin = row.total_pinfall ?? row.total_score;
  if (pin == null) return '—';
  return bonus ? `${pin} (+${bonus})` : String(pin);
}

function seriesScored(s: MatchSeriesRead): boolean {
  return (
    (s.wins_side_0 || 0) > 0 ||
    (s.wins_side_1 || 0) > 0 ||
    s.winner_side != null ||
    String(s.status || '').toLowerCase() === 'complete'
  );
}

function laneForSide(games: any[], seriesId: number, sideId: number | null, isTeam: boolean): string {
  if (sideId == null) return '—';
  const rows = games.filter((g) => Number(g.match_series_id ?? 0) === seriesId);
  const hit = rows.find((g) => {
    if (isTeam) return Number(g.team_id) === sideId && Boolean(g.is_team_game);
    return Number(g.event_participant_id) === sideId && !g.is_team_game;
  });
  const lane = hit?.assigned_lane ?? hit?.lane;
  return lane != null && String(lane).trim() !== '' ? String(lane) : '—';
}

/**
 * Compact TD panel for the short break before a position round:
 * standings strip + matchups (places, names, lanes) + lock-from-standings CTA.
 */
const PositionRoundBreakPanel: React.FC<PositionRoundBreakPanelProps> = ({
  roundId,
  isTeamEvent,
  matchSeries,
  roundParticipants,
  allGames,
  positionRoundGame,
  scheduledGames,
}) => {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameInput, setGameInput] = useState<string>(() =>
    positionRoundGame != null && positionRoundGame >= 1 ? String(positionRoundGame) : ''
  );

  const derivedGame = useMemo(() => {
    if (positionRoundGame != null && positionRoundGame >= 1) return positionRoundGame;
    const pos = matchSeries.find((s) => s.bracket_segment === 'position');
    if (pos?.bracket_round != null) return Number(pos.bracket_round) + 1;
    return null;
  }, [positionRoundGame, matchSeries]);

  const activeGame = useMemo(() => {
    const typed = Number(gameInput);
    if (Number.isFinite(typed) && typed >= 1) return typed;
    return derivedGame;
  }, [gameInput, derivedGame]);

  const positionSeries = useMemo(() => {
    if (activeGame == null) {
      return matchSeries
        .filter((s) => s.bracket_segment === 'position')
        .sort((a, b) => (a.bracket_slot ?? a.display_order) - (b.bracket_slot ?? b.display_order));
    }
    const zeroBased = activeGame - 1;
    return matchSeries
      .filter((s) => Number(s.bracket_round) === zeroBased)
      .sort((a, b) => (a.bracket_slot ?? a.display_order) - (b.bracket_slot ?? b.display_order));
  }, [matchSeries, activeGame]);

  const isPositionConfigured = positionSeries.some((s) => s.bracket_segment === 'position');
  const targetScored = positionSeries.some(seriesScored);
  const standingsSorted = useMemo(
    () =>
      [...roundParticipants].sort(
        (a, b) => Number(a.position ?? 9999) - Number(b.position ?? 9999)
      ),
    [roundParticipants]
  );

  const nameByEp = useMemo(() => {
    const m = new Map<number, string>();
    for (const row of roundParticipants) {
      if (row.event_participant_id != null) {
        m.set(Number(row.event_participant_id), displayName(row, isTeamEvent));
      }
    }
    return m;
  }, [roundParticipants, isTeamEvent]);

  const nameByTeam = useMemo(() => {
    const m = new Map<number, string>();
    for (const row of roundParticipants) {
      if (row.team_id != null) {
        m.set(Number(row.team_id), displayName(row, true));
      }
    }
    return m;
  }, [roundParticipants]);

  const sideLabel = (series: MatchSeriesRead, side: 0 | 1): { place: string; name: string; id: number | null } => {
    const part = series.participants.find((p) => p.side === side);
    const place = part?.seed_order != null && part.seed_order > 0 ? String(part.seed_order) : '—';
    let name = 'TBD';
    let id: number | null = null;
    if (isTeamEvent && part?.team_id != null) {
      id = Number(part.team_id);
      name = nameByTeam.get(id) || `Team ${id}`;
    } else if (part?.event_participant_id != null) {
      id = Number(part.event_participant_id);
      name = nameByEp.get(id) || `Bowler ${id}`;
    } else if (part?.seed_order) {
      const standing = standingsSorted.find((r) => Number(r.position) === Number(part.seed_order));
      if (standing) name = displayName(standing, isTeamEvent);
      else name = `Place ${part.seed_order}`;
    }
    return { place, name, id };
  };

  const lockFromStandings = async () => {
    if (activeGame == null) {
      setError('Set the position-round game number first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await RoundMatchSeriesAPI.applyPositionRound(roundId, {
        game: activeGame,
        fill_from_standings: true,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['roundMatchSeries', roundId] }),
        queryClient.invalidateQueries({ queryKey: ['roundParticipants', roundId] }),
        queryClient.invalidateQueries({ queryKey: ['squadGames', roundId] }),
        queryClient.invalidateQueries({ queryKey: ['teamGames', roundId] }),
        queryClient.invalidateQueries({ queryKey: ['eventComplete'] }),
        queryClient.invalidateQueries({ queryKey: ['event'] }),
      ]);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not lock position round from standings.'));
    } finally {
      setBusy(false);
    }
  };

  const maxGameHint = scheduledGames != null && scheduledGames > 0 ? scheduledGames : undefined;

  return (
    <div className="rounded-lg border border-accent/40 bg-accent/5 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text">Position round break</h3>
          <p className="text-xs text-text-muted mt-0.5 max-w-xl">
            Standings and matchups for the short break while final scores are entered. Lock once
            places are set — refuses if that game already has scores.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-text-muted">
            Game #
            <input
              type="number"
              min={1}
              max={maxGameHint}
              className="ml-2 w-16 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text"
              value={gameInput}
              placeholder={derivedGame != null ? String(derivedGame) : ''}
              onChange={(e) => setGameInput(e.target.value)}
            />
          </label>
          <Button
            type="button"
            size="small"
            disabled={busy || targetScored || activeGame == null}
            onClick={() => void lockFromStandings()}
          >
            {busy ? 'Locking…' : 'Lock matchups from standings'}
          </Button>
        </div>
      </div>

      {targetScored && (
        <p className="text-xs text-warning">
          Game {activeGame} already has results — position matchups are locked.
        </p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="overflow-auto max-h-56 rounded-md border border-border/60 bg-surface">
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-surface-light text-text-muted">
              <tr>
                <th className="px-2 py-1.5 font-medium">Pl</th>
                <th className="px-2 py-1.5 font-medium">Name</th>
                <th className="px-2 py-1.5 font-medium">Pinfall</th>
                <th className="px-2 py-1.5 font-medium">W-L</th>
              </tr>
            </thead>
            <tbody>
              {standingsSorted.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-3 text-text-muted">
                    No standings yet — complete prior games first.
                  </td>
                </tr>
              ) : (
                standingsSorted.map((row) => (
                  <tr key={`${row.team_id ?? row.event_participant_id}-${row.position}`} className="border-t border-border/40">
                    <td className="px-2 py-1 tabular-nums font-medium">{row.position ?? '—'}</td>
                    <td className="px-2 py-1 truncate max-w-[10rem]">{displayName(row, isTeamEvent)}</td>
                    <td className="px-2 py-1 tabular-nums">{pinfallDisplay(row)}</td>
                    <td className="px-2 py-1 tabular-nums text-text-muted">
                      {row.match_wins != null
                        ? `${row.match_wins}-${row.match_losses ?? 0}`
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-auto max-h-56 rounded-md border border-border/60 bg-surface">
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-surface-light text-text-muted">
              <tr>
                <th className="px-2 py-1.5 font-medium">Matchup</th>
                <th className="px-2 py-1.5 font-medium">Sides</th>
                <th className="px-2 py-1.5 font-medium">Lanes</th>
              </tr>
            </thead>
            <tbody>
              {positionSeries.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-2 py-3 text-text-muted">
                    {activeGame == null
                      ? 'Enter a game # and lock to create position shells.'
                      : `No shells for game ${activeGame} yet — sync structure, then lock.`}
                  </td>
                </tr>
              ) : (
                positionSeries.map((s) => {
                  const a = sideLabel(s, 0);
                  const b = sideLabel(s, 1);
                  const laneA = laneForSide(allGames, s.id, a.id, isTeamEvent);
                  const laneB = laneForSide(allGames, s.id, b.id, isTeamEvent);
                  const badge = s.bracket_segment === 'position' || isPositionConfigured
                    ? ''
                    : ' (league until lock)';
                  return (
                    <tr key={s.id} className="border-t border-border/40">
                      <td className="px-2 py-1 tabular-nums whitespace-nowrap">
                        {a.place}v{b.place}{badge}
                      </td>
                      <td className="px-2 py-1">
                        <span className="font-medium">{a.name}</span>
                        <span className="text-text-muted"> vs </span>
                        <span className="font-medium">{b.name}</span>
                      </td>
                      <td className="px-2 py-1 tabular-nums text-text-muted whitespace-nowrap">
                        {laneA} / {laneB}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PositionRoundBreakPanel;
