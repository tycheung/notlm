import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Templates live next to dist in published package; in monorepo beside src. */
export function opsTemplatesRoot(): string {
  const candidates = [
    join(HERE, '..', 'templates'),
    join(HERE, 'templates'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return join(HERE, '..', 'templates');
}

export type LayaInstallOpts = {
  /** Host backend directory to scaffold into (e.g. ./backend). */
  targetDir: string;
  /** Relative subdir under target for sidecar (default uipilot_laya). */
  sidecarName?: string;
  /** Default on in generated .env.example */
  enabledByDefault?: boolean;
  /** Product role string for refuse copy (default: a product coach). */
  productRole?: string;
};

/**
 * Scaffold Laya sidecar + systemd unit + env example into a host backend tree.
 * Default enabled for ease of use (UIPILOT_LAYA_ENABLED=1).
 * Sidecar logic source of truth: packages/ops/templates/laya/sidecar_app.py
 */
export function installLayaSidecar(opts: LayaInstallOpts): {
  sidecarDir: string;
  files: string[];
} {
  const sidecarName = opts.sidecarName ?? 'uipilot_laya';
  const enabled = opts.enabledByDefault !== false;
  const productRole = (opts.productRole ?? 'a product coach').trim() || 'a product coach';
  const root = opsTemplatesRoot();
  const sidecarDir = join(opts.targetDir, sidecarName);
  mkdirSync(sidecarDir, { recursive: true });

  const files: string[] = [];
  const copy = (rel: string, dest: string) => {
    const src = join(root, rel);
    if (!existsSync(src)) throw new Error(`Missing template: ${src}`);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest);
    files.push(dest);
  };

  copy('laya/sidecar_app.py', join(sidecarDir, 'app.py'));
  copy('laya/requirements-laya.txt', join(sidecarDir, 'requirements-laya.txt'));
  copy('laya/uipilot-laya.service', join(sidecarDir, 'uipilot-laya.service'));
  copy('laya/README.md', join(sidecarDir, 'README.md'));

  const envPath = join(sidecarDir, '.env.example');
  writeFileSync(
    envPath,
    [
      `# UiPilot Laya decision sidecar (default ${enabled ? 'ON' : 'OFF'})`,
      `UIPILOT_LAYA_ENABLED=${enabled ? '1' : '0'}`,
      'UIPILOT_LAYA_HOST=127.0.0.1',
      'UIPILOT_LAYA_PORT=8765',
      'UIPILOT_LAYA_CHECKPOINT=',
      `UIPILOT_LAYA_PRODUCT_ROLE=${productRole}`,
      '',
    ].join('\n'),
    'utf8'
  );
  files.push(envPath);

  const proxyHint = join(sidecarDir, 'HOST_PROXY.md');
  writeFileSync(
    proxyHint,
    [
      '# Host proxy',
      '',
      'Point `POST /uipilot/fallback` at `http://127.0.0.1:8765/decide`.',
      'Keep **one** sidecar process — never load Laya inside each Gunicorn worker.',
      'If health fails, return canned repair (degraded mode). Nightly pack/ranker',
      'promotion is CPU-only and must not call `laya train` on the server.',
      '',
      'Sidecar `app.py` is installed from `@uipilot/ops` templates — edit the',
      'template in the uipilot repo, then re-run `uipilotCLI laya install`.',
      '',
    ].join('\n'),
    'utf8'
  );
  files.push(proxyHint);

  return { sidecarDir, files };
}

export type CelerySetupOpts = {
  targetDir: string;
  /** Only scaffold if no existing celery app detected (or force). */
  force?: boolean;
};

/**
 * Optional lightweight Celery scaffold for nightly **cache** promotion
 * (pack aliases + ranker.json). Does not fine-tune Laya weights.
 */
export function installNightlyCelery(opts: CelerySetupOpts): {
  dir: string;
  files: string[];
  skipped?: string;
} {
  const root = opsTemplatesRoot();
  const dir = join(opts.targetDir, 'uipilot_celery');
  if (existsSync(dir) && !opts.force) {
    return { dir, files: [], skipped: `Already exists: ${dir}` };
  }
  mkdirSync(dir, { recursive: true });
  const files: string[] = [];
  for (const rel of [
    'celery/tasks_promote.py',
    'celery/celeryconfig.py',
    'celery/README.md',
  ]) {
    const name = rel.split('/').pop()!;
    const dest = join(dir, name);
    cpSync(join(root, rel), dest);
    files.push(dest);
  }
  return { dir, files };
}

export function readTemplate(rel: string): string {
  return readFileSync(join(opsTemplatesRoot(), rel), 'utf8');
}
