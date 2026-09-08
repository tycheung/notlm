import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd());
const HARD_MAX = 1000;
const SCAN_DIRS = [
  'packages/core/src',
  'packages/react/src',
  'packages/cli/src',
  'packages/author/src',
  'packages/mapper/src',
  'packages/schema/src',
  'packages/codegen/src',
  'packages/ranker/src',
];

function collectTsFiles(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === 'dist' || name === 'node_modules') continue;
      collectTsFiles(full, out);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(name)) continue;
    if (/\.test\.(ts|tsx)$/.test(name)) continue;
    out.push(full);
  }
  return out;
}

describe('module size hard cap', () => {
  it(`keeps production modules under ${HARD_MAX} lines`, () => {
    const offenders: string[] = [];
    for (const rel of SCAN_DIRS) {
      for (const file of collectTsFiles(join(ROOT, rel))) {
        const lines = readFileSync(file, 'utf8').split(/\r?\n/).length;
        if (lines > HARD_MAX) {
          offenders.push(`${relative(ROOT, file)}: ${lines}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
