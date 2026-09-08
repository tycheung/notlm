import { spawnSync } from 'node:child_process';

function run(cmd, args, env) {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: env ? { ...process.env, ...env } : process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const pm = process.env.UIPILOT_PM || 'npm';
const withSaturation = process.argv.includes('--with-saturation');

run(pm, ['run', 'lint']);
run(pm, ['run', 'typecheck']);
run(pm, ['run', 'test']);

if (withSaturation) {
  // Fixture saturate against demo-todo (no live LLM). Prefer env — npm strips --flags.
  run(
    pm,
    ['run', 'uipilotCLI', '--', 'scenarios', 'saturate', 'packs/demo-todo', '5', '3'],
    { UIPILOT_SATURATE_FIXTURE: '1' }
  );
  run(pm, ['run', 'test:e2e:demo', '--', '--grep', '@guide-saturate']);
}

console.log(withSaturation ? 'ci_check: ok (with saturation)' : 'ci_check: ok');
