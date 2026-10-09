/**
 * Generic System One semantic retrieve over pack FAQ / query texts.
 * Hashed char n-gram embeddings (no host brand, no cloud). High-bar accept
 * for auto-answer; otherwise top-k ids constrain Laya/LLM faqIds.
 */
import {
  aliasContentCoverage,
  contentTokens,
  normalizeAsk,
} from './askNormalize.js';
import type { FaqEntry } from './types.js';
import type { QueryDef } from './capabilityCatalog.js';
import type { CompiledHeuristics } from './heuristics.js';
import type { AssistantFeatures } from './types.js';

const FNV_OFFSET = 2166136261;
export const SEMANTIC_INDEX_VERSION = 1 as const;
export const DEFAULT_SEMANTIC_DIM = 256;
export const DEFAULT_SEMANTIC_TOP_K = 8;
/** Cosine similarity floor for auto-accept (System One). */
export const DEFAULT_MIN_SIMILARITY = 0.72;
/** Token overlap floor (aliasContentCoverage) for auto-accept. */
export const DEFAULT_MIN_TOKEN_OVERLAP = 0.55;

export type SemanticDocKind = 'faq' | 'query';

export type SemanticDoc = {
  id: string;
  kind: SemanticDocKind;
  /** Representative texts used to build the vector (aliases + body snippet). */
  texts: string[];
  /** L2-normalized hashed n-gram vector. */
  vector: number[];
};

export type SemanticIndex = {
  version: typeof SEMANTIC_INDEX_VERSION;
  dim: number;
  docs: SemanticDoc[];
};

export type SemanticCandidate = {
  id: string;
  kind: SemanticDocKind;
  similarity: number;
  tokenOverlap: number;
};

export type SemanticRetrieveResult = {
  candidates: SemanticCandidate[];
  /** Present only when similarity + token overlap clear the accept bar. */
  accepted: SemanticCandidate | null;
};

export type SemanticRetrieveOpts = {
  topK?: number;
  minSimilarity?: number;
  minTokenOverlap?: number;
  heuristics?: CompiledHeuristics | null;
  /** Restrict to one kind. */
  kind?: SemanticDocKind;
};

function hashToken(token: string, dim: number): number {
  let h = FNV_OFFSET;
  for (let i = 0; i < token.length; i += 1) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % dim;
}

/** Char n-gram bag-of-hashes (signed ±1), L2-normalized. */
export function embedText(
  raw: string,
  dim: number = DEFAULT_SEMANTIC_DIM,
  ngrams: number[] = [2, 3, 4]
): Float32Array {
  const text = `^${normalizeAsk(raw)}$`;
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
  let norm = 0;
  for (let i = 0; i < dim; i += 1) norm += (vec[i] ?? 0) ** 2;
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dim; i += 1) vec[i] = (vec[i] ?? 0) / norm;
  return vec;
}

export function cosineSimilarity(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i += 1) dot += (a[i] ?? 0) * (b[i] ?? 0);
  return dot;
}

function meanVector(vectors: Float32Array[], dim: number): number[] {
  const acc = new Float32Array(dim);
  for (const v of vectors) {
    for (let i = 0; i < dim; i += 1) acc[i] = (acc[i] ?? 0) + (v[i] ?? 0);
  }
  const scale = vectors.length || 1;
  let norm = 0;
  for (let i = 0; i < dim; i += 1) {
    const scaled = (acc[i] ?? 0) / scale;
    acc[i] = scaled;
    norm += scaled ** 2;
  }
  norm = Math.sqrt(norm) || 1;
  const out = new Array<number>(dim);
  for (let i = 0; i < dim; i += 1) out[i] = (acc[i] ?? 0) / norm;
  return out;
}

function bestTokenOverlap(
  utterance: string,
  texts: string[],
  heuristics?: CompiledHeuristics | null
): number {
  let best = 0;
  for (const t of texts) {
    const cov = aliasContentCoverage(utterance, t, heuristics);
    if (cov > best) best = cov;
  }
  return best;
}

