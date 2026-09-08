import { describe, expect, it } from 'vitest';

import { ensureHttps, needsTrailingSlash } from '@/api/httpUtils';

describe('ensureHttps', () => {
  it('leaves empty URLs unchanged', () => {
    expect(ensureHttps('')).toBe('');
  });

  it('upgrades remote HTTP to HTTPS', () => {
    expect(ensureHttps('http://api.victorybowling.com/events')).toBe(
      'https://api.victorybowling.com/events'
    );
  });

  it('keeps local HTTP URLs unchanged', () => {
    expect(ensureHttps('http://localhost:8000/api/v1/events')).toBe(
      'http://localhost:8000/api/v1/events'
    );
  });

  it('converts protocol-relative URLs to HTTPS', () => {
    expect(ensureHttps('//api.victorybowling.com/events')).toBe(
      'https://api.victorybowling.com/events'
    );
  });

  it('adds HTTPS for bare victorybowling.com paths', () => {
    expect(ensureHttps('api.victorybowling.com/events')).toBe(
      'https://api.victorybowling.com/events'
    );
  });
});

describe('needsTrailingSlash', () => {
  it('returns false for empty, query, or already-slashed paths', () => {
    expect(needsTrailingSlash('')).toBe(false);
    expect(needsTrailingSlash('/events?foo=bar')).toBe(false);
    expect(needsTrailingSlash('/events/')).toBe(false);
  });

  it('returns false for file extensions and numeric ids', () => {
    expect(needsTrailingSlash('/events.json')).toBe(false);
    expect(needsTrailingSlash('/events/42')).toBe(false);
  });

  it('returns false for action endpoints that omit trailing slashes', () => {
    expect(needsTrailingSlash('/users/me')).toBe(false);
    expect(needsTrailingSlash('/auth/login')).toBe(false);
    expect(needsTrailingSlash('/squads/batch-assign')).toBe(false);
    expect(needsTrailingSlash('/squads/batch-remove')).toBe(false);
  });

  it('returns true for shallow collection routes', () => {
    expect(needsTrailingSlash('/events')).toBe(true);
    expect(needsTrailingSlash('/users')).toBe(true);
  });

  it('returns false for deeply nested paths', () => {
    expect(needsTrailingSlash('/events/1/rounds')).toBe(false);
  });
});
