import { describe, expect, it } from 'vitest';
import { hasRequiresCycle, dependentStepIds } from '../../packages/core/src/flowGraph.ts';
import type { FlowStepDef } from '../../packages/core/src/types.ts';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(process.cwd());

const BANNED_FROM_CORE = [
  '@uipilot/react',
  '@uipilot/author',
  '@uipilot/mapper',
  '@uipilot/cli',
  '@uipilot/codegen',
];

const BANNED_FROM_REACT = [
  '@uipilot/author',
  '@uipilot/mapper',
  '@uipilot/cli',
  '@uipilot/codegen',
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
    if (!/\.(ts|tsx)$/.test(name) || /\.test\.(ts|tsx)$/.test(name)) continue;
    out.push(full);
  }
  return out;
}

function importSpecifiers(source: string): string[] {
  const specs: string[] = [];
  const re =
    /(?:from\s+|import\s*\(\s*|export\s+\*\s+from\s+)['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    specs.push(m[1]!);
  }
  return specs;
}

function offendersInDir(dir: string, banned: string[]): string[] {
  const hits: string[] = [];
  for (const file of collectTsFiles(join(ROOT, dir))) {
    const text = readFileSync(file, 'utf8');
    for (const spec of importSpecifiers(text)) {
      if (banned.some((b) => spec === b || spec.startsWith(`${b}/`))) {
        hits.push(`${relative(ROOT, file)} → ${spec}`);
      }
    }
  }
  return hits;
}

describe('architecture bootstrap', () => {
  it('detects requires cycles', () => {
    const steps: FlowStepDef[] = [
      { id: 'a', title: 'A', keywords: [], kind: 'hard', requires: ['b'] },
      { id: 'b', title: 'B', keywords: [], kind: 'hard', requires: ['a'] },
    ];
    expect(hasRequiresCycle(steps)).toBe(true);
  });

  it('lists dependents for stale fan-out', () => {
    const steps: FlowStepDef[] = [
      { id: 'a', title: 'A', keywords: [], kind: 'hard', requires: [] },
      { id: 'b', title: 'B', keywords: [], kind: 'hard', requires: ['a'] },
    ];
    expect(dependentStepIds(steps, 'a')).toEqual(['b']);
  });
});

describe('import graph (apps → react → core)', () => {
  it('core must not import react/author/mapper/cli/codegen', () => {
    expect(offendersInDir('packages/core/src', BANNED_FROM_CORE)).toEqual([]);
  });

  it('react may import core only among @uipilot packages (not author/mapper/cli)', () => {
    expect(offendersInDir('packages/react/src', BANNED_FROM_REACT)).toEqual([]);
  });

  it('apps must not import author/cli/mapper internals', () => {
    const banned = ['@uipilot/author', '@uipilot/cli', '@uipilot/mapper'];
    const hits = [
      ...offendersInDir('apps/demo-todo/src', banned),
      ...offendersInDir('apps/demo-crm/src', banned),
    ];
    expect(hits).toEqual([]);
  });
});
