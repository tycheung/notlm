import { Role } from '../types/user';

export function isDirectorSuiteRole(role: Role | undefined | null): boolean {
  return role === Role.ADMIN || role === Role.TD || role === Role.SA;
}

export function isFullTdRole(role: Role | undefined | null): boolean {
  return role === Role.ADMIN || role === Role.TD;
}

export function isSaOnlyRole(role: Role | undefined | null): boolean {
  return role === Role.SA;
}

export function roleDisplayLabel(role: Role | string | undefined | null): string {
  switch (role) {
    case Role.ADMIN:
    case 'admin':
      return 'Admin';
    case Role.TD:
    case 'tournament_director':
      return 'Tournament Director';
    case Role.SA:
    case 'side_action_only':
      return 'Side Action Only';
    case Role.BOWLER:
    case 'bowler':
      return 'Bowler';
    case Role.GUEST:
    case 'guest':
      return 'Guest';
    default:
      return role ? String(role) : '';
  }
}

export function roleBadgeClass(role: Role | string): string {
  switch (role) {
    case Role.ADMIN:
    case 'admin':
      return 'bg-purple-100 text-purple-800';
    case Role.TD:
    case 'tournament_director':
      return 'bg-blue-100 text-blue-800';
    case Role.SA:
    case 'side_action_only':
      return 'bg-amber-100 text-amber-800';
    case Role.BOWLER:
    case 'bowler':
      return 'bg-green-100 text-green-800';
    case Role.GUEST:
    case 'guest':
      return 'bg-surface-light text-text';
    default:
      return 'bg-surface-light text-text';
  }
}

export function getDashboardRoute(role: Role | undefined | null): string {
  if (!role) return '/dashboard';

  switch (role) {
    case Role.ADMIN:
      return '/admin';
    case Role.TD:
    case Role.SA:
      return '/director';
    case Role.BOWLER:
    default:
      return '/dashboard';
  }
}
