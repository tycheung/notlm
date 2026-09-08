import { normalizeRoundStatus } from '../../utils/statusUtils';
import type { TdHomeEventLike } from './tdHomeEventWindows';

export type TdHomeLiveStageKey = 'signups' | 'lanes' | 'scoring' | 'standings';

export type TdHomeLiveStage = {
  key: TdHomeLiveStageKey;
  label: string;
  /** Event-details tab query; omit for Event Info. */
  tab: 'participants' | 'lane_assignment' | 'game_scoring' | 'standings' | null;
  summary: string;
};

export type TdHomeLiveEventInput = TdHomeEventLike & {
  published_at?: string | null;
  completed_at?: string | null;
  signups_manually_closed?: boolean;
};

export type TdHomeLiveRoundInput = {
  status?: string | null;
  locked_in?: boolean | null;
  round_number?: number | null;
  friendly_name?: string | null;
  squads?: Array<{
    status?: string | null;
    locked_in?: boolean | null;
    start_lane?: number | null;
    end_lane?: number | null;
  }>;
};

function roundPulseLabel(round: TdHomeLiveRoundInput): string {
  const friendly = String(round.friendly_name ?? '').trim();
  if (friendly) return friendly;
  const num = Number(round.round_number);
  if (Number.isFinite(num) && num > 0) return `Round ${num}`;
  return 'Round';
}

function compareRounds(a: TdHomeLiveRoundInput, b: TdHomeLiveRoundInput): number {
  return Number(a.round_number ?? 0) - Number(b.round_number ?? 0);
}

export function formatTdHomeCurrentStatus(
  event: TdHomeLiveEventInput,
  rounds: TdHomeLiveRoundInput[] = [],
  fallback: string
): string {
  if (event.completed_at) return 'Event complete';
  if (rounds.length === 0) return fallback;

  const ordered = [...rounds].sort(compareRounds);
  const inProgress = ordered.filter((round) => normalizeRoundStatus(round.status) === 'in_progress');
  const completed = ordered.filter((round) => normalizeRoundStatus(round.status) === 'completed');

  if (inProgress.length > 0) {
    const parts: string[] = [];
    const prior = completed[completed.length - 1];
    if (prior) {
      parts.push(`${roundPulseLabel(prior)} complete`);
    }
    parts.push(`${roundPulseLabel(inProgress[0])} in progress`);
    return parts.join(', ');
  }

  if (completed.length === ordered.length) {
    return `${roundPulseLabel(ordered[ordered.length - 1])} complete`;
  }

  return fallback;
}

const STAGE_SIGNUPS: TdHomeLiveStage = {
  key: 'signups',
  label: 'Sign-ups',
  tab: 'participants',
  summary: 'Sign-ups open',
};

const STAGE_LANES: TdHomeLiveStage = {
  key: 'lanes',
  label: 'Lane Assignments',
  tab: 'lane_assignment',
  summary: 'Lanes in progress',
};

const STAGE_SCORING: TdHomeLiveStage = {
  key: 'scoring',
  label: 'Game Scoring',
  tab: 'game_scoring',
  summary: 'Scoring in progress',
};

const STAGE_STANDINGS: TdHomeLiveStage = {
  key: 'standings',
  label: 'Standings',
  tab: 'standings',
  summary: 'Event complete',
};

function signupsLookOpen(event: TdHomeLiveEventInput): boolean {
  if (event.completed_at) return false;
  if (event.signups_manually_closed !== false) return false;
  if (!event.published_at) return false;
  return true;
}

function lanesLookStarted(rounds: TdHomeLiveRoundInput[]): boolean {
  return rounds.some((round) => {
    if (round.locked_in) return true;
    return (round.squads || []).some((squad) => {
      if (squad.locked_in) return true;
      if (squad.start_lane != null || squad.end_lane != null) return true;
      const squadStatus = String(squad.status || '').toLowerCase();
      return squadStatus === 'in_progress' || squadStatus === 'completed';
    });
  });
}

export function resolveTdHomeLiveStage(
  event: TdHomeLiveEventInput,
  rounds: TdHomeLiveRoundInput[] = []
): TdHomeLiveStage {
  const statuses = rounds.map((round) => normalizeRoundStatus(round.status));
  let stage = STAGE_SCORING;
  if (event.completed_at || (rounds.length > 0 && statuses.every((status) => status === 'completed'))) {
    stage = STAGE_STANDINGS;
  } else if (statuses.some((status) => status === 'in_progress')) {
    stage = STAGE_SCORING;
  } else if (lanesLookStarted(rounds)) {
    stage = STAGE_LANES;
  } else if (signupsLookOpen(event)) {
    stage = STAGE_SIGNUPS;
  }
  return {
    ...stage,
    summary: formatTdHomeCurrentStatus(event, rounds, stage.summary),
  };
}

export function defaultTdHomeLiveStage(event: TdHomeLiveEventInput): TdHomeLiveStage {
  if (event.completed_at) return STAGE_STANDINGS;
  if (signupsLookOpen(event)) return STAGE_SIGNUPS;
  return STAGE_SCORING;
}
