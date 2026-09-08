import type { Bracket } from './bracketEngine/types';

type BracketLike = Pick<Bracket, 'id'> & { bracket_number?: number };

/** Event-wide display number for a pool-local bracket (storage id stays 0..N-1). */
export function displayBracketNumber(
  bracket: BracketLike,
  bracketNumberOffset = 0,
  index = 0
): number {
  const annotated = Number(bracket.bracket_number);
  if (Number.isFinite(annotated) && annotated > 0) {
    return annotated;
  }
  const localId = Number.isFinite(Number(bracket.id)) ? Number(bracket.id) : index;
  return localId + 1 + Math.max(0, Number(bracketNumberOffset) || 0);
}

export function displayBracketNumbersForList(
  brackets: BracketLike[],
  bracketNumberOffset = 0
): number[] {
  return brackets.map((bracket, index) =>
    displayBracketNumber(bracket, bracketNumberOffset, index)
  );
}
