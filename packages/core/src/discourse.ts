import { normalizeAsk } from './askNormalize.js';
import {
  anyReTest,
  DEFAULT_HEURISTICS,
  type CompiledHeuristics,
} from './heuristics.js';
import type { DiscourseState, StepId } from './types.js';

export type DiscourseResolution =
  | { kind: 'none'; text: string }
  | { kind: 'step'; text: string; stepId: StepId }
  | { kind: 'entity'; text: string; name: string }
  | { kind: 'repair_slot'; text: string; slotHint?: string }
  | { kind: 'undo'; text: string }
  | { kind: 'choice_index'; text: string; index: number }
  | { kind: 'clarify_choice'; text: string };

function resolveH(h?: CompiledHeuristics | null): CompiledHeuristics {
  return h ?? DEFAULT_HEURISTICS;
}

/**
 * Resolve light anaphora / repair against discourse before NLU.
 * Pattern lists come from compiled pack heuristics (platform + overlay).
 */
export function resolveDiscourse(
  utterance: string,
  discourse: DiscourseState | undefined,
  heuristics?: CompiledHeuristics | null
): DiscourseResolution {
  const h = resolveH(heuristics).discourse;
  const raw = utterance.trim();
  if (!raw) return { kind: 'none', text: raw };
  // Strip leading/trailing fillers so "kindly the other one in app" still resolves.
  let text = normalizeAsk(raw, heuristics) || raw;
  for (let i = 0; i < 4; i++) {
    let next = text;
    if (h.lead) next = next.replace(h.lead, '');
    if (h.trail) next = next.replace(h.trail, '');
    next = next.trim();
    if (next === text) break;
    text = next;
  }
  if (!text) text = normalizeAsk(raw, heuristics) || raw;

  if (anyReTest(h.undo, text) || anyReTest(h.undo, raw)) {
    return { kind: 'undo', text: raw };
  }

  if (h.renameTo) {
    const renameTo = raw.match(h.renameTo);
    if (renameTo?.[1]) {
      return { kind: 'repair_slot', text: raw, slotHint: renameTo[1].trim() };
    }
  }
  if (h.repairNameValue) {
    const rename = raw.match(h.repairNameValue);
    if (rename?.[1]) {
      return { kind: 'repair_slot', text: raw, slotHint: rename[1].trim() };
    }
  }
  if (anyReTest(h.repairName, text) || anyReTest(h.repairName, raw)) {
    return { kind: 'repair_slot', text: raw };
  }

  // Dollar amounts ("$30 pot") must never be read as numbered menu picks.
  const hasMoneyAmount = /\$\s*\d|\b\d+\s*(?:dollars?|bucks)\b/i.test(raw);
  if (h.choiceIndex && !hasMoneyAmount) {
    const choiceMatch = text.match(h.choiceIndex) ?? raw.match(h.choiceIndex);
    if (choiceMatch?.[1]) {
      const idx = h.indexWords[choiceMatch[1].toLowerCase()];
      if (idx != null) {
        if (discourse?.lastChoiceIds && discourse.lastChoiceIds.length > idx) {
          return {
            kind: 'step',
            text: raw,
            stepId: discourse.lastChoiceIds[idx]!,
          };
        }
        return { kind: 'choice_index', text: raw, index: idx };
      }
    }
  }

  if (
    anyReTest(h.other, text) ||
    anyReTest(h.other, raw) ||
    anyReTest(h.meantOther, text) ||
    anyReTest(h.meantOther, raw)
  ) {
    if (discourse?.lastChoiceIds && discourse.lastChoiceIds.length >= 2) {
      return { kind: 'step', text: raw, stepId: discourse.lastChoiceIds[1]! };
    }
    return { kind: 'clarify_choice', text: raw };
  }

  if (!discourse) return { kind: 'none', text: raw };

  if (
    (anyReTest(h.again, text) || anyReTest(h.thatStep, text)) &&
    discourse.lastStepId
  ) {
    return { kind: 'step', text: raw, stepId: discourse.lastStepId };
  }

  if (anyReTest(h.entity, text) && discourse.lastEntityName) {
    return {
      kind: 'entity',
      text: `show ${discourse.lastEntityName}`,
      name: discourse.lastEntityName,
    };
  }

  return { kind: 'none', text: raw };
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

/**
 * Salvage multiple slot-like values from one utterance (key=value, “quoted”,
 * “called X”, pack slotExtractors). Domain keys / patterns come from heuristics.
 */
export function extractMultiSlotPatches(
  utterance: string,
  knownKeys: string[] = [],
  heuristics?: CompiledHeuristics | null
): Record<string, string> {
  const slots: Record<string, string> = {};
  const text = utterance.trim();
  if (!text) return slots;

  for (const m of text.matchAll(/\b([a-zA-Z_][\w]*)\s*[:=]\s*["']?([^"'`,]+?)["']?(?=$|,|;|\s{2})/g)) {
    const key = m[1]?.toLowerCase();
    const val = m[2]?.trim();
    if (key && val) slots[key] = val;
  }

  const called = text.match(
    /\b(?:called|named|name(?:\s+it)?|it(?:'s| is))\s+["']?([^"',]+?)["']?(?=$|,|;|\s+with\b|\s+at\b)/i
  );
  if (called?.[1]) {
    const nameKey =
      knownKeys.find((k) => k === 'name' || k.endsWith('_name') || k === 'title') ?? 'name';
    slots[nameKey] = called[1].trim();
  }

  const extractors = resolveH(heuristics).discourse.slotExtractors;
  for (const ex of extractors) {
    const allowed =
      knownKeys.length === 0
        ? ex.allowWithoutKeys
        : knownKeys.includes(ex.slotKey) ||
          (ex.altKeys?.some((k) => knownKeys.includes(k)) ?? false);
    if (!allowed) continue;
    const m = text.match(ex.pattern);
    if (!m) continue;
    const val = (ex.value ?? m[1]?.trim())?.trim();
    if (!val) continue;
    let key = ex.slotKey;
    if (knownKeys.length && !knownKeys.includes(key) && ex.altKeys?.length) {
      const alt = ex.altKeys.find((k) => knownKeys.includes(k));
      if (alt) key = alt;
      else continue;
    }
    slots[key] = val;
  }

  // Bare answer with a single known required key left → map whole utterance.
  if (Object.keys(slots).length === 0 && knownKeys.length === 1) {
    const only = extractSlotAnswer(text);
    if (only) slots[knownKeys[0]!] = only;
  }

  return slots;
}
