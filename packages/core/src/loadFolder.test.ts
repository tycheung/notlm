import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  loadPackJsonFromNotlmHome,
  loadNotlmHomeFromDir,
  normalizeBindersMap,
  resolveNotlmHomeDir,
} from './loadFolder.js';
import { SEMANTIC_INDEX_VERSION } from './semanticRetrieve.js';

const tmpHomes: string[] = [];
afterEach(() => {
  for (const d of tmpHomes.splice(0)) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

const assistantRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../');
const demoTodoRoot = join(assistantRoot, 'packs/demo-todo');

describe('normalizeBindersMap', () => {
  it('maps array binders by stepId', () => {
    expect(
      normalizeBindersMap([
        { stepId: 'a', path: 'data.x', op: 'truthy' },
        { stepId: 'b', path: 'data.y', op: 'eq', value: 1 },
      ])
    ).toEqual({
      a: { path: 'data.x', op: 'truthy' },
      b: { path: 'data.y', op: 'eq', value: 1 },
    });
  });

  it('passes through object binders', () => {
    const obj = { a: { path: 'data.x', op: 'truthy' as const } };
    expect(normalizeBindersMap(obj)).toEqual(obj);
  });
});

describe('loadNotlmHomeFromDir', () => {
  it('resolves project root vs nested NotLM home', () => {
    const fromRoot = resolveNotlmHomeDir(demoTodoRoot);
    expect(fromRoot.home.replace(/\\/g, '/')).toMatch(/packs\/demo-todo\/\.notlm$/);

    const fromHome = resolveNotlmHomeDir(fromRoot.home);
    expect(fromHome.home).toBe(fromRoot.home);
    expect(fromHome.projectRoot).toBe(fromRoot.projectRoot);
  });

  it('loads demo-todo pack from disk', () => {
    const { pack, packJson } = loadNotlmHomeFromDir(demoTodoRoot);
    expect(pack.id).toBe('demo-todo');
    expect(pack.steps.length).toBeGreaterThanOrEqual(2);
    expect(packJson.binders.create_list).toMatchObject({
      path: 'data.listCount',
      op: 'gte',
      value: 1,
    });
    expect(pack.isComplete.create_list?.({ pathname: '/', data: { listCount: 1 } })).toBe(true);
    expect(pack.resolveNav('create_list', { pathname: '/', data: {} })).toMatchObject({
      spotlight: expect.any(String),
    });
    expect(pack.faq?.some((e) => e.id === 'greeting')).toBe(true);
    expect(pack.faq?.some((e) => e.id === 'local_only')).toBe(true);
  });

  it('loadPackJsonFromNotlmHome requires pack pieces', () => {
    expect(() => loadPackJsonFromNotlmHome(join(demoTodoRoot, 'missing-home'))).toThrow(/Missing/);
  });

  it('loads semantic-index.json and semantic-index.custom.json', () => {
    const root = mkdtempSync(join(tmpdir(), 'notlm-load-sem-'));
    tmpHomes.push(root);
    const home = join(root, '.notlm');
    const pack = join(home, 'pack');
    mkdirSync(pack, { recursive: true });
    const stub = (id: string) => JSON.stringify({ id });
    for (const name of [
      'manifest',
      'flow',
      'controls',
      'intents',
      'binders',
    ] as const) {
      writeFileSync(
        join(pack, `${name}.json`),
        name === 'manifest'
          ? stub('tmp-sem')
          : name === 'flow' || name === 'controls'
            ? '[]'
            : name === 'intents'
              ? '{"aliases":{}}'
              : '{}',
        'utf8'
      );
    }
    writeFileSync(
      join(pack, 'semantic-index.json'),
      JSON.stringify({
        version: SEMANTIC_INDEX_VERSION,
        dim: 256,
        layer: 'base',
        docs: [
          {
            id: 'faq-a',
            kind: 'faq',
            texts: ['hello'],
            vector: Array(256).fill(0),
          },
        ],
      }),
      'utf8'
    );
    writeFileSync(
      join(pack, 'semantic-index.custom.json'),
      JSON.stringify({
        version: SEMANTIC_INDEX_VERSION,
        dim: 256,
        layer: 'custom',
        docs: [
          {
            id: 'faq-a',
            kind: 'faq',
            texts: ['hello paraphrase'],
            vector: Array(256).fill(0),
          },
        ],
      }),
      'utf8'
    );
    const packJson = loadPackJsonFromNotlmHome(home);
    expect(packJson.semanticIndex?.docs).toHaveLength(1);
    expect(packJson.semanticIndexCustom?.docs).toHaveLength(1);
    expect(packJson.semanticIndexCustom?.layer).toBe('custom');
  });

  it('loads mutations.json, tours.json, and search.json catalogs', () => {
    const root = mkdtempSync(join(tmpdir(), 'notlm-load-cap-'));
    tmpHomes.push(root);
    const home = join(root, '.notlm');
    const pack = join(home, 'pack');
    mkdirSync(pack, { recursive: true });
    const stub = (id: string) => JSON.stringify({ id });
    for (const name of [
      'manifest',
      'flow',
      'controls',
      'intents',
      'binders',
    ] as const) {
      writeFileSync(
        join(pack, `${name}.json`),
        name === 'manifest'
          ? stub('tmp-cap')
          : name === 'flow' || name === 'controls'
            ? '[]'
            : name === 'intents'
              ? '{"aliases":{}}'
              : '{}',
        'utf8'
      );
    }
    writeFileSync(
      join(pack, 'mutations.json'),
      JSON.stringify({
        mutations: [
          { id: 'm1', title: 'Mut', aliases: ['do mut'], risk: 'low' },
        ],
      }),
      'utf8'
    );
    writeFileSync(
      join(pack, 'tours.json'),
      JSON.stringify({
        tours: [{ id: 't1', title: 'Tour', aliases: ['show tour'], steps: [] }],
      }),
      'utf8'
    );
    writeFileSync(
      join(pack, 'search.json'),
      JSON.stringify({
        search: [{ id: 's1', title: 'Search', aliases: ['find it'], stepId: 'a' }],
      }),
      'utf8'
    );
    const packJson = loadPackJsonFromNotlmHome(home);
    expect(packJson.mutations).toEqual([
      { id: 'm1', title: 'Mut', aliases: ['do mut'], risk: 'low' },
    ]);
    expect(packJson.tours).toEqual([
      { id: 't1', title: 'Tour', aliases: ['show tour'], steps: [] },
    ]);
    expect(packJson.search).toEqual([
      { id: 's1', title: 'Search', aliases: ['find it'], stepId: 'a' },
    ]);
  });
});
