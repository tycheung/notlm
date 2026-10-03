import { normalizeUtterance } from '@notlm/core';

const FNV_OFFSET = 2166136261;

/** Stable FNV-1a hash → bucket in [0, dim). */
export function hashToken(token: string, dim: number): number {
  let h = FNV_OFFSET;
  for (let i = 0; i < token.length; i += 1) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % dim;
}

/** Char n-gram bag-of-hashes (signed ±1) into a dense float vector. */
export function featurizeUtterance(
  raw: string,
  dim: number,
  ngrams: number[] = [2, 3, 4]
): Float32Array {
  const text = `^${normalizeUtterance(raw)}$`;
  const vec = new Float32Array(dim);
  for (const n of ngrams) {
    if (n < 1 || text.length < n) continue;
    for (let i = 0; i <= text.length - n; i += 1) {
      const gram = text.slice(i, i + n);
      const bucket = hashToken(`${n}:${gram}`, dim);
      const sign = hashToken(`s:${n}:${gram}`, 2) === 0 ? 1 : -1;
      vec[bucket] = (vec[bucket] ?? 0) + sign;
    }
  }
  // L2 normalize for stable logits
  let norm = 0;
  for (let i = 0; i < dim; i += 1) norm += (vec[i] ?? 0) ** 2;
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dim; i += 1) vec[i] = (vec[i] ?? 0) / norm;
  return vec;
}
