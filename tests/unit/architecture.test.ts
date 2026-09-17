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
  '@uipilot/llm',
];

const BANNED_FROM_REACT = [
  '@uipilot/author',
  '@uipilot/mapper',
  '@uipilot/cli',
  '@uipilot/codegen',
  '@uipilot/llm',
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
  it('core must not import react/author/mapper/cli/codegen/llm', () => {
    expect(offendersInDir('packages/core/src', BANNED_FROM_CORE)).toEqual([]);
  });

  it('react may import core only among @uipilot packages (not author/mapper/cli/llm)', () => {
    expect(offendersInDir('packages/react/src', BANNED_FROM_REACT)).toEqual([]);
  });

  it('apps must not import author/cli/mapper/llm/codegen internals', () => {
    const banned = [
      '@uipilot/author',
      '@uipilot/cli',
      '@uipilot/mapper',
      '@uipilot/llm',
      '@uipilot/codegen',
    ];
    const hits = [
      ...offendersInDir('apps/demo-todo/src', banned),
      ...offendersInDir('apps/demo-crm/src', banned),
      ...offendersInDir('apps/demo/src', banned),
    ];
    expect(hits).toEqual([]);
  });

  it('operating packages/ must not contain training package dirs', () => {
    const names = readdirSync(join(ROOT, 'packages'));
    const forbidden = ['author', 'mapper', 'codegen', 'llm'];
    expect(names.filter((n) => forbidden.includes(n))).toEqual([]);
  });

  it('operating cli must not import author/mapper/codegen/llm', () => {
    const banned = [
      '@uipilot/author',
      '@uipilot/mapper',
      '@uipilot/codegen',
      '@uipilot/llm',
    ];
    expect(offendersInDir('packages/cli/src', banned)).toEqual([]);
  });

  it('schema and ranker must not import authoring packages', () => {
    const banned = [
      '@uipilot/author',
      '@uipilot/mapper',
      '@uipilot/codegen',
      '@uipilot/llm',
    ];
    expect(offendersInDir('packages/schema/src', banned)).toEqual([]);
    expect(offendersInDir('packages/ranker/src', banned)).toEqual([]);
  });

  it('operating ranker must not ship exportIntentOnnx', () => {
    const rankerSrc = join(ROOT, 'packages/ranker/src');
    expect(readdirSync(rankerSrc).includes('onnxExport.ts')).toBe(false);
    const index = readFileSync(join(rankerSrc, 'index.ts'), 'utf8');
    expect(index).not.toMatch(/exportIntentOnnx/);
  });

  it('unsupported surface includes exchanges and metrics', async () => {
    const { isUnsupportedCommand } = await import(
      '../../packages/cli/src/fatDispatch.ts'
    );
    expect(isUnsupportedCommand('exchanges', 'pull')).toBe(true);
    expect(isUnsupportedCommand('metrics')).toBe(true);
  });

  it('packages src must not name external training tooling', () => {
    const hits: string[] = [];
    for (const file of collectTsFiles(join(ROOT, 'packages'))) {
      const text = readFileSync(file, 'utf8');
      if (/uipilot-training|uipilot-trainer/i.test(text)) {
        hits.push(relative(ROOT, file));
      }
    }
    expect(hits).toEqual([]);
  });

  it('top docs must not name external training tooling', () => {
    const docs = [
      'README.md',
      'ARCHITECTURE.md',
      'CONTRIBUTING.md',
      'SECURITY.md',
      'docs/PACK_COOKBOOK.md',
      'docs/adr/009-runtime-vs-training-llm-fallback.md',
    ];
    const hits: string[] = [];
    for (const rel of docs) {
      const full = join(ROOT, rel);
      try {
        const text = readFileSync(full, 'utf8');
        if (/uipilot-training|uipilot-trainer/i.test(text)) hits.push(rel);
      } catch {
        /* missing ok */
      }
    }
    expect(hits).toEqual([]);
  });
});
