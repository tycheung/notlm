import { describe, expect, it } from 'vitest';
import { parseNaiveDateTimeToDate } from '../../../src/utils/dateUtils';

describe('event start scoring gate helpers', () => {
  it('treats future start as blocking scoring', () => {
    const future = '2099-01-15T12:00:00';
    const start = parseNaiveDateTimeToDate(future);
    expect(start).not.toBeNull();
    expect(start!.getTime()).toBeGreaterThan(Date.now());
  });

  it('treats past start as allowing scoring', () => {
    const past = '2020-01-15T12:00:00';
    const start = parseNaiveDateTimeToDate(past);
    expect(start).not.toBeNull();
    expect(start!.getTime()).toBeLessThan(Date.now());
  });
});
