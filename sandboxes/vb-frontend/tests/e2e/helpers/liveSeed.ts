import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const seedPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../.e2e-seed.json'
);

export interface LiveE2ESeed {
  tdEmail: string;
  tdPassword: string;
  lapsedTdEmail?: string;
  lapsedTdPassword?: string;
  lapsedTdUserId?: number;
  saOnlyEmail?: string;
  saOnlyPassword?: string;
  saOnlyUserId?: number;
  saOnlyTournamentId?: number;
  saOnlyEventId?: number;
  adminEmail?: string;
  adminPassword?: string;
  bowlerEmail?: string;
  bowlerPassword?: string;
  eventName: string;
  tournamentName: string;
  centerName: string;
  squadName: string;
  eventId: number;
  tournamentId: number;
  centerId: number;
  roundId: number;
  finalsRoundId: number;
  squadId: number;
  finalsSquadId: number;
  gameId: number;
  gameWithSquadId: number;
  gameUserId?: number;
  tdUserId: number;
  adminUserId?: number;
  bowlerNames: string[];
  bakerEventId?: number;
  bakerRoundId?: number;
  bakerSquadId?: number;
  mixedEventId?: number;
  mixedQualRoundId?: number;
  mixedFinalRoundId?: number;
  mixedQualSquadId?: number;
  mixedFinalSquadId?: number;
  deEventId?: number;
  deRoundId?: number;
  deSquadId?: number;
  opsEventId?: number;
  opsRoundId?: number;
  opsSquadAId?: number;
  opsSquadBId?: number;
  stepladderEventId?: number;
  stepladderRoundId?: number;
  stepladderSquadId?: number;
  rrEventId?: number;
  rrRoundId?: number;
  rrSquadId?: number;
  podsEventId?: number;
  podsRoundId?: number;
  podsSquadId?: number;
  teamsEventId?: number;
  teamsRoundId?: number;
  teamsSquadId?: number;
  payoutEventId?: number;
  payoutQualRoundId?: number;
  payoutFinalRoundId?: number;
  tiedEventId?: number;
  tiedRoundId?: number;
  saTemplateId?: number;
  mysteryGameSideActionId?: number;
  bracketsSideActionId?: number;
  brackets2SideActionId?: number;
  centerLaneCount?: number;
}

let cached: LiveE2ESeed | null | undefined;

export function getLiveSeed(): LiveE2ESeed {
  if (cached) {
    return cached;
  }
  if (!fs.existsSync(seedPath)) {
    throw new Error(
      `Missing ${seedPath}. Start Playwright so run_e2e_api.py can seed SQLite.`
    );
  }
  cached = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as LiveE2ESeed;
  return cached;
}
