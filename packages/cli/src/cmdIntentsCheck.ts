import { checkIntents } from '@notlm/core';
import {
  loadPackFolderJson,
  pathExists,
  resolveNotlmHome,
} from './notlmHome.js';

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

  const result = checkIntents({
    pack: {
      manifest: files.manifest as { id: string },
      flow: files.flow as never,
      controls: (files.controls as never) ?? [],
      intents: files.intents as never,
      binders: files.binders as never,
    },
    scenarios: scenarios as never,
  });

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
