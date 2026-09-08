import type { MatchSeriesRead } from '../../../api/round-match-series';
import type { RoundRead } from '../../../types/round';
import { seedSourceFromConfig, seedSourceToPatch, type SeedSourceConfig } from './seedSourceRound';

export type BracketSeedMode = 'by_seed' | 'random' | 'manual';

export type BracketSeedConfig = {
  seed_mode: BracketSeedMode;
  bracket_mode: 'single_elimination' | 'double_elimination';
  grand_final_reset?: boolean;
} & SeedSourceConfig;

export type BracketRoundSection = {
  key: string;
  title: string;
  bracketRound: number;
  segment: string | null;
  series: MatchSeriesRead[];
};

const SEED_MODES: BracketSeedMode[] = ['by_seed', 'random', 'manual'];

export function normalizeBracketSeedMode(raw: unknown): BracketSeedMode {
  const mode = String(raw ?? 'by_seed').trim().toLowerCase();
  return (SEED_MODES as string[]).includes(mode) ? (mode as BracketSeedMode) : 'by_seed';
}

export function seedConfigFromRound(round: RoundRead): BracketSeedConfig {
  const cfg = (round.competition_method_config || {}) as Record<string, unknown>;
  const modeRaw = String(cfg.bracket_mode ?? 'single_elimination');
  const bracket_mode =
    modeRaw === 'double_elimination' ? 'double_elimination' : 'single_elimination';
  return {
    seed_mode: normalizeBracketSeedMode(cfg.seed_mode),
    bracket_mode,
    grand_final_reset:
      bracket_mode === 'double_elimination' ? Boolean(cfg.grand_final_reset) : false,
    ...seedSourceFromConfig(cfg),
  };
}

export function seedConfigToPatch(
  draft: BracketSeedConfig,
  prevCfg: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...seedSourceToPatch(draft, prevCfg),
    seed_mode: normalizeBracketSeedMode(draft.seed_mode),
    bracket_mode: draft.bracket_mode,
    grand_final_reset:
      draft.bracket_mode === 'double_elimination'
        ? Boolean(draft.grand_final_reset)
        : false,
  };
}

function segmentLabel(segment: string | null | undefined): string | null {
  const s = String(segment || '').toLowerCase();
  if (s === 'winner') return 'Winners';
  if (s === 'loser') return 'Losers';
  if (s === 'grand_final') return 'Grand final';
  if (s === 'bracket_reset') return 'Bracket reset';
  return null;
}

function roundOfLabel(matchCount: number, roundIndex: number): string {
  const field = matchCount * 2;
  if (field >= 2 && (field & (field - 1)) === 0) {
    if (field === 2) return 'Final';
    if (field === 4) return 'Semifinals';
    return `Round of ${field}`;
  }
  return `Round ${roundIndex + 1}`;
}

/** Group bracket shells by segment + bracket_round for the Format Editor preview. */
export function groupBracketSeries(series: MatchSeriesRead[]): BracketRoundSection[] {
  if (series.length === 0) return [];

  const hasMeta = series.some((s) => s.bracket_round != null);
  if (!hasMeta) {
    const sorted = [...series].sort((a, b) => a.display_order - b.display_order);
    return [
      {
        key: 'all',
        title: 'Matches',
        bracketRound: 0,
        segment: null,
        series: sorted,
      },
    ];
  }

  type Bucket = {
    segment: string | null;
    bracketRound: number;
    series: MatchSeriesRead[];
  };
  const buckets = new Map<string, Bucket>();

  for (const s of series) {
    const br = Number(s.bracket_round ?? 0);
    const seg = s.bracket_segment ? String(s.bracket_segment) : null;
    const key = `${seg ?? 'none'}::${br}`;
    const bucket = buckets.get(key) ?? { segment: seg, bracketRound: br, series: [] };
    bucket.series.push(s);
    buckets.set(key, bucket);
  }

  const segmentOrder = (seg: string | null) => {
    const s = String(seg || '').toLowerCase();
    if (s === 'winner') return 0;
    if (s === 'loser') return 1;
    if (s === 'grand_final') return 2;
    if (s === 'bracket_reset') return 3;
    return 4;
  };

  return [...buckets.values()]
    .sort((a, b) => {
      const so = segmentOrder(a.segment) - segmentOrder(b.segment);
      if (so !== 0) return so;
      return a.bracketRound - b.bracketRound;
    })
    .map((bucket) => {
      const rows = [...bucket.series].sort(
        (a, b) =>
          (a.bracket_slot ?? a.display_order) - (b.bracket_slot ?? b.display_order)
      );
      const segName = segmentLabel(bucket.segment);
      let title: string;
      if (bucket.bracketRound === 200) {
        title = 'Grand final';
      } else if (bucket.bracketRound === 201) {
        title = 'Bracket reset';
      } else if (segName && String(bucket.segment).toLowerCase() !== 'winner') {
        title = `${segName} · Round ${bucket.bracketRound + 1}`;
      } else {
        title = roundOfLabel(rows.length, bucket.bracketRound);
      }
      return {
        key: `${bucket.segment ?? 'none'}::${bucket.bracketRound}`,
        title,
        bracketRound: bucket.bracketRound,
        segment: bucket.segment,
        series: rows,
      };
    });
}
