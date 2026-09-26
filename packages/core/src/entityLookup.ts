import { editDistance } from './fuzzyText.js';
import { normalizeUtterance, stripSurfaceNoise } from './normalizeConfig.js';
import type {
  LookupDef,
  LookupMatchResult,
  NormalizeConfig,
  RuntimeContextBase,
} from './types.js';

function readDataPath(data: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.').filter(Boolean);
  let cur: unknown = data;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object' || Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function asEntityRows(
  raw: unknown,
  nameKey: string,
  idKey: string
): Array<{ id: string; name: string }> {
  if (!Array.isArray(raw)) return [];
  const out: Array<{ id: string; name: string }> = [];
  for (const row of raw) {
    if (row == null || typeof row !== 'object' || Array.isArray(row)) continue;
    const rec = row as Record<string, unknown>;
    const id = rec[idKey];
    const name = rec[nameKey];
    if (typeof id === 'string' && id && typeof name === 'string' && name.trim()) {
      out.push({ id, name: name.trim() });
    }
  }
  return out;
}

function looksLikeLookup(normalized: string, def: LookupDef): boolean {
  const hints = def.utteranceHints ?? [
    'show me',
    'open',
    'find',
    'go to',
    'where is',
  ];
  const entities = def.entityWords ?? [];
  const hasHint = hints.some((h) => normalized.includes(h.toLowerCase()));
  const hasEntity =
    entities.length === 0 || entities.some((w) => normalized.includes(w.toLowerCase()));
  return hasHint && hasEntity;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripConfiguredNoise(rest: string, normalize?: NormalizeConfig | null): string {
  let t = stripSurfaceNoise(rest, normalize);
  const fillers = normalize?.trailingFillers ?? [];
  const leading = normalize?.leadingPoliteness ?? [];
  for (const p of [...fillers].sort((a, b) => b.length - a.length)) {
    if (!p.trim()) continue;
    const parts = p.trim().split(/\s+/).map(escapeRe);
    t = t.replace(new RegExp(`\\b${parts.join('\\s+')}\\b`, 'gi'), ' ');
  }
  for (const p of [...leading].sort((a, b) => b.length - a.length)) {
    if (!p.trim()) continue;
    t = t.replace(
      new RegExp(`^(?:${escapeRe(p).replace(/\s+/g, '\\s+')})\\s+`, 'i'),
      ''
    );
  }
  return t.replace(/\s+/g, ' ').trim();
}

/** Pull a name candidate after a hint phrase, stripping trailing entity words. */
export function extractLookupName(
  raw: string,
  def: LookupDef,
  normalize?: NormalizeConfig | null
): string | null {
  const normalized = normalizeUtterance(raw, normalize);
  const hints = [...(def.utteranceHints ?? [
    'show me',
    'open',
    'find',
    'go to',
    'where is',
  ])].sort((a, b) => b.length - a.length);
  let rest = normalized;
  for (const hint of hints) {
    const h = hint.toLowerCase();
    const idx = rest.indexOf(h);
    if (idx >= 0) {
      rest = rest.slice(idx + h.length).trim();
      break;
    }
  }
  rest = rest.replace(/^(the|a|an)\s+/i, '').trim();
  const entityWords = [...(def.entityWords ?? [])].sort((a, b) => b.length - a.length);
  for (const word of entityWords) {
    const re = new RegExp(`\\b${escapeRe(word)}\\b`, 'gi');
    rest = rest.replace(re, ' ').replace(/\s+/g, ' ').trim();
  }
  rest = stripConfiguredNoise(rest, normalize);
  return rest.length >= 2 ? rest : null;
}

/**
 * True when the leftover “name” is actually a create/goto step ask
 * (“create …”, “new …”) rather than an entity to open from a list.
 */
export function looksLikeStepActionQuery(query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return false;
  return /^(?:create|make|new|start|add|edit|configure|set\s*up|setup)\b/.test(q);
}

function scoreName(query: string, candidate: string): number {
  const q = query.toLowerCase();
  const c = candidate.toLowerCase();
  if (q === c) return 100;
  if (c.includes(q) || q.includes(c)) return 80 + Math.min(q.length, c.length);
  const dist = editDistance(q, c);
  const maxLen = Math.max(q.length, c.length) || 1;
  const ratio = 1 - dist / maxLen;
  if (ratio >= 0.72) return Math.round(ratio * 70);
  return 0;
}

export function resolveGuideId(template: string | undefined, id: string): string | undefined {
  if (!template) return undefined;
  return template.replace(/\{\{\s*id\s*\}\}/gi, id);
}

/**
 * Match utterance against pack lookup defs + host `ctx.data` entity arrays.
 * Returns `none` when the utterance does not look like an entity query.
 */
export function matchEntityLookup(
  raw: string,
  lookups: LookupDef[] | undefined,
  ctx: RuntimeContextBase,
  normalize?: NormalizeConfig | null
): LookupMatchResult {
  if (!lookups?.length) return { kind: 'none' };
  const normalized = normalizeUtterance(raw, normalize);

  for (const def of lookups) {
    if (def.filterPath) {
      const gate = readDataPath(ctx.data, def.filterPath);
      if (!gate) continue;
    }
    if (!looksLikeLookup(normalized, def)) continue;
    const query = extractLookupName(raw, def, normalize);
    if (!query) {
      return { kind: 'miss', lookupId: def.id, query: '' };
    }
    // “open the create tournament form” is a step ask, not an entity name.
    if (looksLikeStepActionQuery(query)) continue;
    let rows = asEntityRows(
      readDataPath(ctx.data, def.dataPath),
      def.nameKey ?? 'name',
      def.idKey ?? 'id'
    );
    if (def.statusField && def.statusAllow?.length) {
      const rawList = readDataPath(ctx.data, def.dataPath);
      if (Array.isArray(rawList)) {
        const allow = new Set(def.statusAllow.map((s) => s.toLowerCase()));
        const idKey = def.idKey ?? 'id';
        const nameKey = def.nameKey ?? 'name';
        rows = [];
        for (const row of rawList) {
          if (row == null || typeof row !== 'object' || Array.isArray(row)) continue;
          const rec = row as Record<string, unknown>;
          const status = rec[def.statusField];
          if (typeof status === 'string' && !allow.has(status.toLowerCase())) continue;
          const id = rec[idKey];
          const name = rec[nameKey];
          if (typeof id === 'string' && id && typeof name === 'string' && name.trim()) {
            rows.push({ id, name: name.trim() });
          }
        }
      }
    }
    if (!rows.length) {
      return { kind: 'miss', lookupId: def.id, query };
    }

    const ranked = rows
      .map((row) => ({ row, score: scoreName(query, row.name) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);

    if (!ranked.length) {
      return { kind: 'miss', lookupId: def.id, query };
    }

    const top = ranked[0]!;
    const tied = ranked.filter((r) => r.score >= top.score - 5).slice(0, 4);
    if (tied.length >= 2 && tied[1]!.score >= top.score - 2) {
      return {
        kind: 'ambiguous',
        lookupId: def.id,
        query,
        candidates: tied.map((t) => ({
          id: t.row.id,
          name: t.row.name,
          guideId: resolveGuideId(def.guideIdTemplate, t.row.id),
          stepId: def.stepId,
        })),
      };
    }

    return {
      kind: 'hit',
      lookupId: def.id,
      query,
      entity: {
        id: top.row.id,
        name: top.row.name,
        guideId: resolveGuideId(def.guideIdTemplate, top.row.id),
        stepId: def.stepId,
      },
    };
  }

  return { kind: 'none' };
}

export function resolveOpenPath(
  template: string | undefined,
  id: string
): string | undefined {
  if (!template) return undefined;
  return template.replace(/\{\{\s*id\s*\}\}/gi, id);
}
