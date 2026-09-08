import { defaultAdvanceForSize } from './podsAdvanceDefaults';

/** Build pod-grouped score entry categories for Beat-the-pair (simultaneous pinfall). */

export type PodsScoringCategory = {
  id: string;
  name: string;
  participants: Record<string, unknown>[];
  scoringSquadId: number;
  advanceCount?: number;
};

function participantKey(row: Record<string, unknown>, isTeamEvent: boolean): number | null {
  const raw = isTeamEvent
    ? row.id ?? row.team_id
    : row.event_participant_id ?? row.id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function participantDisplayName(row: Record<string, unknown>): string {
  const user = row.user as { name?: string } | undefined;
  return String(
    row.user_name ?? user?.name ?? row.display_name ?? row.team_name ?? row.name ?? ''
  ).trim();
}

export function displayNameForPodParticipant(row: Record<string, unknown>): string {
  return participantDisplayName(row) || 'Unknown entrant';
}

function seedRankForRosterRow(row: Record<string, unknown>, fallback: number): number {
  const candidates = [
    row.seed_rank,
    row.canonical_order,
    row.advancement_position,
    row.pool_position,
    row.round_entry_number,
    row.entry_number,
    row.position,
    fallback,
  ];
  for (const raw of candidates) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return fallback;
}

export function buildSeedToParticipantMap(
  squadParticipants: Record<string, unknown>[],
  roundParticipants: Record<string, unknown>[],
  isTeamEvent: boolean
): Map<number, Record<string, unknown>> {
  const byKey = new Map<number, Record<string, unknown>>();
  for (const row of squadParticipants) {
    const key = participantKey(row, isTeamEvent);
    if (key != null) byKey.set(key, row);
  }

  const rosterOrder = [...(roundParticipants || [])].sort((a, b) => {
    const ar = seedRankForRosterRow(a, Number.MAX_SAFE_INTEGER);
    const br = seedRankForRosterRow(b, Number.MAX_SAFE_INTEGER);
    if (ar !== br) return ar - br;
    const aId = Number(a.team_id ?? a.participant_id ?? a.event_participant_id ?? 0);
    const bId = Number(b.team_id ?? b.participant_id ?? b.event_participant_id ?? 0);
    return aId - bId;
  });

  const seedToParticipant = new Map<number, Record<string, unknown>>();
  rosterOrder.forEach((row, index) => {
    const key = participantKey(row, isTeamEvent);
    if (key == null) return;
    const squadRow = byKey.get(key);
    if (!squadRow) return;
    seedToParticipant.set(index + 1, squadRow);
  });

  if (seedToParticipant.size === 0) {
    const orderedSquad = [...squadParticipants].sort((a, b) => {
      const ar = seedRankForRosterRow(a, Number.MAX_SAFE_INTEGER);
      const br = seedRankForRosterRow(b, Number.MAX_SAFE_INTEGER);
      if (ar !== br) return ar - br;
      const aId = Number(a.event_participant_id ?? a.id ?? 0);
      const bId = Number(b.event_participant_id ?? b.id ?? 0);
      return aId - bId;
    });
    orderedSquad.forEach((row, index) => {
      seedToParticipant.set(index + 1, row);
    });
  }

  return seedToParticipant;
}

export { defaultAdvanceForSize as defaultAdvanceForPodSize };

export type PodsMembershipPreviewMember = {
  seed: number;
  name: string;
  resolved: boolean;
};

export type PodsMembershipPreviewPod = {
  podIndex: number;
  seeds: number[];
  members: PodsMembershipPreviewMember[];
  advanceCount: number;
};

/** Format Editor preview: map pod_membership seeds to roster names (seed order preserved). */
export function buildPodsMembershipPreview(args: {
  squadParticipants: Record<string, unknown>[];
  roundParticipants: Record<string, unknown>[];
  podMembership: number[][] | null | undefined;
  advanceBySize?: Record<string, number> | null;
  isTeamEvent: boolean;
}): PodsMembershipPreviewPod[] {
  const membership = args.podMembership?.filter((pod) => pod?.length) ?? [];
  if (!membership.length) return [];

  const seedMap = buildSeedToParticipantMap(
    args.squadParticipants,
    args.roundParticipants,
    args.isTeamEvent
  );

  return membership.map((podSeeds, podIndex) => {
    const seeds = podSeeds.map((s) => Number(s)).filter((s) => Number.isFinite(s) && s > 0);
    const members = seeds.map((seed) => {
      const row = seedMap.get(seed);
      const name = row ? displayNameForPodParticipant(row) : '';
      return {
        seed,
        name,
        resolved: Boolean(name),
      };
    });
    const size = seeds.length;
    const configured = args.advanceBySize?.[String(size)];
    const advanceCount =
      configured != null && Number.isFinite(Number(configured))
        ? Number(configured)
        : defaultAdvanceForSize(size);

    return { podIndex, seeds, members, advanceCount };
  });
}

export function buildPodsScoringCategories(args: {
  squadCategories: Array<{ id: string; name: string; participants: Record<string, unknown>[] }>;
  roundParticipants: Record<string, unknown>[];
  podMembership: number[][] | null | undefined;
  advanceBySize?: Record<string, number> | null;
  isTeamEvent: boolean;
}): PodsScoringCategory[] {
  const assignedSquads = args.squadCategories.filter((c) => c.id !== 'unassigned');
  const scoringSquadId = Number(assignedSquads[0]?.id);
  if (!Number.isFinite(scoringSquadId) || scoringSquadId <= 0) {
    return [];
  }

  const flatParticipants = assignedSquads.flatMap((c) => c.participants);
  const seedMap = buildSeedToParticipantMap(
    flatParticipants,
    args.roundParticipants,
    args.isTeamEvent
  );

  const membership = args.podMembership?.filter((pod) => pod?.length) ?? [];
  if (!membership.length) {
    return [];
  }

  return membership.map((podSeeds, podIndex) => {
    const seeds = podSeeds.map((s) => Number(s)).filter((s) => Number.isFinite(s) && s > 0);
    const participants = seeds
      .map((seed) => seedMap.get(seed))
      .filter((row): row is Record<string, unknown> => row != null)
      .sort((a, b) =>
        participantDisplayName(a).localeCompare(participantDisplayName(b), undefined, {
          sensitivity: 'base',
        })
      );
    const size = seeds.length || participants.length;
    const configured = args.advanceBySize?.[String(size)];
    const advanceCount =
      configured != null && Number.isFinite(Number(configured))
        ? Number(configured)
        : defaultAdvanceForSize(size);

    return {
      id: `pod-${podIndex}`,
      name: `Pod ${podIndex + 1}`,
      participants,
      scoringSquadId,
      advanceCount,
    };
  });
}
