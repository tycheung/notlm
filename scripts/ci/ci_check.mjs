import { spawnSync } from 'node:child_process';

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const pm = process.env.WA_PM || 'npm';
run(pm, ['run', 'lint']);
run(pm, ['run', 'typecheck']);
run(pm, ['run', 'test']);
console.log('ci_check: ok');
