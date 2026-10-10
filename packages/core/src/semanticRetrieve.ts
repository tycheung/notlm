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
  /**
   * Optional layer tag for multi-index retrieve.
   * Convention: `base` = regenerable from pack FAQ/queries;
   * `custom` = host/training overlay (never overwritten by `pack embed-index`).
   */
  layer?: 'base' | 'custom' | string;
  /** SHA of FAQ/query source texts (stamped by training embed rebuild). */
  sourceDigest?: string;
};

/** Host pack filenames (under `.notlm/pack/`). */
export const SEMANTIC_INDEX_BASE_FILE = 'semantic-index.json';
export const SEMANTIC_INDEX_CUSTOM_FILE = 'semantic-index.custom.json';

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
    // Aliases + body only — do not embed opaque ids (pollutes hashed n-grams).
    const texts = [...(entry.aliases ?? []), (entry.text ?? '').slice(0, 160)]
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
    const texts = [q.title ?? '', ...(q.aliases ?? [])]
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
  if (!features || features.semanticRetrieve === undefined) return true;
  return Boolean(features.semanticRetrieve);
}

/**
 * Normalize one or more indexes into retrieve layers (skips empty).
 * Prefer this over concatenating docs when the same faqId appears in base + custom
 * with different utterance vectors — live scoring keeps the best match per id.
 */
export function semanticIndexLayers(
  ...indexes: Array<SemanticIndex | null | undefined>
): SemanticIndex[] {
  return indexes.filter((idx): idx is SemanticIndex => Boolean(idx?.docs?.length));
}

/**
 * Flatten layers into one index for hosts that need a single artifact.
 * Later layers win on the same `kind:id` (custom over base).
 * Prefer {@link retrieveSemantic} with multiple layers for live combine.
 */
export function mergeSemanticIndexes(
  ...indexes: Array<SemanticIndex | null | undefined>
): SemanticIndex | undefined {
  const layers = semanticIndexLayers(...indexes);
  if (!layers.length) return undefined;
  const dim = layers[0]!.dim || DEFAULT_SEMANTIC_DIM;
  const byKey = new Map<string, SemanticDoc>();
  for (const layer of layers) {
    for (const doc of layer.docs) {
      if (!doc?.id || !doc.vector?.length) continue;
      byKey.set(`${doc.kind}:${doc.id}`, doc);
    }
  }
  const docs = [...byKey.values()].filter(
    (d) => d.vector?.length === dim
  );
  return {
    version: SEMANTIC_INDEX_VERSION,
    dim,
    docs,
    layer: layers.length > 1 ? 'merged' : layers[0]!.layer,
  };
}

function candidateScore(c: SemanticCandidate): number {
  return c.similarity + c.tokenOverlap * 0.35;
}

/**
 * Semantic retrieve over one index or several layers combined at live score time.
 * When the same id appears in base + custom, the stronger similarity/overlap wins.
 */
export function retrieveSemantic(
  utterance: string,
  index: SemanticIndex | SemanticIndex[] | null | undefined,
  opts?: SemanticRetrieveOpts
): SemanticRetrieveResult {
  const trimmed = (utterance ?? '').trim();
  const layers = Array.isArray(index)
    ? semanticIndexLayers(...index)
    : semanticIndexLayers(index);
  if (!trimmed || !layers.length) {
    return { candidates: [], accepted: null };
  }
  const dim = layers[0]!.dim || DEFAULT_SEMANTIC_DIM;
  const qVec = embedText(trimmed, dim);
  const topK = opts?.topK ?? DEFAULT_SEMANTIC_TOP_K;
  const minSim = opts?.minSimilarity ?? DEFAULT_MIN_SIMILARITY;
  const minOverlap = opts?.minTokenOverlap ?? DEFAULT_MIN_TOKEN_OVERLAP;
  const kind = opts?.kind;

  const bestByKey = new Map<string, SemanticCandidate>();
  let warnedDim = false;
  for (const layer of layers) {
    const layerDim = layer.dim || DEFAULT_SEMANTIC_DIM;
    if (layerDim !== dim) {
      if (
        !warnedDim &&
        typeof console !== 'undefined' &&
        typeof console.warn === 'function'
      ) {
        console.warn(
          `[notlm] skipping semantic layer dim=${layerDim} (query dim=${dim})`
        );
        warnedDim = true;
      }
      continue;
    }
    for (const doc of layer.docs) {
      if (kind && doc.kind !== kind) continue;
      if (!doc.vector?.length || doc.vector.length !== dim) continue;
      const similarity = cosineSimilarity(qVec, doc.vector);
      const tokenOverlap = bestTokenOverlap(trimmed, doc.texts, opts?.heuristics);
      const next: SemanticCandidate = {
        id: doc.id,
        kind: doc.kind,
        similarity,
        tokenOverlap,
      };
      const key = `${doc.kind}:${doc.id}`;
      const prev = bestByKey.get(key);
      if (!prev || candidateScore(next) > candidateScore(prev)) {
        bestByKey.set(key, next);
      }
    }
  }
  const scored = [...bestByKey.values()];
  scored.sort((a, b) => candidateScore(b) - candidateScore(a));
  const candidates = scored.slice(0, topK);
  const hasContent = contentTokens(trimmed, opts?.heuristics).length >= 2;
  const accepted = hasContent
    ? (candidates.find(
        (c) => c.similarity >= minSim && c.tokenOverlap >= minOverlap
      ) ?? null)
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
