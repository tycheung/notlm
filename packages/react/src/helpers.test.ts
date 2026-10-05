/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NavResolve } from '@notlm/core';
import { cx } from './cx.js';
import {
  clickGuide,
  clickGuideByPath,
  createGuideNavigate,
} from './clickGuide.js';
import {
  DEFAULT_WELCOME,
  initialThreadState,
  newChatMessage,
} from './chatThreadState.js';
import { applyPrefill } from './fieldPrefill.js';
import {
  coachCopyForRole,
  isSpotlightOnly,
  resolveBeforeOpenIds,
  runBeforeOpen,
} from './guideInteract.js';
import { logExchangeSafe, swallowDispatchError } from './hostTelemetry.js';
import {
  getSpeechRecognitionCtor,
  isWebSpeechSupported,
} from './speech.js';
import {
  clearDraft,
  draftStorageKey,
  readDraft,
  writeDraft,
} from './draftBridge.js';

function nav(partial: Partial<NavResolve> & Pick<NavResolve, 'path'>): NavResolve {
  return partial;
}

describe('cx', () => {
  it('joins truthy parts', () => {
    expect(cx('a', false, undefined, 'b')).toBe('a b');
  });
});

describe('chatThreadState', () => {
  it('builds messages and an initial thread', () => {
    const msg = newChatMessage('user', 'hi', [{ id: 'a', label: 'A' }], {
      intentKey: 'x',
    });
    expect(msg.role).toBe('user');
    expect(msg.choices).toHaveLength(1);
    expect(msg.intentKey).toBe('x');

    const state = initialThreadState('t1');
    expect(state.threads[0]?.id).toBe('t1');
    expect(state.messagesByThread.t1?.[0]?.text).toBe(DEFAULT_WELCOME);
  });
});

describe('clickGuide + navigate', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('clicks by guide id and path segments', () => {
    const btn = document.createElement('button');
    btn.setAttribute('data-guide-id', 'settings');
    const spy = vi.fn();
    btn.addEventListener('click', spy);
    document.body.appendChild(btn);

    expect(clickGuide('')).toBe(false);
    expect(clickGuide('settings')).toBe(true);
    expect(spy).toHaveBeenCalled();
    expect(clickGuideByPath('/settings')).toBe(true);
    expect(clickGuideByPath('/app/settings')).toBe(true);
    expect(clickGuideByPath('/missing')).toBe(false);

    const onMiss = vi.fn();
    createGuideNavigate({ onMiss })('/nope');
    expect(onMiss).toHaveBeenCalledWith('/nope');
  });
});

describe('fieldPrefill', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    sessionStorage.clear();
  });

  it('prefills annotated inputs and skips file inputs', () => {
    const text = document.createElement('input');
    text.setAttribute('data-guide-id', 'name');
    const file = document.createElement('input');
    file.type = 'file';
    file.setAttribute('data-guide-id', 'upload');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.setAttribute('data-guide-id', 'active');
    const select = document.createElement('select');
    select.setAttribute('data-guide-id', 'tier');
    const opt = document.createElement('option');
    opt.value = 'pro';
    select.appendChild(opt);
    document.body.append(text, file, check, select);

    expect(applyPrefill(undefined)).toBe(0);
    const n = applyPrefill(
      { name: 'Ada', upload: 'x', active: 'true', tier: 'pro' },
      { draft: { packId: 'p', draftKey: 'd' } }
    );
    expect(n).toBe(3);
    expect(text.value).toBe('Ada');
    expect(check.checked).toBe(true);
    expect(select.value).toBe('pro');
    expect(readDraft('p', 'd').name).toBe('Ada');
    expect(applyPrefill({ name: 'B' }, { skipDom: true })).toBe(0);
  });
});

describe('guideInteract', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('resolves beforeOpen and role copy', () => {
    expect(
      resolveBeforeOpenIds(
        nav({ path: '/', openMenu: 'menu', beforeOpen: ['tab', 'menu'] })
      )
    ).toEqual(['menu', 'tab']);

    const a = document.createElement('button');
    a.setAttribute('data-guide-id', 'menu');
    document.body.appendChild(a);
    expect(runBeforeOpen(nav({ path: '/', openMenu: 'menu' }))).toBe(1);

    expect(isSpotlightOnly(nav({ path: '/', spotlightOnly: true }))).toBe(true);
    expect(isSpotlightOnly(nav({ path: '/', role: 'upload' }))).toBe(true);
    expect(coachCopyForRole(nav({ path: '/', role: 'upload' }), 's')).toMatch(
      /file/i
    );
    expect(coachCopyForRole(nav({ path: '/', role: 'combobox' }), 's')).toMatch(
      /option/i
    );
    expect(
      coachCopyForRole(nav({ path: '/', confirmDialog: true }), 'step')
    ).toMatch(/Confirm/);
    expect(coachCopyForRole(nav({ path: '/', role: 'dialog' }), 's')).toMatch(
      /dialog/i
    );
    expect(
      coachCopyForRole(nav({ path: '/', wizardId: 'w', wizardPage: 0 }), 's')
    ).toMatch(/Wizard/);
    expect(
      coachCopyForRole(nav({ path: '/', coachMessage: 'x' }), 's')
    ).toBeNull();
  });
});

describe('hostTelemetry + speech + draftBridge', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('swallows rejected dispatch promises', async () => {
    const onError = vi.fn();
    swallowDispatchError(Promise.reject(new Error('boom')), onError);
    await new Promise((r) => setTimeout(r, 0));
    expect(onError).toHaveBeenCalled();
    logExchangeSafe(Promise.resolve(), 'test');
  });

  it('reports speech support from window ctors', () => {
    expect(isWebSpeechSupported()).toBe(false);
    expect(getSpeechRecognitionCtor()).toBeNull();
    (window as unknown as { SpeechRecognition: new () => unknown }).SpeechRecognition =
      class {} as never;
    expect(isWebSpeechSupported()).toBe(true);
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
  });

  it('reads and clears drafts', () => {
    expect(draftStorageKey('p', 'k')).toBe('notlm:draft:p:k');
    writeDraft('p', 'k', { a: 1 });
    expect(readDraft('p', 'k')).toEqual({ a: 1 });
    clearDraft('p', 'k');
    expect(readDraft('p', 'k')).toEqual({});
  });
});
