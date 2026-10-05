/**
 * Node-only sync FS loader for `.notlm/pack/*.json`.
 * Browser / SPA hosts should use `loadPackFromJson` with fetched or bundled JSON.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { normalizeBindersMap } from './binders.js';
import { mergeFaqEntries } from './glossary.js';
import { loadPackFromJson } from './loadPack.js';
import type {
  FaqEntry,
  HeuristicsConfig,
  LoadedPack,
  LookupDef,
  NormalizeConfig,
  PackJsonInput,
  ReplyBank,
} from './types.js';

export { normalizeBindersMap } from './binders.js';

export const NOTLM_DIRNAME = '.notlm';

const PACK_REQUIRED = ['manifest', 'flow', 'controls', 'intents', 'binders'] as const;

export type LoadNotlmHomeResult = {
  projectRoot: string;
  /** Absolute path to `.notlm`. */
  home: string;
  packJson: PackJsonInput;
  pack: LoadedPack;
};

function basenameIsNotlm(p: string): boolean {
  const base = p.replace(/[/\\]+$/, '').split(/[/\\]/).pop();
  return base === NOTLM_DIRNAME;
}

export function resolveNotlmHomeDir(dir: string): { projectRoot: string; home: string } {
  const projectRoot = resolve(dir);
  if (basenameIsNotlm(projectRoot)) {
    return { projectRoot: dirname(projectRoot), home: projectRoot };
  }
  return { projectRoot, home: join(projectRoot, NOTLM_DIRNAME) };
}

/** Same as NotLM CLI: resolve `.notlm` from `dir` or `process.cwd()`. */
export function resolveNotlmHome(dir?: string): { projectRoot: string; home: string } {
  return resolveNotlmHomeDir(resolve(dir ?? process.cwd()));
}

function readJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

/** Walk up from `start` looking for `packs/_base-en/faq.json`, or use NOTLM_BASE_FAQ. */
export function resolveBaseFaqPath(start: string): string | null {
  const fromEnv = process.env.NOTLM_BASE_FAQ?.trim();
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

export function loadPackJsonFromNotlmHome(home: string): PackJsonInput {
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
  const heuristicsPath = join(pack, 'heuristics.json');
  const heuristics = existsSync(heuristicsPath) ? readJsonFile(heuristicsPath) : undefined;
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
    heuristics:
      heuristics != null && typeof heuristics === 'object' && !Array.isArray(heuristics)
        ? (heuristics as HeuristicsConfig)
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
 * Sync load: `dir` (host project or NotLM home) → LoadedPack.
 * **Node-only** — uses `node:fs`. Keep browsers on `loadPackFromJson`.
 */
export function loadNotlmHomeFromDir(dir: string): LoadNotlmHomeResult {
  const { projectRoot, home } = resolveNotlmHomeDir(dir);
  if (!existsSync(home)) {
    throw new Error(`Missing NotLM home: ${home}`);
  }
  const packJson = loadPackJsonFromNotlmHome(home);
  return {
    projectRoot,
    home,
    packJson,
    pack: loadPackFromJson(packJson),
  };
}
