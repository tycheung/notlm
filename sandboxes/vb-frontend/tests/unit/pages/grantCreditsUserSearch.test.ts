import { describe, expect, it } from 'vitest';
import { Role, type UserRead } from '@/types/user';
import { matchesGrantCreditUserSearch } from '@/pages/admin/grantCreditsUserSearch';

const td = {
  id: 2,
  first_name: 'Director',
  last_name: 'Test',
  email: 'td@example.com',
  usbc_id: 'TD123456',
  role: Role.TD,
} as UserRead;

describe('matchesGrantCreditUserSearch', () => {
  it('matches first name, last name, full name, and USBC', () => {
    expect(matchesGrantCreditUserSearch(td, 'director')).toBe(true);
    expect(matchesGrantCreditUserSearch(td, 'test')).toBe(true);
    expect(matchesGrantCreditUserSearch(td, 'Director Test')).toBe(true);
    expect(matchesGrantCreditUserSearch(td, 'TD123456')).toBe(true);
    expect(matchesGrantCreditUserSearch(td, 'td123')).toBe(true);
  });

  it('does not match unrelated queries', () => {
    expect(matchesGrantCreditUserSearch(td, 'john')).toBe(false);
    expect(matchesGrantCreditUserSearch(td, '')).toBe(false);
  });
});
