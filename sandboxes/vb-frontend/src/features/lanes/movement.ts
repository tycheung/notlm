/** Lane movement schedule helpers mirroring backend calculate_pair_for_game. */

import { leagueAssignmentForGame } from './usbcSchedules';

export type MovementPreviewMode =
  | 'stay'
  | 'move_right'
  | 'move_left'
  | 'expand'
  | 'staggered'
  | 'league';

export type MovementPreviewRow = {
  game_number: number;
  pair_low: number;
  pair_high: number;
  pair_label: string;
  assigned_lane: number;
};

function pairIndex(pairLow: number): number {
  return Math.floor((pairLow - 1) / 2);
}

function pairFromIndex(index: number): [number, number] {
  const low = index * 2 + 1;
  return [low, low + 1];
}

function normalizeLanePair(lane: number): [number, number] {
  const start = lane % 2 === 1 ? lane : lane - 1;
  return [start, start + 1];
}

function normalizePairsRing(
  pairsInPlay?: Array<[number, number]> | null
): Array<[number, number]> {
  if (!pairsInPlay?.length) return [];
  return pairsInPlay.map((pair) => [Math.trunc(pair[0]), Math.trunc(pair[1])]);
}

function wrapRingForOpening(
  openingPair: [number, number],
  pairsInPlay: Array<[number, number]> | undefined,
  options: {
    splitHouse?: boolean;
    splitAfterPairLow?: number | null;
  } = {}
): Array<[number, number]> | null {
  const ring = normalizePairsRing(pairsInPlay);
  if (!ring.length) return null;
  if (!options.splitHouse || options.splitAfterPairLow == null) {
    return ring;
  }
  const splitLow = Math.trunc(options.splitAfterPairLow);
  const lowHalf = ring.filter((pair) => pair[0] <= splitLow);
  const highHalf = ring.filter((pair) => pair[0] > splitLow);
  if (openingPair[0] <= splitLow) {
    return lowHalf.length ? lowHalf : ring;
  }
  return highHalf.length ? highHalf : ring;
}

function wrapPairOffset(
  openingPair: [number, number],
  pairOffset: number,
  numPairs: number | null,
  pairsRing?: Array<[number, number]> | null
): [number, number] {
  if (pairsRing?.length) {
    const idx = pairsRing.findIndex((pair) => pair[0] === openingPair[0]);
    if (idx >= 0) {
      const newIdx = ((idx + pairOffset) % pairsRing.length + pairsRing.length) % pairsRing.length;
      return pairsRing[newIdx];
    }
  }
  if (numPairs == null || numPairs <= 0) {
    const offsetLanes = pairOffset * 2;
    return [openingPair[0] + offsetLanes, openingPair[1] + offsetLanes];
  }
  const idx = pairIndex(openingPair[0]);
  const newIdx = ((idx + pairOffset) % numPairs + numPairs) % numPairs;
  return pairFromIndex(newIdx);
}

function movementIntervalIndex(gameNumber: number, intervalGames: number): number {
  if (gameNumber <= 1) return 0;
  return Math.floor((gameNumber - 1) / Math.max(1, intervalGames));
}

export function calculatePairForGame(
  openingPair: [number, number],
  gameNumber: number,
  movementMode: string,
  stepPairs: number,
  options: {
    intervalGames?: number;
    staggeredSteps?: number[];
    leagueTeamCount?: number | null;
    leagueWrapPairOffset?: number | null;
    numPairs?: number | null;
    startLane?: number | null;
    pairsInPlay?: Array<[number, number]>;
    splitHouse?: boolean;
    splitAfterPairLow?: number | null;
  } = {}
): [number, number] {
  if (gameNumber <= 1 || movementMode === 'stay') {
    return openingPair;
  }

  const mode = (movementMode || 'stay').toLowerCase();
  const steps = Math.max(1, Math.trunc(stepPairs || 1));
  let pairsCount = options.numPairs ?? null;
  if ((pairsCount == null || pairsCount <= 0) && options.leagueTeamCount) {
    pairsCount = Math.max(1, Math.floor(options.leagueTeamCount / 2));
  }
  const intervalGames = options.intervalGames ?? 1;
  const useSplit = Boolean(options.splitHouse) && mode !== 'league';
  const pairsRing = wrapRingForOpening(openingPair, options.pairsInPlay, {
    splitHouse: useSplit,
    splitAfterPairLow: useSplit ? options.splitAfterPairLow : null,
  });
  if (pairsRing && (pairsCount == null || pairsCount <= 0)) {
    pairsCount = pairsRing.length;
  }

  const wrap = (offset: number) =>
    wrapPairOffset(openingPair, offset, pairsCount, pairsRing);

  if (mode === 'move_right') {
    const intervalIdx = movementIntervalIndex(gameNumber, intervalGames);
    return wrap(intervalIdx * steps);
  }

  if (mode === 'move_left') {
    const intervalIdx = movementIntervalIndex(gameNumber, intervalGames);
    return wrap(-(intervalIdx * steps));
  }

  if (mode === 'expand') {
    const intervalIdx = movementIntervalIndex(gameNumber, intervalGames);
    // Odd = left lane of a pair → move left; even = right lane → move right.
    const lane = options.startLane != null ? options.startLane : openingPair[0];
    const direction = lane % 2 === 1 ? -1 : 1;
    return wrap(intervalIdx * steps * direction);
  }

  if (mode === 'staggered') {
    // Signed steps: positive = right, negative = left, 0 = stay.
    const rawSteps = options.staggeredSteps?.length ? options.staggeredSteps : [steps];
    const stepList = rawSteps.map((n) => Math.trunc(n));
    let totalOffset = 0;
    for (let gameIdx = 2; gameIdx <= gameNumber; gameIdx += 1) {
      totalOffset += stepList[(gameIdx - 2) % stepList.length];
    }
    return wrap(totalOffset);
  }

  if (mode === 'league') {
    if (pairsCount == null || pairsCount <= 0) {
      throw new Error('league mode requires leagueTeamCount or numPairs');
    }
    const teamCount = options.leagueTeamCount
      ? Math.trunc(options.leagueTeamCount)
      : pairsCount * 2;
    const lane = options.startLane != null ? options.startLane : openingPair[0];
    const { pair } = leagueAssignmentForGame({
      startLane: lane,
      gameNumber,
      teamCount,
      intervalGames,
      pairsInPlay: options.pairsInPlay,
      wrapPairOffset: options.leagueWrapPairOffset,
    });
    return pair;
  }

  return openingPair;
}

