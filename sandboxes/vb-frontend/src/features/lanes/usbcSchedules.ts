/** Official USBC league schedule tables (team-code grids). */

import schedulesJson from './usbc_schedules_data.json';

type WeekGrid = Array<[number, number]>;

const SCHEDULES = schedulesJson as Record<string, WeekGrid[]>;

export function availableLeagueTeamCounts(): number[] {
  return Object.keys(SCHEDULES)
    .map((k) => Number(k))
    .sort((a, b) => a - b);
}

export function getLeagueSchedule(teamCount: number): WeekGrid[] {
  const weeks = SCHEDULES[String(teamCount)];
  if (!weeks) {
    throw new Error(
      `No USBC league schedule loaded for ${teamCount} teams. Supported: ${availableLeagueTeamCounts().join(', ')}`
    );
  }
  return weeks;
}

export function chooseLeagueWrapPairOffset(numPairs: number): number {
  const pairs = Math.max(1, Math.trunc(numPairs));
  return Math.floor(Math.random() * pairs) + 1;
}

export function openingTeamCodeForLane(
  startLane: number,
  numPairs: number,
  pairsInPlay?: Array<[number, number]>
): { teamCode: number; pairColumn: number } {
  if (pairsInPlay?.length) {
    if (pairsInPlay.length !== numPairs) {
      throw new Error(`Expected ${numPairs} pairs in play; found ${pairsInPlay.length}`);
    }
    for (let pairColumn = 0; pairColumn < pairsInPlay.length; pairColumn += 1) {
      const [low, high] = pairsInPlay[pairColumn];
      if (startLane === low) {
        return { teamCode: pairColumn * 2 + 1, pairColumn };
      }
      if (startLane === high) {
        return { teamCode: pairColumn * 2 + 2, pairColumn };
      }
    }
    throw new Error(`Starting lane ${startLane} is not in the provided pairs in play`);
  }

  const pairLow = startLane % 2 === 1 ? startLane : startLane - 1;
  const pairColumn = Math.floor((pairLow - 1) / 2);
  if (pairColumn < 0 || pairColumn >= numPairs) {
    throw new Error(`Starting lane ${startLane} is outside the ${numPairs} schedule pairs`);
  }
  const leftTeam = pairColumn * 2 + 1;
  const rightTeam = pairColumn * 2 + 2;
  const teamCode = startLane % 2 === 1 ? leftTeam : rightTeam;
  return { teamCode, pairColumn };
}

export function locateTeamInWeek(
  week: WeekGrid,
  teamCode: number
): { column: number; isLeft: boolean } {
  for (let column = 0; column < week.length; column += 1) {
    const [left, right] = week[column];
    if (left === teamCode) return { column, isLeft: true };
    if (right === teamCode) return { column, isLeft: false };
  }
  throw new Error(`Team ${teamCode} not found in league schedule week`);
}

export function leagueAssignmentForGame(input: {
  startLane: number;
  gameNumber: number;
  teamCount: number;
  intervalGames?: number;
  pairsInPlay?: Array<[number, number]>;
  wrapPairOffset?: number | null;
}): { pair: [number, number]; assignedLane: number } {
  const { startLane, gameNumber, teamCount } = input;
  if (gameNumber < 1) throw new Error('gameNumber must be >= 1');
  const schedule = getLeagueSchedule(teamCount);
  const numPairs = teamCount / 2;
  const physicalPairs: Array<[number, number]> = input.pairsInPlay
    ? input.pairsInPlay.map(([a, b]) => [a, b])
    : Array.from({ length: numPairs }, (_, i) => [i * 2 + 1, i * 2 + 2]);
  if (physicalPairs.length !== numPairs) {
    throw new Error(
      `League team count ${teamCount} requires ${numPairs} pairs in play; found ${physicalPairs.length}`
    );
  }
  const { teamCode } = openingTeamCodeForLane(startLane, numPairs, physicalPairs);
  const interval = Math.max(1, input.intervalGames ?? 1);
  const weekAbs = Math.floor((gameNumber - 1) / interval);
  const cycleLen = schedule.length;
  const bank = Math.floor(weekAbs / cycleLen);
  const week = schedule[weekAbs % cycleLen];
  const { column, isLeft } = locateTeamInWeek(week, teamCode);

  let seatShift = 0;
  if (bank > 0) {
    let offset = input.wrapPairOffset != null ? Math.trunc(input.wrapPairOffset) : 0;
    if (offset < 1) {
      offset = 0;
    } else {
      offset = ((offset - 1) % numPairs) + 1;
    }
    seatShift = (bank * offset) % numPairs;
  }

  const physicalCol = (column + seatShift) % numPairs;
  const pair = physicalPairs[physicalCol];
  return { pair, assignedLane: isLeft ? pair[0] : pair[1] };
}
