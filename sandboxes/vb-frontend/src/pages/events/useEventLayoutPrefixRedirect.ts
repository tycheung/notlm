import { useEffect } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { Role } from '../../types/user';

/** Keep /events/* under /admin or /director for suite roles (navbar/layout). */
export function useEventLayoutPrefixRedirect(opts: {
  pathname: string;
  search: string;
  role: Role | undefined;
  isInBowlerView: boolean;
  navigate: NavigateFunction;
}): void {
  const { pathname, search, role, isInBowlerView, navigate } = opts;
  useEffect(() => {
    if (isInBowlerView) return;
    if (role === Role.ADMIN && pathname.startsWith('/events/')) {
      navigate(`/admin${pathname}${search}`, { replace: true });
    } else if (
      (role === Role.TD || role === Role.SA) &&
      pathname.startsWith('/events/')
    ) {
      navigate(`/director${pathname}${search}`, { replace: true });
    }
  }, [pathname, search, role, isInBowlerView, navigate]);
}
