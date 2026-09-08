import type { DiagramMatch, DiagramParticipant } from './types';

export function isStepladderMatchComplete(match: DiagramMatch): boolean {
  if (match.winnerSide === 0 || match.winnerSide === 1) return true;
  return String(match.status || '').toLowerCase() === 'complete';
}

export function stepladderMatchBothSidesReady(match: DiagramMatch): boolean {
  return match.participants[0].sideId != null && match.participants[1].sideId != null;
}

/**
 * Classic climb: first incomplete match with both sides seated is the open
 * rung for new scoring. Completed prior matches stay editable for corrections.
 */
export function resolveActiveStepladderMatchIndex(matches: DiagramMatch[]): number | null {
  const idx = matches.findIndex(
    (m) => stepladderMatchBothSidesReady(m) && !isStepladderMatchComplete(m)
  );
  return idx >= 0 ? idx : null;
}

function lockParticipantScores(participant: DiagramParticipant): DiagramParticipant {
  return {
    ...participant,
    scores: participant.scores.map((cell) => ({ ...cell, disabled: true })),
  };
}

/**
 * Climb scoring: the open match accepts scores, and completed prior matches
 * stay editable for typo/corrections. Future rungs stay locked until seated.
 */
export function applyStepladderScoringLocks(matches: DiagramMatch[]): {
  matches: DiagramMatch[];
  activeIndex: number | null;
} {
  const activeIndex = resolveActiveStepladderMatchIndex(matches);
  return {
    activeIndex,
    matches: matches.map((match, idx) => {
      const isActive = activeIndex !== null && idx === activeIndex;
      if (isActive || isStepladderMatchComplete(match)) return match;
      return {
        ...match,
        participants: [
          lockParticipantScores(match.participants[0]),
          lockParticipantScores(match.participants[1]),
        ],
      };
    }),
  };
}

export function stepladderActiveMatchLabel(
  matches: DiagramMatch[],
  activeIndex: number | null
): string | null {
  if (activeIndex == null) return null;
  const match = matches[activeIndex];
  if (!match) return null;
  const a = match.participants[0]?.name ?? 'TBD';
  const b = match.participants[1]?.name ?? 'TBD';
  const label = match.label?.trim() || `Match ${activeIndex + 1}`;
  return `${label}: ${a} vs ${b}`;
}
