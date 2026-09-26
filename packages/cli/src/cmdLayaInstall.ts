import { installLayaSidecar, installNightlyCelery } from '@uipilot/ops';
import { resolve } from 'node:path';

export async function cmdLayaInstall(args: string[]): Promise<void> {
  const dir = resolve(args.find((a) => !a.startsWith('-')) ?? '.');
  const celery = args.includes('--with-celery');
  const result = installLayaSidecar({
    targetDir: dir,
    enabledByDefault: !args.includes('--disabled'),
  });
  console.log(`Laya sidecar → ${result.sidecarDir}`);
  for (const f of result.files) console.log(`  ${f}`);
  if (celery) {
    const c = installNightlyCelery({ targetDir: dir, force: args.includes('--force') });
    if (c.skipped) console.log(c.skipped);
    else {
      console.log(`Celery nightly scaffold → ${c.dir}`);
      for (const f of c.files) console.log(`  ${f}`);
    }
  }
}

export async function cmdCelerySetup(args: string[]): Promise<void> {
  const dir = resolve(args.find((a) => !a.startsWith('-')) ?? '.');
  const c = installNightlyCelery({ targetDir: dir, force: args.includes('--force') });
  if (c.skipped) {
    console.log(c.skipped);
    return;
  }
  console.log(`Celery nightly scaffold → ${c.dir}`);
  for (const f of c.files) console.log(`  ${f}`);
}
