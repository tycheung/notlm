/**
 * Extract a portable uipilotCLI pack from the VB frontend sandbox (copy only).
 * Does not touch the real react-frontend tree.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = join(root, 'sandboxes', 'vb-frontend');
const outHome = join(root, 'packs', 'vb-director', '.uipilot');

function read(rel) {
  return readFileSync(join(sandbox, rel), 'utf8');
}

function extractObjectLiteral(src, exportName) {
  const marker = `export const ${exportName}`;
  const start = src.indexOf(marker);
  if (start < 0) throw new Error(`Missing ${exportName}`);
  const brace = src.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = brace; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) throw new Error(`Unclosed ${exportName}`);
  let lit = src.slice(brace, end + 1);
  lit = lit.replace(/\/\*[\s\S]*?\*\//g, '');
  lit = lit.replace(/^\s*\/\/.*$/gm, '');
  lit = lit.replace(/:\s*Record<[^>]+>/g, '');
  lit = lit.replace(/as const/g, '');
  lit = lit.replace(/,\s*([\]}])/g, '$1');
  lit = lit.replace(/([{\s,])([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":');
  lit = lit.replace(/'/g, '"');
  return JSON.parse(lit);
}

function extractFlowSteps(src) {
  const marker = 'export const FLOW_STEPS';
  const start = src.indexOf(marker);
  const eq = src.indexOf('=', start);
  const arrStart = src.indexOf('[', eq);
  let depth = 0;
  let end = -1;
  for (let i = arrStart; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  let lit = src.slice(arrStart, end + 1);
  lit = lit.replace(/\/\*[\s\S]*?\*\//g, '');
  lit = lit.replace(/^\s*\/\/.*$/gm, '');
  lit = lit.replace(/,\s*([\]}])/g, '$1');
  lit = lit.replace(/([{\s,])([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":');
  lit = lit.replace(/'/g, '"');
  return JSON.parse(lit).map((step) => ({
    id: step.id,
    title: step.title,
    keywords: step.keywords ?? [],
    kind: step.kind,
    requires: step.requires ?? [],
    ...(step.prefers ? { prefers: step.prefers } : {}),
  }));
}

function extractCorpus(src) {
  const marker = 'export const GUIDE_NLU_CORPUS';
  const start = src.indexOf(marker);
  const eq = src.indexOf('=', start);
  const arrStart = src.indexOf('[', eq);
  let depth = 0;
  let end = -1;
  for (let i = arrStart; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = src.slice(arrStart, end + 1);
  const cases = [];
  const caseRe =
    /\{\s*id:\s*'([^']+)'\s*,\s*utterance:\s*'((?:\\'|[^'])*)'\s*,\s*stepId:\s*(null|'([^']*)')/g;
  let m;
  while ((m = caseRe.exec(body)) !== null) {
    const stepId = m[3] === 'null' ? null : m[4];
    const utterance = m[2].replace(/\\'/g, "'");
    const objEnd = body.indexOf('}', m.index);
    const slice = body.slice(m.index, objEnd > m.index ? objEnd : m.index + 120);
    cases.push({
      id: m[1],
      utterance,
      expect: {
        stepId,
        ...( /\bgoBack:\s*true/.test(slice) ? { goBack: true } : {}),
        ...( /\bisCorrection:\s*true/.test(slice) ? { isCorrection: true } : {}),
      },
    });
  }
  return cases;
}

function extractGuideIds(src) {
  const obj = extractObjectLiteral(src, 'GUIDE_IDS');
  return Object.entries(obj).map(([key, id]) => ({ key, id }));
}

const aliases = extractObjectLiteral(read('src/features/director-guide/intents.ts'), 'STEP_ALIASES');
const flow = extractFlowSteps(read('src/features/director-guide/flowGraph.ts'));
const scenarios = extractCorpus(read('tests/e2e/director-guide/nluCorpus.ts'));
const guideIds = extractGuideIds(read('src/features/director-guide/guideIds.ts'));

const stepToSpotlight = {
  billing_ready: 'guide-subscription',
  bowling_center: 'guide-bowling-centers',
  create_tournament: 'guide-create-tournament',
  create_event: 'guide-create-event',
  apply_format: 'guide-tab-format',
  side_actions: 'guide-tab-side-actions',
  register_participants: 'guide-tab-participants',
  sa_signups: 'guide-tab-side-actions',
  assign_squads: 'guide-tab-squads',
  assign_lanes: 'guide-tab-lanes',
  lock_squads: 'guide-lock-squad',
  lock_sa_entries: 'guide-lock-sa-entries',
  enter_scores: 'guide-tab-scoring',
  advance_rounds: 'guide-tab-scoring',
  run_reports: 'guide-event-reports',
};

const controls = flow.map((step) => ({
  id: stepToSpotlight[step.id] ?? `guide-${step.id.replace(/_/g, '-')}`,
  stepId: step.id,
  path: '/',
  spotlight: stepToSpotlight[step.id] ?? `guide-${step.id.replace(/_/g, '-')}`,
  coachMessage: `Open “${step.title}” via the highlighted control (UI click only).`,
}));

const binders = flow.map((step) => ({
  stepId: step.id,
  path: `data.complete.${step.id}`,
  op: 'truthy',
}));

mkdirSync(join(outHome, 'pack'), { recursive: true });
mkdirSync(join(outHome, 'drafts'), { recursive: true });
mkdirSync(join(outHome, 'traces'), { recursive: true });

const files = {
  'config.json': {
    home: '.uipilot',
    packId: 'vb-director',
    features: { chat: true, palette: true, spotlight: true, voice: true },
    note: 'Extracted from sandboxes/vb-frontend — not the live Victory Bowling app',
  },
  'scenarios.json': scenarios,
  'checklist.json': {
    items: [
      {
        id: 'parity-compare',
        severity: 'info',
        text: 'Compare intents check vs original GUIDE_NLU_CORPUS in sandbox',
      },
      {
        id: 'ui-actions-only',
        severity: 'info',
        text: 'Coach must click data-guide-id controls; never call VB *API clients',
      },
    ],
  },
  'inventory.json': {
    capturedAt: new Date().toISOString(),
    baseUrl: 'sandbox://vb-frontend',
    controls: guideIds.map((g) => ({
      role: 'control',
      name: g.key,
      selectorHint: `[data-guide-id="${g.id}"]`,
      existingGuideId: g.id,
      proposedGuideId: g.id,
      url: '/',
    })),
  },
  'structured-draft.json': {
    generatedAt: new Date().toISOString(),
    source: 'director-guide extract',
    steps: flow.map((s) => s.id),
  },
  'pack/manifest.json': {
    id: 'vb-director',
    version: '0.0.0',
    title: 'Victory Bowling Director Guide (sandbox extract)',
    features: { chat: true, palette: true, spotlight: true, voice: true },
  },
  'pack/flow.json': flow,
  'pack/controls.json': controls,
  'pack/intents.json': {
    aliases,
    meta: ['whats_next', 'go_back', 'explain_field', 'skip_side_actions', 'lookup_participant'],
  },
  'pack/binders.json': binders,
  'pack/corpus.json': scenarios.map((s) => ({
    id: s.id,
    utterance: s.utterance,
    expect: s.expect,
  })),
};

for (const [rel, data] of Object.entries(files)) {
  writeFileSync(join(outHome, rel), `${JSON.stringify(data, null, 2)}\n`);
}

console.log(
  `Wrote ${outHome} — ${flow.length} steps, ${scenarios.length} scenarios, ${Object.keys(aliases).length} alias groups`
);
