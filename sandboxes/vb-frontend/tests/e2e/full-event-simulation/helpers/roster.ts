import { TEAM_SIZE_MAX } from './simEnv';

export type GeneratedBowler = {
  usbc_id: string;
  first_name: string;
  last_name: string;
  email: string;
  amount_paid: string;
  qualifying_average: string;
};

export type GeneratedTeam = {
  team_name: string;
  members: GeneratedBowler[];
};

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function generateSinglesRoster(
  count: number,
  seed: number
): GeneratedBowler[] {
  const rand = seededRandom(seed);
  const rows: GeneratedBowler[] = [];
  for (let i = 0; i < count; i++) {
    const n = String(i + 1).padStart(3, '0');
    rows.push({
      usbc_id: `SIM${seed}${n}`,
      first_name: `Bowler${n}`,
      last_name: `Sim${seed}`,
      email: `sim${seed}.bowler${n}@example.com`,
      amount_paid: rand() > 0.15 ? '90' : '0',
      qualifying_average: String(160 + Math.floor(rand() * 40)),
    });
  }
  return rows;
}

/** 120 teams with random sizes in [2,5]; event team_size should be TEAM_SIZE_MAX. */
export function generateTeamsRoster(
  teamCount: number,
  seed: number
): GeneratedTeam[] {
  const rand = seededRandom(seed);
  const teams: GeneratedTeam[] = [];
  let bowlerIdx = 0;
  for (let t = 0; t < teamCount; t++) {
    const size = 2 + Math.floor(rand() * (TEAM_SIZE_MAX - 1)); // 2..5
    const members: GeneratedBowler[] = [];
    for (let m = 0; m < size; m++) {
      bowlerIdx += 1;
      const n = String(bowlerIdx).padStart(4, '0');
      members.push({
        usbc_id: `T${seed}${n}`,
        first_name: `T${t + 1}M${m + 1}`,
        last_name: `TeamSim${seed}`,
        email: `sim${seed}.t${t + 1}m${m + 1}@example.com`,
        amount_paid: m === 0 && rand() > 0.2 ? '90' : '0',
        qualifying_average: String(155 + Math.floor(rand() * 45)),
      });
    }
    teams.push({
      team_name: `Sim Team ${String(t + 1).padStart(3, '0')}`,
      members,
    });
  }
  return teams;
}

export function singlesRosterToCsv(rows: GeneratedBowler[]): string {
  const header =
    'team_name,is_team_captain,usbc_id,first_name,last_name,mi,email,phone,gender,birth_date,qualifying_average,amount_paid';
  const lines = rows.map(
    (r) =>
      `,,${r.usbc_id},${r.first_name},${r.last_name},,${r.email},,,,${r.qualifying_average},${r.amount_paid}`
  );
  return [header, ...lines].join('\n');
}

/**
 * Team CSV requires exact event.team_size rows per team.
 * Pad shorter teams with blank placeholder identity columns so import accepts them
 * only when API allows incomplete — prefer batch API for variable sizes instead.
 */
export function teamsRosterToCsv(
  teams: GeneratedTeam[],
  padToSize: number
): string {
  const header =
    'team_name,is_team_captain,usbc_id,first_name,last_name,mi,email,phone,gender,birth_date,qualifying_average,amount_paid';
  const lines: string[] = [];
  for (const team of teams) {
    team.members.forEach((r, idx) => {
      const captain = idx === 0 ? 'true' : 'false';
      lines.push(
        `${team.team_name},${captain},${r.usbc_id},${r.first_name},${r.last_name},,${r.email},,,,${r.qualifying_average},${r.amount_paid}`
      );
    });
    for (let p = team.members.length; p < padToSize; p++) {
      lines.push(`${team.team_name},false,,,,,,,,,`);
    }
  }
  return [header, ...lines].join('\n');
}
