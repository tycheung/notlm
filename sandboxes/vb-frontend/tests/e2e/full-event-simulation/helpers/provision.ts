import type { ApiClient } from './apiClient';
import {
  generateSinglesRoster,
  generateTeamsRoster,
  singlesRosterToCsv,
  type GeneratedBowler,
  type GeneratedTeam,
} from './roster';
import {
  TEAM_SIZE_MAX,
  SINGLES_ENTRANT_COUNT,
  TEAMS_ENTRANT_COUNT,
} from './simEnv';
import {
  advancementFor,
  buildTwoStageStructure,
  type BundleConfig,
  type FinalMethod,
} from './structures';

export type ProvisionedEvent = {
  tournamentId: number;
  eventId: number;
  qualRoundId: number;
  finalRoundId: number;
  qualSquadId: number;
  finalSquadId: number;
  participantIds: number[];
  teamIds: number[];
  config: BundleConfig;
  singlesRoster: GeneratedBowler[];
  teamsRoster: GeneratedTeam[];
};

type Center = { id: number; name: string };
type Tournament = { id: number; name: string };
type EventRead = { id: number; name: string; tournament_id: number };
type Template = { id: number; name: string };
type RoundRow = {
  id: number;
  round_number: number;
  friendly_name?: string | null;
  squads?: Array<{ id: number; name: string; round_id?: number }>;
};
type SquadRow = { id: number; name: string; round_id: number };
type Participant = { id: number; user_id: number };
type TeamRow = { id: number; team_name?: string | null };
type UserRead = { id: number; usbc_id: string };

async function pickBowlingCenter(api: ApiClient): Promise<Center> {
  const centers = await api.get<Center[]>('/bowling-centers/');
  if (!centers.length) {
    throw new Error('No bowling centers found — seed the database first');
  }
  return centers[0];
}

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().replace(/\.\d{3}Z$/, '');
}

async function patchParticipantsInChunks(
  api: ApiClient,
  eventId: number,
  participants: Participant[],
  body: Record<string, unknown>
): Promise<void> {
  const chunk = 25;
  for (let i = 0; i < participants.length; i += chunk) {
    const slice = participants.slice(i, i + chunk);
    await Promise.all(
      slice.map((p) =>
        api.patch(`/events/${eventId}/participants/${p.id}`, body)
      )
    );
  }
}

async function resolveRoundsAndSquads(
  api: ApiClient,
  eventId: number
): Promise<{
  qual: RoundRow;
  final: RoundRow;
  qualSquadId: number;
  finalSquadId: number;
}> {
  const withRounds = await api.get<{ rounds: RoundRow[] }>(
    `/events/${eventId}/rounds`
  );
  const rounds = (withRounds.rounds || [])
    .slice()
    .sort((a, b) => a.round_number - b.round_number);
  if (rounds.length < 2) {
    throw new Error(
      `Expected 2 rounds after structure apply; got ${rounds.length}`
    );
  }
  const qual = rounds[0];
  const final = rounds[1];
  const allSquads = await api.get<SquadRow[]>(`/squads/?event_id=${eventId}`);
  const qualSquad =
    allSquads.find((s) => s.round_id === qual.id) ||
    (await api.get<SquadRow[]>(`/squads/round/${qual.id}`))[0];
  const finalSquad =
    allSquads.find((s) => s.round_id === final.id) ||
    (await api.get<SquadRow[]>(`/squads/round/${final.id}`))[0];
  if (!qualSquad || !finalSquad) {
    throw new Error('Missing squads after structure apply');
  }
  return {
    qual,
    final,
    qualSquadId: qualSquad.id,
    finalSquadId: finalSquad.id,
  };
}

