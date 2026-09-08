import type { DiscourseState, StepId } from './types.js';

export type DiscourseResolution =
  | { kind: 'none'; text: string }
  | { kind: 'step'; text: string; stepId: StepId }
  | { kind: 'entity'; text: string; name: string };

const AGAIN =
  /^(do\s+)?(that|it|the same)(\s+again)?[.!?]*$/i;
const THAT_STEP =
  /^(that(\s+one)?|the (last|previous) (one|step)|again)[.!?]*$/i;
const OTHER =
  /^(the )?other(\s+one)?[.!?]*$/i;
const THAT_ENTITY =
  /^(that|the same)\s+(list|contact|item|one)[.!?]*$/i;

/**
 * Resolve light anaphora against discourse before NLU.
 * Returns rewritten text and/or a direct step/entity target.
 */
export function resolveDiscourse(
  utterance: string,
  discourse: DiscourseState | undefined
): DiscourseResolution {
  const text = utterance.trim();
  if (!text || !discourse) return { kind: 'none', text };

  if (OTHER.test(text) && discourse.lastChoiceIds && discourse.lastChoiceIds.length >= 2) {
    return { kind: 'step', text, stepId: discourse.lastChoiceIds[1]! };
  }

  if ((AGAIN.test(text) || THAT_STEP.test(text)) && discourse.lastStepId) {
    return { kind: 'step', text, stepId: discourse.lastStepId };
  }

  if (THAT_ENTITY.test(text) && discourse.lastEntityName) {
    return {
      kind: 'entity',
      text: `show ${discourse.lastEntityName}`,
      name: discourse.lastEntityName,
    };
  }

  return { kind: 'none', text };
}

/** Naive slot value from a follow-up answer (“Shopping”, “called Errands”). */
export function extractSlotAnswer(utterance: string): string {
  const trimmed = utterance.trim().replace(/^["']|["']$/g, '');
  const named = trimmed.match(
    /^(?:it(?:'s| is)|named|called|name(?:\s+it)?|use)\s+(.+)$/i
  );
  if (named?.[1]) return named[1].trim().replace(/^["']|["']$/g, '');
  return trimmed;
}
