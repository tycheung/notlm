/**
 * Whether a sidebar nav item should show as active.
 * Section roots like /admin and /director only match exactly, so
 * /director/tournaments does not keep "Dashboard" highlighted.
 */
export function navPathMatches(pathname: string, navPath: string): boolean {
  const p = pathname.replace(/\/$/, '') || '/';
  const n = navPath.replace(/\/$/, '') || '/';
  if (p === n) return true;
  if (!p.startsWith(`${n}/`)) return false;
  const exactOnlyRoots = ['/admin', '/director'];
  if (exactOnlyRoots.includes(n)) return false;
  return true;
}
