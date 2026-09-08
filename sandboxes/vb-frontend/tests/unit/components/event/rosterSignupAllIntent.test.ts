import { describe, expect, it } from 'vitest';
import { parseSignupQuantityInput } from '@/components/event/rosterSignupUtils';

describe('parseSignupQuantityInput All intent', () => {
  it('does not persist when All estimate is unchanged on blur', () => {
    const result = parseSignupQuantityInput('42', 42, 100, { isAll: true });
    expect(result.shouldPersist).toBe(false);
    expect(result.value).toBe(42);
  });

  it('does not clear All when field is emptied', () => {
    const result = parseSignupQuantityInput('', 42, 100, { isAll: true });
    expect(result.shouldPersist).toBe(false);
    expect(result.value).toBe(42);
  });

  it('persists finite qty when user types a different number while All', () => {
    const result = parseSignupQuantityInput('10', 42, 100, { isAll: true });
    expect(result.shouldPersist).toBe(true);
    expect(result.value).toBe(10);
  });

  it('does not clamp All display estimate through max_entries on unchanged blur', () => {
    const result = parseSignupQuantityInput('150', 150, 100, { isAll: true });
    expect(result.shouldPersist).toBe(false);
    expect(result.value).toBe(150);
  });

  it('clamps when converting All to a typed finite over max', () => {
    const result = parseSignupQuantityInput('150', 42, 100, { isAll: true });
    expect(result.shouldPersist).toBe(true);
    expect(result.value).toBe(100);
  });
});
