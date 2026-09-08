import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  loadPackJsonFromUipilotHome,
  loadUipilotHomeFromDir,
  normalizeBindersMap,
  resolveUipilotHomeDir,
} from './loadFolder.js';

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

describe('loadUipilotHomeFromDir', () => {
  it('resolves project root vs nested UiPilot home', () => {
    const fromRoot = resolveUipilotHomeDir(demoTodoRoot);
    expect(fromRoot.home.replace(/\\/g, '/')).toMatch(/packs\/demo-todo\/\.uipilot$/);

    const fromHome = resolveUipilotHomeDir(fromRoot.home);
    expect(fromHome.home).toBe(fromRoot.home);
    expect(fromHome.projectRoot).toBe(fromRoot.projectRoot);
  });

  it('loads demo-todo pack from disk', () => {
    const { pack, packJson } = loadUipilotHomeFromDir(demoTodoRoot);
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

  it('loadPackJsonFromUipilotHome requires pack pieces', () => {
    expect(() => loadPackJsonFromUipilotHome(join(demoTodoRoot, 'missing-home'))).toThrow(/Missing/);
  });
});
