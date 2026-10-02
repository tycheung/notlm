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
const withDx = process.argv.includes('--with-dx');
const withE2e =
  process.argv.includes('--with-e2e') ||
  process.env.CI === 'true' ||
  process.env.UIPILOT_CI_E2E === '1';
const skipE2e = process.argv.includes('--skip-e2e');

if (process.argv.includes('--with-saturation')) {
  console.error('ci_check: --with-saturation is not supported in this repo.');
  process.exit(1);
}

// dist/ is gitignored — build before CLI gates / typecheck consumers.
run(pm, ['run', 'build']);
run(pm, ['run', 'lint']);
run(pm, ['run', 'typecheck']);
run(pm, ['run', 'test:coverage']);
run(pm, ['run', 'check:host-bleed']);

// Pack schema gate (ci-004) + demo intent regression (no live LLM).
run(pm, ['run', 'uipilotCLI', '--', 'validate', 'packs/demo-todo']);
run(pm, ['run', 'uipilotCLI', '--', 'intents', 'check', 'packs/demo-todo']);
run(pm, ['run', 'uipilotCLI', '--', 'ranker', 'check', 'packs/demo-todo']);
if (existsPack('packs/demo-crm')) {
  run(pm, ['run', 'uipilotCLI', '--', 'validate', 'packs/demo-crm']);
}

if (withDx) {
  // Operator DX golden path: validate + intents check on all demo packs.
  for (const pack of ['packs/demo-todo', 'packs/demo-crm', 'packs/demo-hello']) {
    if (!existsPack(pack)) continue;
    run(pm, ['run', 'uipilotCLI', '--', 'validate', pack]);
    run(pm, ['run', 'uipilotCLI', '--', 'intents', 'check', pack]);
  }
}

if (withE2e && !skipE2e) {
  run(pm, ['run', 'test:e2e:demo']);
}

console.log(
  withDx
    ? 'ci_check: ok (with dx)'
    : withE2e && !skipE2e
      ? 'ci_check: ok (with e2e)'
      : 'ci_check: ok'
);
