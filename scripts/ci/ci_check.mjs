import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

function shellQuote(arg) {
  if (arg.length === 0) return '""';
  if (!/[\s"&<>|^]/.test(arg)) return arg;
  return `"${arg.replace(/"/g, '\\"')}"`;
}

function run(cmd, args, env) {
  const r = spawnSync(cmd, args.map(shellQuote), {
    stdio: 'inherit',
    shell: true,
    env: env ? { ...process.env, ...env } : process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function existsPack(rel) {
  return existsSync(join(process.cwd(), rel, '.uipilot', 'pack', 'manifest.json'));
}

const pm = process.env.UIPILOT_PM || 'npm';
const withSaturation = process.argv.includes('--with-saturation');
const withE2e =
  process.argv.includes('--with-e2e') ||
  process.env.CI === 'true' ||
  process.env.UIPILOT_CI_E2E === '1';
const skipE2e = process.argv.includes('--skip-e2e');

run(pm, ['run', 'lint']);
run(pm, ['run', 'typecheck']);
run(pm, ['run', 'test:coverage']);

// Pack schema gate (ci-004) + demo intent regression (no live LLM).
run(pm, ['run', 'uipilotCLI', '--', 'validate', 'packs/demo-todo']);
run(pm, ['run', 'uipilotCLI', '--', 'intents', 'check', 'packs/demo-todo']);
if (existsPack('packs/demo-crm')) {
  run(pm, ['run', 'uipilotCLI', '--', 'validate', 'packs/demo-crm']);
}

if (withE2e && !skipE2e) {
  run(pm, ['run', 'test:e2e:demo']);
}

if (withSaturation) {
  run(
    pm,
    ['run', 'uipilotCLI', '--', 'scenarios', 'saturate', 'packs/demo-todo', '5', '3'],
    { UIPILOT_SATURATE_FIXTURE: '1' }
  );
  run(pm, ['run', 'test:e2e:demo', '--', '--grep', '@guide-saturate']);
}

console.log(
  withSaturation
    ? 'ci_check: ok (with saturation)'
    : withE2e && !skipE2e
      ? 'ci_check: ok (with e2e)'
      : 'ci_check: ok'
);
