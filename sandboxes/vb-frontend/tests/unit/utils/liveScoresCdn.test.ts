import { describe, expect, it } from 'vitest';
import {
  liveBoardPath,
  livePointerPath,
  nextLivePollDelayMs,
  normalizeLiveAsOf,
  shouldPollLiveBoard,
} from '../../../src/utils/liveScoresCdn';

describe('liveScoresCdn helpers', () => {
  it('builds same-origin live object paths', () => {
    expect(livePointerPath(4, 8)).toBe('/live/4/8/v.json');
    expect(liveBoardPath(4, 8, '1700')).toBe('/live/4/8/1700.json');
  });

  it('polls only when in progress and visible', () => {
    expect(shouldPollLiveBoard('in_progress', 'visible')).toBe(true);
    expect(shouldPollLiveBoard('in_progress', 'hidden')).toBe(false);
    expect(shouldPollLiveBoard('completed', 'visible')).toBe(false);
  });

  it('adds 0-2s jitter to the 5s poll', () => {
    expect(nextLivePollDelayMs(() => 0)).toBe(5000);
    expect(nextLivePollDelayMs(() => 0.999)).toBe(6998);
  });

  it('normalizes as-of timestamps for naive display', () => {
    expect(normalizeLiveAsOf('2026-08-19 12:00:00')).toBe('2026-08-19T12:00:00');
    expect(normalizeLiveAsOf('2026-08-19T12:00:00')).toBe('2026-08-19T12:00:00');
  });
});
