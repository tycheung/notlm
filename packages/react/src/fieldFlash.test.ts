/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  flashGuideFieldsSequential,
  sortGuideIdsByDocumentOrder,
} from './fieldFlash.js';

describe('sortGuideIdsByDocumentOrder', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input data-guide-id="guide-b" />
      <input data-guide-id="guide-a" />
      <input data-guide-id="guide-c" />
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('orders by document position top to bottom', () => {
    expect(sortGuideIdsByDocumentOrder(['guide-c', 'guide-a', 'guide-b'])).toEqual([
      'guide-b',
      'guide-a',
      'guide-c',
    ]);
  });

  it('drops missing guide ids', () => {
    expect(sortGuideIdsByDocumentOrder(['guide-a', 'missing', 'guide-b'])).toEqual([
      'guide-b',
      'guide-a',
    ]);
  });
});

describe('flashGuideFieldsSequential', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <input data-guide-id="guide-name" value="" />
      <input data-guide-id="guide-email" value="" />
    `;
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('blinks each field then advances to the next', () => {
    const cancel = flashGuideFieldsSequential(['guide-email', 'guide-name'], { gapMs: 100 });
    vi.runOnlyPendingTimers(); // start first
    expect(document.querySelector('[data-guide-id="guide-name"]')?.classList.contains('notlm-field-flash')).toBe(
      true
    );
    expect(document.querySelector('[data-guide-id="guide-email"]')?.classList.contains('notlm-field-flash')).toBe(
      false
    );

    vi.advanceTimersByTime(700 * 3); // finish first blinks
    vi.advanceTimersByTime(100); // gap
    expect(document.querySelector('[data-guide-id="guide-email"]')?.classList.contains('notlm-field-flash')).toBe(
      true
    );
    cancel();
  });
});
