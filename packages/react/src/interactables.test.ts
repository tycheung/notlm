/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearDraft,
  clickGuide,
  clickGuideByPath,
  createGuideNavigate,
  readDraft,
  resolveBeforeOpenIds,
  writeDraft,
  isSpotlightOnly,
} from './index.js';
import type { NavResolve } from '@uipilot/core';

describe('draftBridge', () => {
  beforeEach(() => {
    clearDraft('demo-todo', 'list_draft');
  });

  it('writes and reads shared draft bags', () => {
    writeDraft('demo-todo', 'list_draft', { name: 'Shopping' });
    expect(readDraft('demo-todo', 'list_draft')).toEqual({ name: 'Shopping' });
    writeDraft('demo-todo', 'list_draft', { note: 'x' });
    expect(readDraft('demo-todo', 'list_draft')).toEqual({ name: 'Shopping', note: 'x' });
  });
});

describe('clickGuide', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('clicks by guide id and path alias', () => {
    let clicked = 0;
    const btn = document.createElement('button');
    btn.setAttribute('data-guide-id', 'guide-create-list');
    btn.addEventListener('click', () => {
      clicked += 1;
    });
    document.body.appendChild(btn);
    expect(clickGuide('guide-create-list')).toBe(true);
    expect(clickGuideByPath('/guide-create-list')).toBe(true);
    expect(clicked).toBe(2);
    const navigate = createGuideNavigate();
    navigate('guide-create-list');
    expect(clicked).toBe(3);
  });
});

describe('guideInteract', () => {
  it('orders openMenu before beforeOpen and flags spotlightOnly', () => {
    const nav: NavResolve = {
      path: 'x',
      openMenu: 'menu',
      beforeOpen: ['tab', 'menu'],
      role: 'upload',
    };
    expect(resolveBeforeOpenIds(nav)).toEqual(['menu', 'tab']);
    expect(isSpotlightOnly(nav)).toBe(true);
    expect(isSpotlightOnly({ path: 'x', spotlightOnly: true })).toBe(true);
    expect(isSpotlightOnly({ path: 'x', role: 'cta' })).toBe(false);
  });
});
