/**
 * `uipilotCLI ranker check [dir] [--min-hit-rate=0.75] [--min-prob=0.35]`
 * Soft-score gate: JSON ranker hit-rate on labeled corpus/scenarios.
 */
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import {
  evaluateRankerSoftScore,
  type RankerModelJson,
} from '@uipilot/ranker';
import type { ScenarioCase } from '@uipilot/core';
import {
  loadPackFolderJson,
  packDir,
  pathExists,
  resolveUipilotHome,
} from './uipilotHome.js';

function parseFlag(args: string[], name: string): string | undefined {
  const eq = args.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  return args[i + 1];
}

export async function cmdRankerCheck(args: string[]): Promise<void> {
  const dir = args.find((a) => !a.startsWith('-'));
  const { home } = resolveUipilotHome(dir);
  if (!pathExists(home)) {
    console.error(`Missing UiPilot home: ${home}`);
    process.exitCode = 1;
    return;
  }

  const jsonPath = join(packDir(home), 'ranker.json');
  if (!pathExists(jsonPath)) {
    console.error(
      `Missing ${jsonPath} — ship a trained ranker artifact before ranker check`
    );
    process.exitCode = 1;
    return;
  }

  const model = JSON.parse(readFileSync(jsonPath, 'utf8')) as RankerModelJson;
  const files = loadPackFolderJson(home);
  const corpus = (files.corpus as ScenarioCase[] | undefined) ?? [];
  const scenarios = (files.scenarios as ScenarioCase[] | undefined) ?? [];
  const labeled = [...corpus, ...scenarios].filter(
    (c) => c && typeof c.utterance === 'string' && c.expect
  );

  const minHitRate = Math.min(
    1,
    Math.max(0, Number(parseFlag(args, '--min-hit-rate') ?? '0.75') || 0.75)
  );
  const minProbability = Math.min(
    1,
    Math.max(0, Number(parseFlag(args, '--min-prob') ?? '0.35') || 0.35)
  );

  const result = evaluateRankerSoftScore(model, labeled, {
    minHitRate,
    minProbability,
  });

  console.log(
    `ranker check: ${result.hits}/${result.total} hits (${(result.hitRate * 100).toFixed(1)}%)` +
      ` — floor ${(minHitRate * 100).toFixed(0)}% @ p≥${minProbability}`
  );
  if (!result.ok) {
    for (const f of result.fails.slice(0, 12)) {
      console.error(
        `  FAIL “${f.utterance}” want ${f.expected} got ${f.actual} (p=${f.probability.toFixed(3)})`
      );
    }
    if (result.fails.length > 12) {
      console.error(`  … +${result.fails.length - 12} more`);
    }
    process.exitCode = 1;
  }
}
