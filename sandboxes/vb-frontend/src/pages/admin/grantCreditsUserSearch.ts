import type { UserRead } from '../../types/user';

export function matchesGrantCreditUserSearch(user: UserRead, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return false;

  const first = (user.first_name || '').toLowerCase();
  const last = (user.last_name || '').toLowerCase();
  const usbc = (user.usbc_id || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  const fullName = `${first} ${last}`.trim();
  const lastFirst = `${last} ${first}`.trim();

  if (
    fullName.includes(query) ||
    lastFirst.includes(query) ||
    first.includes(query) ||
    last.includes(query) ||
    usbc.includes(query) ||
    email.includes(query) ||
    String(user.id) === query
  ) {
    return true;
  }

  const parts = query.split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return false;
  }
  return parts.every(
    (part) => first.includes(part) || last.includes(part) || usbc.includes(part)
  );
}