export async function provisionBundle(
  api: ApiClient,
  config: BundleConfig
): Promise<ProvisionedEvent> {
  const center = await pickBowlingCenter(api);
  const stamp = Date.now();
  const me = await api.get<{ id: number }>('/users/me');
  const tournament = await api.post<Tournament>('/tournaments/', {
    name: `FES ${config.id} ${stamp}`,
    start_date: isoDaysFromNow(0),
    end_date: isoDaysFromNow(3),
    official_flg: false,
    bowling_center_id: center.id,
    description: `Full event sim ${config.label}`,
    location: 'Lanes 1-24',
    lanes_reserved: 24,
    organizer_id: me.id,
  });

  const isTeams = config.eventFormat === 'teams';
  const event = await api.post<EventRead>('/events/', {
    name: config.label,
    tournament_id: tournament.id,
    start_date: isoDaysFromNow(1),
    end_date: isoDaysFromNow(2),
    handicap_base_score: 200,
    handicap_percentage: 90,
    entry_fee: 90,
    max_entries: 500,
    description: `Plausible ${config.label}: $90 entry, 18% house cut, HDCP 200/90.`,
    rules: 'Full event simulation — qualifying then finals.',
    event_format: isTeams ? 'teams' : 'singles',
    team_size: isTeams ? TEAM_SIZE_MAX : null,
    team_scoring_method: isTeams ? 'sum_all' : null,
    house_cut_percentage: 18,
    house_cut_fixed_amount: 0,
    additional_prize_pool: 500,
    duplicate_cashing_policy: 'allow_multiple',
  });

  await api.patch(`/events/${event.id}/registration-settings`, {
    publish: true,
    signups_manually_closed: false,
  });

  const adv = config.advancementCount || advancementFor(config.finalMethod);
  const structure = buildTwoStageStructure(config.finalMethod, adv, isTeams);
  const template = await api.post<Template>(
    '/users/me/event-format-templates/',
    {
      name: `FES ${config.id} ${stamp}`,
      payload: structure,
      is_favorite: false,
      is_default: false,
    }
  );
  await api.post('/users/me/event-format-templates/apply', {
    event_id: event.id,
    template_id: template.id,
    replace_existing_structure: true,
  });

  const { qual, final, qualSquadId, finalSquadId } = await resolveRoundsAndSquads(
    api,
    event.id
  );

  let singlesRoster: GeneratedBowler[] = [];
  let teamsRoster: GeneratedTeam[] = [];
  let participantIds: number[] = [];
  let teamIds: number[] = [];

  if (!isTeams) {
    singlesRoster = generateSinglesRoster(config.entrantCount, stamp % 100000);
    const csv = singlesRosterToCsv(singlesRoster);
    await api.uploadCsv(
      `/events/${event.id}/participants/csv`,
      'singles-roster.csv',
      csv
    );
    const participants = await api.get<Participant[]>(
      `/events/${event.id}/participants`
    );
    participantIds = participants.map((p) => p.id);
    if (participantIds.length < config.entrantCount) {
      throw new Error(
        `Expected ≥${config.entrantCount} participants, got ${participantIds.length}`
      );
    }
    await patchParticipantsInChunks(api, event.id, participants, {
      checked_in: true,
      paid_amount: 90,
    });
  } else {
    teamsRoster = generateTeamsRoster(config.entrantCount, stamp % 100000);
    const allMembers = teamsRoster.flatMap((t) => t.members);
    // Create users in chunks (batch skips existing USBC)
    const chunk = 50;
    const usbcToId = new Map<string, number>();
    for (let i = 0; i < allMembers.length; i += chunk) {
      const slice = allMembers.slice(i, i + chunk);
      const createdUsers = await api.post<UserRead[]>(
        '/users/batch-create-minimal',
        slice.map((m) => ({
          usbc_id: m.usbc_id,
          first_name: m.first_name,
          last_name: m.last_name,
        }))
      );
      for (const u of createdUsers) {
        usbcToId.set(u.usbc_id.toLowerCase(), u.id);
      }
    }
    // Resolve any skipped (already existed) via search-usbc-batch
    const missing = allMembers.filter(
      (m) => !usbcToId.has(m.usbc_id.toLowerCase())
    );
    if (missing.length) {
      const found = await api.post<
        Array<{ usbc_id: string; user_id?: number | null }>
      >(
        '/users/search-usbc-batch',
        missing.map((m) => m.usbc_id)
      );
      for (const row of found) {
        if (row.user_id && row.usbc_id) {
          usbcToId.set(row.usbc_id.toLowerCase(), row.user_id);
        }
      }
    }

    await api.post(`/events/${event.id}/teams/batch`, {
      event_id: event.id,
      team_size: TEAM_SIZE_MAX,
      teams: teamsRoster.map((t) => ({
        team_name: t.team_name,
        members: t.members.map((m, idx) => ({
          usbc_id: m.usbc_id,
          first_name: m.first_name,
          last_name: m.last_name,
          user_id: usbcToId.get(m.usbc_id.toLowerCase()) ?? null,
          is_team_captain: idx === 0,
          qualifying_average: Number(m.qualifying_average),
          paid_amount: idx === 0 ? 90 : 0,
        })),
      })),
    });

    const teams = await api.get<TeamRow[]>(`/events/${event.id}/teams`);
    teamIds = teams.map((t) => t.id);
    if (teamIds.length < config.entrantCount) {
      throw new Error(
        `Expected ≥${config.entrantCount} teams, got ${teamIds.length}`
      );
    }
    const participants = await api.get<Participant[]>(
      `/events/${event.id}/participants`
    );
    participantIds = participants.map((p) => p.id);
    await patchParticipantsInChunks(api, event.id, participants, {
      checked_in: true,
      paid_amount: 90,
    });
  }

  if (!isTeams) {
    await api.post('/squads/batch-assign', {
      assignments: participantIds.map((pid, idx) => ({
        event_participant_id: pid,
        squad_id: qualSquadId,
        position: idx + 1,
      })),
    });
    await api.post(`/rounds/${qual.id}/lock-in`);
  } else {
    await api.post('/squads/batch-team-operations', {
      operations: teamIds.map((tid) => ({
        action: 'assign',
        team_id: tid,
        squad_id: qualSquadId,
      })),
    });
    await api.post(`/rounds/${qual.id}/lock-in-teams`);
  }

  return {
    tournamentId: tournament.id,
    eventId: event.id,
    qualRoundId: qual.id,
    finalRoundId: final.id,
    qualSquadId,
    finalSquadId,
    participantIds,
    teamIds,
    config,
    singlesRoster,
    teamsRoster,
  };
}

export function makeBundleConfig(
  id: string,
  label: string,
  eventFormat: 'singles' | 'teams',
  finalMethod: FinalMethod
): BundleConfig {
  return {
    id,
    label,
    eventFormat,
    finalMethod,
    advancementCount: advancementFor(finalMethod),
    entrantCount:
      eventFormat === 'singles' ? SINGLES_ENTRANT_COUNT : TEAMS_ENTRANT_COUNT,
  };
}
