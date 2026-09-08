export function legalName(user: {
  first_name?: string | null;
  last_name?: string | null;
}): string {
  return `${user.first_name || ''} ${user.last_name || ''}`.trim();
}

/** Public TD label. Display name never replaces the legal name. */
export function formatDirectorIdentity(user: {
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  email?: string | null;
}): string {
  const legal = legalName(user);
  const display = (user.display_name || '').trim();
  if (display && legal && display.toLowerCase() !== legal.toLowerCase()) {
    return `${display} (${legal})`;
  }
  return legal || display || (user.email || '').trim();
}
