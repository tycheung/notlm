import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cmdMissesDraftAliases, cmdMissesExport } from './cmdMisses.js';

describe('misses CLI', () => {
  it('exports JSON array from JSONL', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'uipilot-miss-'));
    try {
      const src = join(dir, 'misses.jsonl');
      writeFileSync(
        src,
        `${JSON.stringify({ text: 'a', kind: 'unknown', at: 't1' })}\n${JSON.stringify({ text: 'b', kind: 'ambiguous', at: 't2' })}\n`,
        'utf8'
      );
      const out = join(dir, 'out.json');
      await cmdMissesExport(['--from', src, '--out', out]);
      const parsed = JSON.parse(readFileSync(out, 'utf8')) as Array<{ text: string }>;
      expect(parsed.map((r) => r.text)).toEqual(['a', 'b']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('draft-aliases writes grouped draft under .uipilot/drafts', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'uipilot-miss-home-'));
    try {
      writeFileSync(join(dir, 'config.json'), '{}\n');
      // minimal home marker used by resolveUipilotHome — init creates .uipilot
      const home = join(dir, '.uipilot');
      const { mkdirSync } = await import('node:fs');
      mkdirSync(home, { recursive: true });
      mkdirSync(join(home, 'drafts'), { recursive: true });
      writeFileSync(join(home, 'config.json'), '{}\n');

      const src = join(dir, 'misses.json');
      writeFileSync(
        src,
        JSON.stringify([
          { text: 'xyzzy', kind: 'unknown', at: 't' },
          { text: 'xyzzy', kind: 'unknown', at: 't2' },
          { text: 'huh', kind: 'ambiguous', at: 't3' },
        ]),
        'utf8'
      );
      await cmdMissesDraftAliases(['--from', src, dir]);
      const drafts = join(home, 'drafts');
      const { readdirSync } = await import('node:fs');
      const folders = readdirSync(drafts).filter((n) => n.startsWith('misses-'));
      expect(folders.length).toBe(1);
      const draft = JSON.parse(
        readFileSync(join(drafts, folders[0]!, 'draft.json'), 'utf8')
      ) as { byKind: Record<string, string[]> };
      expect(draft.byKind.unknown).toEqual(['xyzzy']);
      expect(draft.byKind.ambiguous).toEqual(['huh']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
