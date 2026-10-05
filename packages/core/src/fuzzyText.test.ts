import { describe, expect, it } from 'vitest';
import { editDistance } from './fuzzyText.js';

describe('editDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(editDistance('record', 'record')).toBe(0);
  });

  it('scores single-character typos', () => {
    expect(editDistance('creat', 'create')).toBe(1);
  });
});
