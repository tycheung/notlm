export function buildTeamDisplayName(options: {
  teamName?: string | null;
  teamNumber?: number | null;
  memberLastNames?: Array<string | null | undefined>;
}): string {
  const custom = (options.teamName || '').trim();
  if (custom) {
    return custom;
  }
  // Blank custom name: last/last/last in roster order at every team size.
  const parts = (options.memberLastNames || [])
    .map((name) => (name || '').trim())
    .filter(Boolean);
  if (parts.length > 0) {
    return parts.join('/');
  }
  if (options.teamNumber != null) {
    return `Team ${options.teamNumber}`;
  }
  return 'Team';
}
