import {
  COLUMN_HEADER_HEIGHT,
  CONNECTOR_WIDTH,
  MATCH_BLOCK_HEIGHT,
  MATCH_GAP,
} from './constants';

export type LineSegment = { x1: number; y1: number; x2: number; y2: number };

export function matchTop(index: number): number {
  return COLUMN_HEADER_HEIGHT + index * (MATCH_BLOCK_HEIGHT + MATCH_GAP);
}

export function matchCenterY(index: number): number {
  return matchTop(index) + MATCH_BLOCK_HEIGHT / 2;
}

export function feederLines(feederA: number, feederB: number): LineSegment[] {
  const yA = matchCenterY(feederA);
  const yB = matchCenterY(feederB);
  const yOut = (yA + yB) / 2;
  const midX = CONNECTOR_WIDTH / 2;

  return [
    { x1: 0, y1: yA, x2: midX, y2: yA },
    { x1: 0, y1: yB, x2: midX, y2: yB },
    { x1: midX, y1: yA, x2: midX, y2: yB },
    { x1: midX, y1: yOut, x2: CONNECTOR_WIDTH, y2: yOut },
  ];
}

export function buildRoundToRoundLines(
  sourceMatchCount: number,
  targetMatchCount: number
): LineSegment[] {
  const lines: LineSegment[] = [];
  for (let index = 0; index < targetMatchCount; index++) {
    const feederA = index * 2;
    const feederB = index * 2 + 1;
    if (feederB < sourceMatchCount) {
      lines.push(...feederLines(feederA, feederB));
    } else if (feederA < sourceMatchCount) {
      const y = matchCenterY(feederA);
      lines.push({ x1: 0, y1: y, x2: CONNECTOR_WIDTH, y2: y });
    }
  }
  return lines;
}

export function matchCenterFromTop(top: number): number {
  return top + MATCH_BLOCK_HEIGHT / 2;
}

export function computeNextRoundTops(prevTops: number[]): number[] {
  if (prevTops.length === 0) return [];
  const nextCount = Math.ceil(prevTops.length / 2);
  return Array.from({ length: nextCount }, (_, index) => {
    const a = prevTops[index * 2];
    const b = prevTops[index * 2 + 1];
    if (a == null) return matchTop(0);
    if (b == null) return a;
    return (matchCenterFromTop(a) + matchCenterFromTop(b)) / 2 - MATCH_BLOCK_HEIGHT / 2;
  });
}

export function buildConnectorLinesFromTops(
  sourceTops: number[],
  targetTops: number[]
): LineSegment[] {
  const lines: LineSegment[] = [];
  const midX = CONNECTOR_WIDTH / 2;
  for (let index = 0; index < targetTops.length; index++) {
    const a = sourceTops[index * 2];
    const b = sourceTops[index * 2 + 1];
    const yOut = matchCenterFromTop(targetTops[index]);
    if (a != null && b != null) {
      const yA = matchCenterFromTop(a);
      const yB = matchCenterFromTop(b);
      lines.push(
        { x1: 0, y1: yA, x2: midX, y2: yA },
        { x1: 0, y1: yB, x2: midX, y2: yB },
        { x1: midX, y1: yA, x2: midX, y2: yB },
        { x1: midX, y1: yOut, x2: CONNECTOR_WIDTH, y2: yOut }
      );
    } else if (a != null) {
      const y = matchCenterFromTop(a);
      lines.push({ x1: 0, y1: y, x2: CONNECTOR_WIDTH, y2: y });
    } else {
      lines.push({ x1: 0, y1: yOut, x2: CONNECTOR_WIDTH, y2: yOut });
    }
  }
  return lines;
}

export function computeBracketPositions(matchCount: number): number[] {
  if (matchCount <= 0) return [];
  const prevTops = Array.from({ length: matchCount * 2 }, (_, index) => matchTop(index));
  return computeNextRoundTops(prevTops);
}

export function computeFinalTop(positions: number[]): number {
  if (positions.length === 0) return matchTop(0);
  if (positions.length === 1) return positions[0];
  const top = positions[0] + MATCH_BLOCK_HEIGHT / 2;
  const bottom = positions[1] + MATCH_BLOCK_HEIGHT / 2;
  return (top + bottom) / 2 - MATCH_BLOCK_HEIGHT / 2;
}

export function bracketCanvasHeight(firstRoundMatchCount: number): number {
  const count = Math.max(firstRoundMatchCount, 1);
  return COLUMN_HEADER_HEIGHT + count * MATCH_BLOCK_HEIGHT + (count - 1) * MATCH_GAP;
}
