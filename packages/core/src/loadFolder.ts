/**
 * Node-only sync FS loader for `.uipilot/pack/*.json`.
 * Browser / SPA hosts should use `loadPackFromJson` with fetched or bundled JSON.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { loadPackFromJson } from './loadPack.js';
import type { BinderPredicate, LoadedPack, PackJsonInput } from './types.js';

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
  const faq = existsSync(faqPath) ? readJsonFile(faqPath) : undefined;

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
    faq: Array.isArray(faq) ? (faq as PackJsonInput['faq']) : undefined,
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
