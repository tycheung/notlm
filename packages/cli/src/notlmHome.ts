import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveNotlmHome as resolveNotlmHomeCore } from '@notlm/core/loadFolder';

export type NotlmHome = {
  /** Directory containing `.notlm` (or that is the home itself). */
  projectRoot: string;
  /** Absolute path to `.notlm`. */
  home: string;
};

export function resolveNotlmHome(dir?: string): NotlmHome {
  return resolveNotlmHomeCore(dir);
}

export function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

export function readJsonFile<T = unknown>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export function writeJsonFile(path: string, data: unknown): void {
  ensureDir(dirname(path));
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export function pathExists(path: string): boolean {
  return existsSync(path);
}

/** Accept bare arrays or `{ [key]: [...] }` catalog wrappers. */
export function unwrapCatalogArray(raw: unknown, key: string): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (
    raw &&
    typeof raw === 'object' &&
    Array.isArray((raw as Record<string, unknown>)[key])
  ) {
    return (raw as Record<string, unknown>)[key] as unknown[];
  }
  return [];
}

export function packDir(home: string): string {
  return join(home, 'pack');
}

export function draftsDir(home: string): string {
  return join(home, 'drafts');
}

/** Absolute path to monorepo `packs/_template` (from this package). */
export function templateRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '../../../packs/_template');
}

export const PACK_PIECES = [
  'manifest.json',
  'flow.json',
  'controls.json',
  'intents.json',
  'binders.json',
  'corpus.json',
  'glossary.json',
  'faq.json',
  'lookups.json',
  'replies.json',
] as const;

export function loadPackFolderJson(home: string): Record<string, unknown> {
  const pack = packDir(home);
  const out: Record<string, unknown> = {};
  for (const file of PACK_PIECES) {
    const p = join(pack, file);
    if (!existsSync(p)) continue;
    const key = file.replace(/\.json$/, '');
    const raw = readJsonFile(p);
    if (file === 'faq.json') out[key] = unwrapCatalogArray(raw, 'faq');
    else if (file === 'corpus.json') out[key] = unwrapCatalogArray(raw, 'corpus');
    else if (file === 'lookups.json') out[key] = unwrapCatalogArray(raw, 'lookups');
    else if (file === 'glossary.json') out[key] = unwrapCatalogArray(raw, 'glossary');
    else out[key] = raw;
  }
  const queriesPath = join(pack, 'queries.json');
  if (existsSync(queriesPath)) {
    out.queries = unwrapCatalogArray(readJsonFile(queriesPath), 'queries');
  }
  const configPath = join(home, 'config.json');
  if (existsSync(configPath)) out.config = readJsonFile(configPath);
  const scenariosPath = join(home, 'scenarios.json');
  if (existsSync(scenariosPath)) {
    out.scenarios = unwrapCatalogArray(readJsonFile(scenariosPath), 'scenarios');
  }
  return out;
}

export function copyTemplateFile(src: string, dest: string): void {
  ensureDir(dirname(dest));
  copyFileSync(src, dest);
}
