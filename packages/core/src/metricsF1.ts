/**
 * Binary / micro F1 helpers for NLU evaluation (training + gates).
 * Generic — no host/product strings.
 */

export type BinaryConfusion = {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
};

export type F1Score = {
  precision: number;
  recall: number;
  f1: number;
  /** tp + fp + fn (+ tn for support reporting). */
  support: number;
  confusion: BinaryConfusion;
};

export function emptyConfusion(): BinaryConfusion {
  return { tp: 0, fp: 0, fn: 0, tn: 0 };
}

export function addConfusion(
  a: BinaryConfusion,
  b: BinaryConfusion
): BinaryConfusion {
  return {
    tp: a.tp + b.tp,
    fp: a.fp + b.fp,
    fn: a.fn + b.fn,
    tn: a.tn + b.tn,
  };
}

/**
 * Precision / recall / F1 from confusion counts.
 * Undefined ratios become 0 when denominators are 0 (no support).
 */
export function f1FromConfusion(c: BinaryConfusion): F1Score {
  const precision = c.tp + c.fp > 0 ? c.tp / (c.tp + c.fp) : 0;
  const recall = c.tp + c.fn > 0 ? c.tp / (c.tp + c.fn) : 0;
  const f1 =
    precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;
  return {
    precision,
    recall,
    f1,
    support: c.tp + c.fp + c.fn + c.tn,
    confusion: { ...c },
  };
}

/**
 * Classify one prediction against a binary gold label.
 * `goldPositive` = should fire; `predPositive` = did fire.
 */
export function confusionForBinary(
  goldPositive: boolean,
  predPositive: boolean
): BinaryConfusion {
  if (goldPositive && predPositive) return { tp: 1, fp: 0, fn: 0, tn: 0 };
  if (!goldPositive && predPositive) return { tp: 0, fp: 1, fn: 0, tn: 0 };
  if (goldPositive && !predPositive) return { tp: 0, fp: 0, fn: 1, tn: 0 };
  return { tp: 0, fp: 0, fn: 0, tn: 1 };
}

/**
 * Multi-class micro confusion for a single example.
 * - goldLabel null + pred null → TN
 * - goldLabel null + pred set → FP
 * - goldLabel set + pred === gold → TP
 * - goldLabel set + pred null → FN
 * - goldLabel set + pred !== gold → FP + FN
 */
export function confusionForLabelMatch(
  goldLabel: string | null | undefined,
  predLabel: string | null | undefined
): BinaryConfusion {
  const gold = goldLabel?.trim() || null;
  const pred = predLabel?.trim() || null;
  if (!gold && !pred) return { tp: 0, fp: 0, fn: 0, tn: 1 };
  if (!gold && pred) return { tp: 0, fp: 1, fn: 0, tn: 0 };
  if (gold && !pred) return { tp: 0, fp: 0, fn: 1, tn: 0 };
  if (gold && pred && gold === pred) return { tp: 1, fp: 0, fn: 0, tn: 0 };
  return { tp: 0, fp: 1, fn: 1, tn: 0 };
}