export function resolveAssignedLane(
  startLane: number,
  pair: [number, number],
  options: {
    movementMode: string;
    gameNumber: number;
    intervalGames?: number;
    numPairs?: number | null;
    leagueTeamCount?: number | null;
    leagueWrapPairOffset?: number | null;
    stepPairs?: number;
    staggeredSteps?: number[];
    openingPair?: [number, number];
    pairsInPlay?: Array<[number, number]>;
    splitHouse?: boolean;
    splitAfterPairLow?: number | null;
  }
): number {
  const mode = (options.movementMode || 'stay').toLowerCase();
  if (mode === 'league') {
    let pairsCount = options.numPairs ?? null;
    if ((pairsCount == null || pairsCount <= 0) && options.leagueTeamCount) {
      pairsCount = Math.max(1, Math.floor(options.leagueTeamCount / 2));
    }
    const teamCount = options.leagueTeamCount
      ? Math.trunc(options.leagueTeamCount)
      : (pairsCount ?? 0) * 2;
    const { assignedLane } = leagueAssignmentForGame({
      startLane,
      gameNumber: options.gameNumber,
      teamCount,
      intervalGames: options.intervalGames,
      pairsInPlay: options.pairsInPlay,
      wrapPairOffset: options.leagueWrapPairOffset,
    });
    return assignedLane;
  }
  const preferLeft = startLane % 2 === 1;
  return preferLeft ? pair[0] : pair[1];
}

export function buildMovementPreviewSchedule(input: {
  startLane: number;
  gameCount: number;
  movementMode: string;
  stepPairs: number;
  intervalGames: number;
  staggeredSteps?: number[];
  leagueTeamCount?: number | null;
  leagueWrapPairOffset?: number | null;
  numPairs: number;
  pairsInPlay?: Array<[number, number]>;
  splitHouse?: boolean;
  splitAfterPairLow?: number | null;
}): MovementPreviewRow[] {
  const startLane = Math.max(1, Math.trunc(input.startLane));
  const openingPair = normalizeLanePair(startLane);
  const gameCount = Math.max(1, Math.min(48, Math.trunc(input.gameCount)));
  const rows: MovementPreviewRow[] = [];

  for (let gameNumber = 1; gameNumber <= gameCount; gameNumber += 1) {
    const pair = calculatePairForGame(openingPair, gameNumber, input.movementMode, input.stepPairs, {
      intervalGames: input.intervalGames,
      staggeredSteps: input.staggeredSteps,
      leagueTeamCount: input.leagueTeamCount,
      leagueWrapPairOffset: input.leagueWrapPairOffset,
      numPairs: input.numPairs,
      startLane,
      pairsInPlay: input.pairsInPlay,
      splitHouse: input.splitHouse,
      splitAfterPairLow: input.splitAfterPairLow,
    });
    const assignedLane = resolveAssignedLane(startLane, pair, {
      movementMode: input.movementMode,
      gameNumber,
      intervalGames: input.intervalGames,
      numPairs: input.numPairs,
      leagueTeamCount: input.leagueTeamCount,
      leagueWrapPairOffset: input.leagueWrapPairOffset,
      stepPairs: input.stepPairs,
      staggeredSteps: input.staggeredSteps,
      openingPair,
      pairsInPlay: input.pairsInPlay,
      splitHouse: input.splitHouse,
      splitAfterPairLow: input.splitAfterPairLow,
    });
    rows.push({
      game_number: gameNumber,
      pair_low: pair[0],
      pair_high: pair[1],
      pair_label: `${pair[0]}/${pair[1]}`,
      assigned_lane: assignedLane,
    });
  }
  return rows;
}
