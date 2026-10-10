import { describe, expect, it } from 'vitest';
import { loadPackFromJson } from './loadPack.js';
import type { FlowStepDef } from './types.js';

const flow: FlowStepDef[] = [
  {
    id: 'create_list',
    title: 'Create list',
    keywords: ['create list'],
    kind: 'hard',
    requires: [],
  },
  {
    id: 'add_item',
    title: 'Add item',
    keywords: ['add item'],
    kind: 'hard',
    requires: ['create_list'],
  },
];

describe('loadPackFromJson', () => {
  it('builds runtime pack from JSON inputs', () => {
    const pack = loadPackFromJson({
      manifest: { id: 'demo-todo' },
      flow,
      controls: [
        {
          id: 'nav-create-list',
          stepId: 'create_list',
          path: '/lists/new',
          spotlight: 'create-list-btn',
          coachMessage: 'Create your list here.',
          userFill: ['guide-list-name'],
        },
      ],
      intents: {
        aliases: { create_list: ['make a list'] },
        meta: ['go_back', 'whats_next'],
      },
      binders: {
        create_list: { path: 'data.listCount', op: 'gte', value: 1 },
        add_item: { path: 'data.itemCount', op: 'gte', value: 1 },
      },
    });

    expect(pack.id).toBe('demo-todo');
    expect(pack.steps).toHaveLength(2);
    expect(pack.aliases.create_list).toContain('make a list');
    expect(pack.isComplete.create_list?.({ pathname: '/', data: { listCount: 1 } })).toBe(true);
    expect(
      pack.resolveNav('create_list', { pathname: '/', data: {} })
    ).toMatchObject({
      path: '/lists/new',
      spotlight: 'create-list-btn',
      userFill: ['guide-list-name'],
    });
    expect(pack.resolveNav('add_item', { pathname: '/', data: {} })).toBeNull();
  });

  it('passes interactable orchestration fields through resolveNav', () => {
    const pack = loadPackFromJson({
      manifest: { id: 'lab' },
      flow,
      controls: [
        {
          id: 'nav-create-list',
          stepId: 'create_list',
          path: '/lists/new',
          role: 'menu',
          draftKey: 'list_draft',
          openMenu: 'guide-menu',
          beforeOpen: ['guide-tab'],
          confirmDialog: 'guide-confirm',
          spotlightOnly: true,
          wizardId: 'wiz',
          wizardPage: 0,
          coachCreate: true,
          openModal: 'sheet',
        },
      ],
      intents: { aliases: { create_list: ['make a list'] } },
      binders: {},
    });
    expect(pack.resolveNav('create_list', { pathname: '/', data: {} })).toMatchObject({
      role: 'menu',
      draftKey: 'list_draft',
      openMenu: 'guide-menu',
      beforeOpen: ['guide-tab'],
      confirmDialog: 'guide-confirm',
      spotlightOnly: true,
      wizardId: 'wiz',
      wizardPage: 0,
      coachCreate: true,
      openModal: 'sheet',
    });
  });

  it('omits custom semantic layer when dim mismatches base', () => {
    const baseDocs = [
      {
        id: 'faq-a',
        kind: 'faq' as const,
        texts: ['hello'],
        vector: Array(256).fill(0.01),
      },
    ];
    const pack = loadPackFromJson({
      manifest: { id: 'dim-lab' },
      flow,
      controls: [],
      intents: { aliases: {} },
      binders: {},
      semanticIndex: {
        version: 1,
        dim: 256,
        layer: 'base',
        docs: baseDocs,
      },
      semanticIndexCustom: {
        version: 1,
        dim: 64,
        layer: 'custom',
        docs: [
          {
            id: 'faq-a',
            kind: 'faq',
            texts: ['hello custom'],
            vector: Array(64).fill(0.01),
          },
        ],
      },
    });
    expect(pack.semanticIndexLayers).toHaveLength(1);
    expect(pack.semanticIndexLayers?.[0]?.layer).toBe('base');
    expect(pack.semanticIndex?.dim).toBe(256);
  });

  it('omits custom when base dim is omitted but vectors imply a different width', () => {
    const pack = loadPackFromJson({
      manifest: { id: 'dim-omit' },
      flow,
      controls: [],
      intents: { aliases: {} },
      binders: {},
      semanticIndex: {
        version: 1,
        dim: 0 as unknown as number,
        layer: 'base',
        docs: [
          {
            id: 'faq-a',
            kind: 'faq',
            texts: ['hello'],
            vector: Array(256).fill(0.01),
          },
        ],
      },
      semanticIndexCustom: {
        version: 1,
        dim: 64,
        layer: 'custom',
        docs: [
          {
            id: 'faq-a',
            kind: 'faq',
            texts: ['hello custom'],
            vector: Array(64).fill(0.01),
          },
        ],
      },
    });
    expect(pack.semanticIndexLayers).toHaveLength(1);
    expect(pack.semanticIndexLayers?.[0]?.layer).toBe('base');
  });
});
