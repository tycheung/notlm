import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '../..');

function walkTs(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === 'dist' || name.name === 'node_modules') continue;
      out.push(...walkTs(p));
    } else if (/\.(ts|tsx)$/.test(name.name) && !name.name.endsWith('.test.ts')) {
      out.push(p);
    }
  }
  return out;
}

describe('UI-actions only', () => {
  it('core and react must not import host product API clients', () => {
    const files = [
      ...walkTs(join(root, 'packages/core/src')),
      ...walkTs(join(root, 'packages/react/src')),
    ];
    const offenders: string[] = [];
    const banned =
      /from\s+['"][^'"]*\/(api|axios)['"]|import\s+axios|fetch\(\s*['"`]https?:\/\/.*\/api\//i;
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      if (banned.test(text)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