export function buildSemanticIndex(opts: {
  faq?: FaqEntry[] | null;
  queries?: QueryDef[] | null;
  dim?: number;
}): SemanticIndex {
  const dim = opts.dim ?? DEFAULT_SEMANTIC_DIM;
  const docs: SemanticDoc[] = [];

  for (const entry of opts.faq ?? []) {
    if (!entry?.id) continue;
    const texts = [
      entry.id,
      ...(entry.aliases ?? []),
      (entry.text ?? '').slice(0, 160),
    ]
      .map((t) => String(t).trim())
      .filter(Boolean);
    if (!texts.length) continue;
    const vectors = texts.slice(0, 24).map((t) => embedText(t, dim));
    docs.push({
      id: entry.id,
      kind: 'faq',
      texts: texts.slice(0, 24),
      vector: meanVector(vectors, dim),
    });
  }

  for (const q of opts.queries ?? []) {
    if (!q?.id) continue;
    const texts = [q.id, q.title ?? '', ...(q.aliases ?? [])]
      .map((t) => String(t).trim())
      .filter(Boolean);
    if (!texts.length) continue;
    const vectors = texts.slice(0, 24).map((t) => embedText(t, dim));
    docs.push({
      id: q.id,
      kind: 'query',
      texts: texts.slice(0, 24),
      vector: meanVector(vectors, dim),
    });
  }

  return { version: SEMANTIC_INDEX_VERSION, dim, docs };
}

export function isSemanticRetrieveEnabled(
  features?: AssistantFeatures | null
): boolean {
  if (!features) return true;
  if (features.semanticRetrieve === false) return false;
  return features.semanticRetrieve !== undefined
    ? Boolean(features.semanticRetrieve)
    : true;
}

export function retrieveSemantic(
  utterance: string,
  index: SemanticIndex | null | undefined,
  opts?: SemanticRetrieveOpts
): SemanticRetrieveResult {
  const trimmed = (utterance ?? '').trim();
  if (!trimmed || !index?.docs?.length) {
    return { candidates: [], accepted: null };
  }
  const dim = index.dim || DEFAULT_SEMANTIC_DIM;
  const qVec = embedText(trimmed, dim);
  const topK = opts?.topK ?? DEFAULT_SEMANTIC_TOP_K;
  const minSim = opts?.minSimilarity ?? DEFAULT_MIN_SIMILARITY;
  const minOverlap = opts?.minTokenOverlap ?? DEFAULT_MIN_TOKEN_OVERLAP;
  const kind = opts?.kind;

  const scored: SemanticCandidate[] = [];
  for (const doc of index.docs) {
    if (kind && doc.kind !== kind) continue;
    if (!doc.vector?.length) continue;
    const similarity = cosineSimilarity(qVec, doc.vector);
    const tokenOverlap = bestTokenOverlap(trimmed, doc.texts, opts?.heuristics);
    scored.push({
      id: doc.id,
      kind: doc.kind,
      similarity,
      tokenOverlap,
    });
  }
  scored.sort((a, b) => {
    const sa = a.similarity + a.tokenOverlap * 0.35;
    const sb = b.similarity + b.tokenOverlap * 0.35;
    return sb - sa;
  });
  const candidates = scored.slice(0, topK);
  const top = candidates[0];
  const accepted =
    top &&
    top.similarity >= minSim &&
    top.tokenOverlap >= minOverlap &&
    contentTokens(trimmed, opts?.heuristics).length >= 2
      ? top
      : null;
  return { candidates, accepted };
}

/** FAQ ids from retrieve candidates (for constrained Laya/LLM). */
export function semanticFaqIdHints(
  result: SemanticRetrieveResult,
  max = DEFAULT_SEMANTIC_TOP_K
): string[] {
  return result.candidates
    .filter((c) => c.kind === 'faq')
    .slice(0, max)
    .map((c) => c.id);
}
