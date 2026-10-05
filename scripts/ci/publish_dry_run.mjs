#!/usr/bin/env node
/**
 * Public-ready dry-run: pack each publishable package and npm publish --dry-run.
 * Never publishes. Run via: node scripts/ci/publish_dry_run.mjs
 */
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const packages = ['core', 'schema', 'ranker', 'ops', 'cli', 'react'];

function run(cmd, cwd = root) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

run('npm run build');

for (const name of packages) {
  const dir = join(root, 'packages', name);
  if (!existsSync(join(dir, 'package.json'))) {
    throw new Error(`Missing package: ${name}`);
  }
  // Clean prior tarballs
  for (const f of readdirSync(dir)) {
    if (f.endsWith('.tgz')) rmSync(join(dir, f));
  }
  run('npm pack', dir);
  run('npm publish --dry-run', dir);
}

console.log('publish_dry_run: ok');
