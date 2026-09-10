import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = join(process.cwd(), 'scripts/ci/ci_check.mjs');

describe('ci_check parity', () => {
  it('runs lint, typecheck, test, intents check, and optional e2e', () => {
    const src = readFileSync(SCRIPT, 'utf8');
    expect(src).toMatch(/run\(pm,\s*\['run',\s*'lint'\]/);
    expect(src).toMatch(/run\(pm,\s*\['run',\s*'typecheck'\]/);
    expect(src).toContain('test:coverage');
    expect(src).toContain('intents');
    expect(src).toContain('check');
    expect(src).toContain('ranker');
    expect(src).toContain('--with-e2e');
    expect(src).toContain('--with-dx');
    expect(src).toContain('test:e2e:demo');
    expect(src).toContain('demo-hello');
  });
});
