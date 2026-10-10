import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkIntents } from '@notlm/core';
import {
  loadPackFolderJson,
  packDir,
  pathExists,
  resolveNotlmHome,
} from './notlmHome.js';

function readJsonIfExists(path: string): unknown {
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as unknown;
  } catch (err) {
    throw new Error(
      `Invalid JSON at ${path}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

function readJsonCatalog(path: string, key: string): unknown[] | undefined {
  if (!existsSync(path)) return undefined;
  const raw = readJsonIfExists(path);
  if (Array.isArray(raw)) return raw;
  if (
    raw &&
    typeof raw === 'object' &&
    Array.isArray((raw as Record<string, unknown>)[key])
  ) {
    return (raw as Record<string, unknown>)[key] as unknown[];
  }
  return undefined;
}

export async function cmdIntentsCheck(dir?: string): Promise<void> {
  const { home } = resolveNotlmHome(dir);
  if (!pathExists(home)) {
    console.error(`Missing NotLM home: ${home} (run notlmCLI init)`);
    process.exitCode = 1;
    return;
  }

  const files = loadPackFolderJson(home);
  if (!files.manifest || !files.flow || !files.intents) {
    console.error('pack/ requires manifest.json, flow.json, intents.json');
    process.exitCode = 1;
    return;
  }

  const scenarios = (files.scenarios as unknown[]) ?? [];
  if (!Array.isArray(scenarios)) {
    console.error('scenarios.json must be an array');
    process.exitCode = 1;
    return;
  }

  const pack = packDir(home);
  let result;
  try {
    const queries = Array.isArray(files.queries)
      ? files.queries
      : readJsonCatalog(join(pack, 'queries.json'), 'queries');
    const configFeatures = (files.config as { features?: unknown } | undefined)
      ?.features;

    result = checkIntents({
      pack: {
        manifest: files.manifest as { id: string },
        flow: files.flow as never,
        controls: (files.controls as never) ?? [],
        intents: files.intents as never,
        binders: files.binders as never,
        faq: (Array.isArray(files.faq) && files.faq.length > 0
          ? files.faq
          : readJsonCatalog(join(pack, 'faq.json'), 'faq')) as never,
        queries: queries as never,
        // Parity with training checkIntentsPack: home files win over pack/*.
        mutations: (files.mutations ??
          readJsonCatalog(join(pack, 'mutations.json'), 'mutations')) as never,
        tours: (files.tours ??
          readJsonCatalog(join(pack, 'tours.json'), 'tours')) as never,
        search: (files.search ??
          readJsonCatalog(join(pack, 'search.json'), 'search')) as never,
        heuristics: (files.heuristics ??
          readJsonIfExists(join(pack, 'heuristics.json'))) as never,
        normalize: (files.normalize ??
          readJsonIfExists(join(pack, 'normalize.json'))) as never,
        semanticIndex: readJsonIfExists(join(pack, 'semantic-index.json')) as never,
        semanticIndexCustom: readJsonIfExists(
          join(pack, 'semantic-index.custom.json')
        ) as never,
      },
      scenarios: scenarios as never,
      features: configFeatures as never,
    });
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
    return;
  }

  for (const r of result.results) {
    const label = r.id ?? r.utterance;
    if (r.ok) {
      console.log(`PASS ${label}`);
    } else {
      console.error(`FAIL ${label}`);
      for (const e of r.errors) console.error(`  ${e}`);
    }
  }

  if (!result.ok) {
    process.exitCode = 1;
    return;
  }
  console.log(`OK ${result.results.length} scenarios`);
}
