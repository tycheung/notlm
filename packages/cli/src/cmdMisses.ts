import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MissRecord } from '@uipilot/core';
import { draftsDir, pathExists, resolveUipilotHome } from './uipilotHome.js';

function parseMissRecords(raw: string): MissRecord[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    const arr = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(arr)) throw new Error('Expected a JSON array of MissRecords');
    return arr as MissRecord[];
  }
  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as MissRecord);
}

function takeFlag(args: string[], name: string): string | undefined {
  const eq = args.findIndex((a) => a.startsWith(`${name}=`));
  if (eq >= 0) return args[eq]!.slice(name.length + 1);
  const idx = args.findIndex((a) => a === name);
  if (idx >= 0) return args[idx + 1];
  return undefined;
}

function positionalDir(args: string[]): string | undefined {
  const skip = new Set<string>();
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i]!;
    if (a === '--from' || a === '--out') {
      skip.add(a);
      if (args[i + 1]) skip.add(args[i + 1]!);
    } else if (a.startsWith('--from=') || a.startsWith('--out=')) {
      skip.add(a);
    }
  }
  return args.find((a) => !a.startsWith('-') && !skip.has(a));
}

/** Export miss records from a JSON/JSONL dump (e.g. localStorage snapshot). */
export async function cmdMissesExport(args: string[]): Promise<void> {
  const fromPath = takeFlag(args, '--from');
  if (!fromPath) {
    console.error('Usage: uipilotCLI misses export --from <file.json|jsonl> [--out <path>]');
    process.exitCode = 1;
    return;
  }
  const outPath = takeFlag(args, '--out');

  const records = parseMissRecords(readFileSync(fromPath, 'utf8'));
  const payload = `${JSON.stringify(records, null, 2)}\n`;
  if (outPath) {
    writeFileSync(outPath, payload, 'utf8');
    console.log(`Wrote ${records.length} miss records → ${outPath}`);
  } else {
    process.stdout.write(payload);
  }
}

/**
 * Group unique miss texts into a draft folder for human accept into intents/corpus.
 */
export async function cmdMissesDraftAliases(args: string[]): Promise<void> {
  const dir = positionalDir(args);
  const fromPath = takeFlag(args, '--from');
  if (!fromPath) {
    console.error(
      'Usage: uipilotCLI misses draft-aliases --from <file.json|jsonl> [dir]'
    );
    process.exitCode = 1;
    return;
  }

  const { home } = resolveUipilotHome(dir);
  if (!pathExists(home)) {
    console.error(`Missing UiPilot home: ${home} (run uipilotCLI init)`);
    process.exitCode = 1;
    return;
  }

  const records = parseMissRecords(readFileSync(fromPath, 'utf8'));
  const byKind = new Map<string, string[]>();
  for (const r of records) {
    const text = (r.text ?? '').trim();
    if (!text) continue;
    const list = byKind.get(r.kind) ?? [];
    if (!list.includes(text)) list.push(text);
    byKind.set(r.kind, list);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = join(draftsDir(home), `misses-${stamp}`);
  mkdirSync(outDir, { recursive: true });
  const draft = {
    note: 'Human-review: fold unique miss texts into intents aliases / corpus, then delete.',
    counts: Object.fromEntries([...byKind.entries()].map(([k, v]) => [k, v.length])),
    byKind: Object.fromEntries(byKind),
    records,
  };
  writeFileSync(join(outDir, 'draft.json'), `${JSON.stringify(draft, null, 2)}\n`, 'utf8');
  console.log(`Miss draft → ${outDir} (${records.length} records)`);
}
