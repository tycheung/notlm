#!/usr/bin/env node
/**
 * Static vibe-ship gates for FE — Bob/Cursor must pass before merge.
 *
 * Encodes recurring steward catches:
 * - no client generate/score/sim engines under bracketEngine
 * - brackets report client keeps pot_from/pot_to window fields
 * - no revived process_* side-action API wrappers
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const FORBIDDEN_ENGINE_FILES = [
  'src/utils/bracketEngine/generation.ts',
  'src/utils/bracketEngine/generation.js',
  'src/utils/bracketEngine/scoring.ts',
  'src/utils/bracketEngine/scoring.js',
  'src/utils/bracketEngine/sim.ts',
  'src/utils/bracketEngine/sim.js',
];

const FORBIDDEN_API_PATTERNS = [
  /\bprocessHighGame\b/,
  /\bprocess_high_game\b/,
  /\bprocessEliminator\b/,
  /\bprocess_eliminator\b/,
  /\bprocessDoubles\b/,
  /\bcalculateSideActionPrizes\b/,
];

let failed = false;

function fail(msg) {
  console.error(msg);
  failed = true;
}

for (const rel of FORBIDDEN_ENGINE_FILES) {
  const filePath = path.join(root, rel);
  if (fs.existsSync(filePath)) {
    fail(`forbidden client engine file present: ${rel}`);
  }
}
if (!failed) {
  console.log('ok no client bracket generate/score/sim engines');
}

const reportClient = path.join(root, 'src/api/side-action-reports.ts');
if (!fs.existsSync(reportClient)) {
  fail('missing src/api/side-action-reports.ts');
} else {
  const text = fs.readFileSync(reportClient, 'utf8');
  for (const needle of ['pot_from', 'pot_to']) {
    if (!text.includes(needle)) {
      fail(`src/api/side-action-reports.ts missing ${needle} window field`);
    }
  }
  if (!failed) {
    console.log('ok side-action-reports advertises pot_from/pot_to');
  }
}

const apiDir = path.join(root, 'src/api');
if (fs.existsSync(apiDir)) {
  const hits = [];
  for (const name of fs.readdirSync(apiDir)) {
    if (!/\.(ts|tsx|js|jsx)$/.test(name)) continue;
    const rel = path.join('src/api', name);
    const text = fs.readFileSync(path.join(apiDir, name), 'utf8');
    for (const rx of FORBIDDEN_API_PATTERNS) {
      if (rx.test(text)) {
        hits.push(`${rel} matches ${rx}`);
      }
    }
  }
  if (hits.length) {
    for (const hit of hits) fail(`dual-SSOT API wrapper smell: ${hit}`);
  } else {
    console.log('ok no retired process_* side-action API wrappers');
  }
}

if (failed) {
  console.error(
    'Vibe-ship invariant gate failed. Extend capability/report kit patterns instead of dual engines.',
  );
  process.exit(1);
}
console.log('vibe-ship static invariants ok');
