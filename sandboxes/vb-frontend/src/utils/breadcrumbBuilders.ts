import type { BreadcrumbItem } from '../components/common/Breadcrumb';
import type { UserRead } from '../types/user';
import { getTournamentsListPath } from './roleBasedRouting';

export function homeCrumb(): BreadcrumbItem {
  return { label: 'Home', path: '/' };
}

/** Tournaments list respecting /admin, /director, or public context */
export function tournamentsListCrumb(user: UserRead | null): BreadcrumbItem {
  return {
    label: 'Tournaments',
    path: getTournamentsListPath(user),
  };
}

export function bowlerDashboardCrumb(): BreadcrumbItem {
  return { label: 'Dashboard', path: '/dashboard' };
}

/** Admin / director / user dashboard crumb from current location */
export function layoutDashboardCrumb(pathname: string): BreadcrumbItem {
  if (pathname.startsWith('/admin')) {
    return { label: 'Dashboard', path: '/admin' };
  }
  if (pathname.startsWith('/director')) {
    return { label: 'Dashboard', path: '/director' };
  }
  return bowlerDashboardCrumb();
}
