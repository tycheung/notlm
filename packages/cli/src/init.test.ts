import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cmdInit } from './commands.js';
import { pathExists, resolveNotlmHome } from './notlmHome.js';

const temps: string[] = [];

afterEach(() => {
  for (const t of temps.splice(0)) {
    try {
      rmSync(t, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

describe('notlmCLI init', () => {
  it('creates pack tree from packs/_template', async () => {
    const root = mkdtempSync(join(tmpdir(), 'notlm-init-'));
    temps.push(root);
    await cmdInit(root);
    const { home } = resolveNotlmHome(root);
    expect(pathExists(join(home, 'config.json'))).toBe(true);
    expect(pathExists(join(home, 'inventory.json'))).toBe(true);
    expect(pathExists(join(home, 'structured-draft.json'))).toBe(true);
    expect(pathExists(join(home, 'checklist.json'))).toBe(true);
    expect(pathExists(join(home, 'scenarios.json'))).toBe(true);
    expect(pathExists(join(home, 'pack', 'manifest.json'))).toBe(true);
    expect(pathExists(join(home, 'pack', 'intents.json'))).toBe(true);
    expect(pathExists(join(home, 'pack', 'binders.json'))).toBe(true);
    expect(pathExists(join(home, 'drafts'))).toBe(true);
    expect(pathExists(join(home, 'traces'))).toBe(true);
  });
});
