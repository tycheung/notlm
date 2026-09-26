/**
 * Node-only sync FS loader for `.uipilot/pack/*.json`.
 * Browser / SPA hosts should use `loadPackFromJson` with fetched or bundled JSON.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { mergeFaqEntries } from './glossary.js';
import { loadPackFromJson } from './loadPack.js';
import type {
  BinderPredicate,
  FaqEntry,
  LoadedPack,
  LookupDef,
  NormalizeConfig,
  PackJsonInput,
  ReplyBank,
} from './types.js';

export const UIPILOT_DIRNAME = '.uipilot';

const PACK_REQUIRED = ['manifest', 'flow', 'controls', 'intents', 'binders'] as const;

export type LoadUipilotHomeResult = {
  projectRoot: string;
  /** Absolute path to `.uipilot`. */
  home: string;
  packJson: PackJsonInput;
  pack: LoadedPack;
};

function basenameIsUipilot(p: string): boolean {
  const base = p.replace(/[/\\]+$/, '').split(/[/\\]/).pop();
  return base === UIPILOT_DIRNAME;
}

export function resolveUipilotHomeDir(dir: string): { projectRoot: string; home: string } {
  const projectRoot = resolve(dir);
  if (basenameIsUipilot(projectRoot)) {
    return { projectRoot: dirname(projectRoot), home: projectRoot };
  }
  return { projectRoot, home: join(projectRoot, UIPILOT_DIRNAME) };
}

function readJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

/** Normalize on-disk binders (array of `{ stepId, … }` or object map) → PackJsonInput.binders. */
export function normalizeBindersMap(raw: unknown): Record<string, BinderPredicate> {
  if (raw == null) return {};
  if (!Array.isArray(raw)) {
    if (typeof raw === 'object') return raw as Record<string, BinderPredicate>;
    return {};
  }
  const out: Record<string, BinderPredicate> = {};
  for (const entry of raw) {
    if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const { stepId, ...rest } = entry as { stepId?: unknown } & Record<string, unknown>;
    if (typeof stepId !== 'string' || !stepId) continue;
    out[stepId] = rest as BinderPredicate;
  }
  return out;
}

/** Walk up from `start` looking for `packs/_base-en/faq.json`, or use UIPILOT_BASE_FAQ. */
export function resolveBaseFaqPath(start: string): string | null {
  const fromEnv = process.env.UIPILOT_BASE_FAQ?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  let dir = resolve(start);
  for (let i = 0; i < 8; i += 1) {
    const candidate = join(dir, 'packs', '_base-en', 'faq.json');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function readBaseFaq(projectRoot: string): FaqEntry[] | undefined {
  const path = resolveBaseFaqPath(projectRoot);
  if (!path) return undefined;
  const raw = readJsonFile(path);
  return Array.isArray(raw) ? (raw as FaqEntry[]) : undefined;
}

export function loadPackJsonFromUipilotHome(home: string): PackJsonInput {
  const pack = join(home, 'pack');
  const pieces: Record<string, unknown> = {};
  for (const key of PACK_REQUIRED) {
    const path = join(pack, `${key}.json`);
    if (!existsSync(path)) {
      throw new Error(`Missing pack piece: ${path}`);
    }
    pieces[key] = readJsonFile(path);
  }

  const glossaryPath = join(pack, 'glossary.json');
  const glossary = existsSync(glossaryPath) ? readJsonFile(glossaryPath) : undefined;
  const faqPath = join(pack, 'faq.json');
  const productFaq = existsSync(faqPath) ? readJsonFile(faqPath) : undefined;
  const baseFaq = readBaseFaq(dirname(home));
  const lookupsPath = join(pack, 'lookups.json');
  const lookups = existsSync(lookupsPath) ? readJsonFile(lookupsPath) : undefined;
  const repliesPath = join(pack, 'replies.json');
  const replies = existsSync(repliesPath) ? readJsonFile(repliesPath) : undefined;
  const normalizePath = join(pack, 'normalize.json');
  const normalize = existsSync(normalizePath) ? readJsonFile(normalizePath) : undefined;
  const subgraphsPath = join(pack, 'subgraphs.json');
  const subgraphsRaw = existsSync(subgraphsPath) ? readJsonFile(subgraphsPath) : undefined;

  const manifest = pieces.manifest as PackJsonInput['manifest'];
  if (manifest == null || typeof manifest !== 'object' || typeof manifest.id !== 'string') {
    throw new Error('pack/manifest.json must include string id');
  }

  return {
    manifest,
    flow: pieces.flow as PackJsonInput['flow'],
    controls: (pieces.controls as PackJsonInput['controls']) ?? [],
    intents: pieces.intents as PackJsonInput['intents'],
    binders: normalizeBindersMap(pieces.binders),
    glossary: Array.isArray(glossary) ? (glossary as PackJsonInput['glossary']) : undefined,
    faq: mergeFaqEntries(
      baseFaq,
      Array.isArray(productFaq) ? (productFaq as FaqEntry[]) : undefined
    ),
    lookups: Array.isArray(lookups) ? (lookups as LookupDef[]) : undefined,
    replies:
      replies != null && typeof replies === 'object' && !Array.isArray(replies)
        ? (replies as ReplyBank)
        : undefined,
    normalize:
      normalize != null && typeof normalize === 'object' && !Array.isArray(normalize)
        ? (normalize as NormalizeConfig)
        : undefined,
    subgraphs:
      subgraphsRaw != null &&
      typeof subgraphsRaw === 'object' &&
      !Array.isArray(subgraphsRaw)
        ? (subgraphsRaw as PackJsonInput['subgraphs'])
        : undefined,
  };
}

/**
 * Sync load: `dir` (host project or UiPilot home) → LoadedPack.
 * **Node-only** — uses `node:fs`. Keep browsers on `loadPackFromJson`.
 */
export function loadUipilotHomeFromDir(dir: string): LoadUipilotHomeResult {
  const { projectRoot, home } = resolveUipilotHomeDir(dir);
  if (!existsSync(home)) {
    throw new Error(`Missing UiPilot home: ${home}`);
  }
  const packJson = loadPackJsonFromUipilotHome(home);
  return {
    projectRoot,
    home,
    packJson,
    pack: loadPackFromJson(packJson),
  };
}
