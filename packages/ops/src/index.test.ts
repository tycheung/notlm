import { describe, expect, it } from 'vitest';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { installLayaSidecar, installNightlyCelery } from './index.js';

describe('@uipilot/ops install', () => {
  it('scaffolds laya sidecar default-on', () => {
    const dir = mkdtempSync(join(tmpdir(), 'uipilot-ops-'));
    const { sidecarDir, files } = installLayaSidecar({ targetDir: dir });
    expect(existsSync(join(sidecarDir, 'app.py'))).toBe(true);
    expect(files.length).toBeGreaterThan(3);
    const env = readFileSync(join(sidecarDir, '.env.example'), 'utf8');
    expect(env).toMatch(/UIPILOT_LAYA_ENABLED=1/);
  });

  it('scaffolds celery nightly promote', () => {
    const dir = mkdtempSync(join(tmpdir(), 'uipilot-celery-'));
    const { files } = installNightlyCelery({ targetDir: dir });
    expect(files.some((f) => f.endsWith('tasks_promote.py'))).toBe(true);
  });
});
