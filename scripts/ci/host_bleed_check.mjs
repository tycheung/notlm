/**
 * Fail CI if host-brand / product residues appear under sealed runtime trees.
 * Allowed pack roots: demo-*, _base-en, _template only.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SCAN_ROOTS = ['packages', 'packs'];

/** Case-insensitive substrings that must not appear in sealed runtime. */
const FORBIDDEN = [
  'bowling',
  'victorybowling',
  'vb-director',
  'forget bowling',
  'ignore bowling',
  'in vb',
  'for td',
  'side action',
  'usbc',
  'create_tournament',
  'sa_only',
  'sweeper',
  'sweepers',
];

const TEXT_EXT = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.mdc',
  '.txt',
  '.yml',
  '.yaml',
]);

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === '.git') {
        continue;
      }
      walk(p, out);
    } else if (ent.isFile()) {
      const dot = ent.name.lastIndexOf('.');
      const ext = dot >= 0 ? ent.name.slice(dot).toLowerCase() : '';
      if (TEXT_EXT.has(ext) || ent.name === 'README') out.push(p);
    }
  }
  return out;
}

function packAllowed(relPosix) {
  // packs/<name>/...
  const m = relPosix.match(/^packs\/([^/]+)/);
  if (!m) return true;
  const name = m[1];
  return (
    name.startsWith('demo-') || name === '_base-en' || name === '_template'
  );
}

/** Ephemeral authoring artifacts under demo packs. */
function skipPath(relPosix) {
  return (
    relPosix.includes('/drafts/') ||
    relPosix.includes('/traces/') ||
    relPosix.includes('/saturation/')
  );
}

const hits = [];

for (const root of SCAN_ROOTS) {
  const abs = join(ROOT, root);
  try {
    statSync(abs);
  } catch {
    continue;
  }
  for (const file of walk(abs)) {
    const rel = relative(ROOT, file).split(sep).join('/');
    if (skipPath(rel)) continue;
    if (rel.startsWith('packs/') && !packAllowed(rel)) {
      hits.push({ file: rel, match: 'disallowed pack tree' });
      continue;
    }
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const lower = text.toLowerCase();
    for (const needle of FORBIDDEN) {
      if (lower.includes(needle.toLowerCase())) {
        hits.push({ file: rel, match: needle });
        break;
      }
    }
  }
}

if (hits.length) {
  console.error('host-bleed: forbidden host-brand tokens under packages/ or packs/:\n');
  for (const h of hits.slice(0, 80)) {
    console.error(`  ${h.file}: ${h.match}`);
  }
  if (hits.length > 80) console.error(`  … and ${hits.length - 80} more`);
  process.exit(1);
}

console.log('host-bleed: ok (packages/ + packs/ clean)');
