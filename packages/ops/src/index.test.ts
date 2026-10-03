import { describe, expect, it } from 'vitest';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { installLayaSidecar, installNightlyCelery } from './index.js';

describe('@notlm/ops install', () => {
  it('scaffolds laya sidecar default-on', () => {
    const dir = mkdtempSync(join(tmpdir(), 'notlm-ops-'));
    const { sidecarDir, files } = installLayaSidecar({ targetDir: dir });
    expect(existsSync(join(sidecarDir, 'app.py'))).toBe(true);
    expect(files.length).toBeGreaterThan(3);
    const env = readFileSync(join(sidecarDir, '.env.example'), 'utf8');
    expect(env).toMatch(/NOTLM_LAYA_ENABLED=1/);
    expect(env).toMatch(/NOTLM_LAYA_PRODUCT_ROLE=a product assistant/);
    const app = readFileSync(join(sidecarDir, 'app.py'), 'utf8');
    expect(app).toMatch(/queryIds/);
    expect(app).toMatch(/Borderline OOD/);
  });

  it('accepts a host product role', () => {
    const dir = mkdtempSync(join(tmpdir(), 'notlm-ops-role-'));
    const { sidecarDir } = installLayaSidecar({
      targetDir: dir,
      productRole: 'a product workflow guide',
    });
    const env = readFileSync(join(sidecarDir, '.env.example'), 'utf8');
    expect(env).toMatch(/a product workflow guide/);
  });

  it('scaffolds celery nightly promote', () => {
    const dir = mkdtempSync(join(tmpdir(), 'notlm-celery-'));
    const { files } = installNightlyCelery({ targetDir: dir });
    expect(files.some((f) => f.endsWith('tasks_promote.py'))).toBe(true);
  });
});
