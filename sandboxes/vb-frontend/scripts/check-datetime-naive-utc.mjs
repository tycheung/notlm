#!/usr/bin/env node
/**
 * Scan react-frontend for timezone-aware datetime usage (standalone repo).
 * Enforces naive-UTC policy on API-facing date handling.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const ROOT_EXCLUDES = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  'playwright-report',
  'test-results',
  '.git',
]);

const ALLOWED_SNIPPETS = [
  'check-datetime-naive-utc.mjs',
  'docs/datetime-policy.md',
  'dateUtils.ts',
  'EventFormatWizard.tsx',
];

const RULES = [
  ['Frontend UTC serializer', /\.toISOString\(/],
  [
    'Frontend API datetime parsed with new Date',
    /new Date\((?:[^)]*(?:start_date|end_date|deadline|_at|dateTimeString|iso)[^)]*)\)/,
  ],
  ['Frontend relative-time bypass', /\.fromNow\(\)/],
];

async function* iterFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ROOT_EXCLUDES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* iterFiles(full);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
      yield full;
    }
  }
}

function isAllowed(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  return ALLOWED_SNIPPETS.some((snippet) => normalized.includes(snippet));
}

async function scan() {
  const findings = [];
  const srcRoot = path.join(repoRoot, 'src');
  for await (const filePath of iterFiles(srcRoot)) {
    const rel = path.relative(repoRoot, filePath);
    if (isAllowed(rel)) continue;
    const content = await readFile(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const [ruleName, pattern] of RULES) {
        if (pattern.test(line)) {
          findings.push(`${rel}:${i + 1}: ${ruleName}: ${line.trim()}`);
        }
      }
    }
  }
  return findings;
}

const findings = await scan();
if (findings.length) {
  console.error('Naive-UTC policy violations found:');
  for (const finding of findings) {
    console.error(` - ${finding}`);
  }
  process.exit(1);
}
console.log('Naive-UTC policy scan passed.');
