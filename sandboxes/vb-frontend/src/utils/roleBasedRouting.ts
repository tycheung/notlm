import { Role, UserRead } from '../types/user';

/**
 * Role-aware URLs for the duplicated route trees in App.tsx (public, /director, /admin).
 * Prefer useRoleAwareNavigation in shared pages; avoid hardcoded navigate('/rounds/...') etc.
 *
 * Route categories based on the layout structure in App.tsx:
 */
export enum RouteCategory {
  // Routes that need layout awareness
  TOURNAMENTS = 'tournaments',
  EVENTS = 'events',
  SQUADS = 'squads',
  ROUNDS = 'rounds',
  GAMES = 'games',
  PARTICIPANTS = 'participants',
  BOWLING_CENTERS = 'bowling-centers',
  ACCOUNT = 'account',
  DASHBOARD = 'dashboard',
  
  // Routes that are public-only
  AUTH = 'auth',
  HOME = 'home',
  
  // Routes that are role-specific only
  ADMIN_ONLY = 'admin-only',
  DIRECTOR_ONLY = 'director-only',
}

/**
 * Configuration for each route category
 */
const ROUTE_CONFIG: Record<RouteCategory, {
  hasPublicAccess: boolean;
  hasDirectorAccess: boolean;
  hasAdminAccess: boolean;
  publicPrefix: string;
  directorPrefix: string;
  adminPrefix: string;
}> = {
  [RouteCategory.TOURNAMENTS]: {
    hasPublicAccess: true,
    hasDirectorAccess: true,
    hasAdminAccess: true,
    publicPrefix: '',
    directorPrefix: '/director',
    adminPrefix: '/admin',
  },
  [RouteCategory.EVENTS]: {
    hasPublicAccess: true,
    hasDirectorAccess: true,
    hasAdminAccess: true,
    publicPrefix: '',
    directorPrefix: '/director',
    adminPrefix: '/admin',
  },
  [RouteCategory.SQUADS]: {
    hasPublicAccess: true,
    hasDirectorAccess: true,
    hasAdminAccess: true,
    publicPrefix: '',
    directorPrefix: '/director',
    adminPrefix: '/admin',
  },
  [RouteCategory.ROUNDS]: {
    hasPublicAccess: true,
    hasDirectorAccess: true,
    hasAdminAccess: true,
    publicPrefix: '',
    directorPrefix: '/director',
    adminPrefix: '/admin',
  },
  [RouteCategory.GAMES]: {
    hasPublicAccess: true,
    hasDirectorAccess: true,
    hasAdminAccess: true,
    publicPrefix: '',
    directorPrefix: '/director',
    adminPrefix: '/admin',
  },
  [RouteCategory.PARTICIPANTS]: {
    hasPublicAccess: false,
    hasDirectorAccess: true,
    hasAdminAccess: true,
    publicPrefix: '',
    directorPrefix: '/director',
    adminPrefix: '/admin',
  },
  [RouteCategory.BOWLING_CENTERS]: {
    hasPublicAccess: false,
    hasDirectorAccess: true,
    hasAdminAccess: true,
    publicPrefix: '',
    directorPrefix: '/director',
    adminPrefix: '/admin',
  },
  [RouteCategory.ACCOUNT]: {
    hasPublicAccess: true,
    hasDirectorAccess: true,
    hasAdminAccess: true,
    publicPrefix: '',
    directorPrefix: '/director',
    adminPrefix: '/admin',
  },
  [RouteCategory.DASHBOARD]: {
    hasPublicAccess: true,
    hasDirectorAccess: true,
    hasAdminAccess: true,
    publicPrefix: '/dashboard',
    directorPrefix: '/director',
    adminPrefix: '/admin',
  },
  // Routes that don't need role-aware prefixing
  [RouteCategory.AUTH]: {
    hasPublicAccess: true,
    hasDirectorAccess: false,
    hasAdminAccess: false,
    publicPrefix: '',
    directorPrefix: '',
    adminPrefix: '',
  },
  [RouteCategory.HOME]: {
    hasPublicAccess: true,
    hasDirectorAccess: false,
    hasAdminAccess: false,
    publicPrefix: '',
    directorPrefix: '',
    adminPrefix: '',
  },
  [RouteCategory.ADMIN_ONLY]: {
    hasPublicAccess: false,
    hasDirectorAccess: false,
    hasAdminAccess: true,
    publicPrefix: '',
    directorPrefix: '',
    adminPrefix: '/admin',
  },
  [RouteCategory.DIRECTOR_ONLY]: {
    hasPublicAccess: false,
    hasDirectorAccess: true,
    hasAdminAccess: false,
    publicPrefix: '',
    directorPrefix: '/director',
    adminPrefix: '',
  },
};

/**
 * Get the appropriate route prefix based on user role
 */
export const getRolePrefix = (user: UserRead | null): string => {
  if (!user) return '';
  
  switch (user.role) {
    case Role.ADMIN:
      return '/admin';
    case Role.TD:
    case Role.SA:
      return '/director';
    default:
      return '';
  }
};

/**
 * Get the appropriate route for a user based on their role and the route category
 */
export const getRoleAwarePath = (
  basePath: string,
  user: UserRead | null,
  options: {
    category?: RouteCategory;
    forcePublic?: boolean;
    preserveQuery?: boolean;
  } = {}
): string => {
  const { category, forcePublic = false, preserveQuery = false } = options;
  
  // Extract query parameters if needed
  const [cleanPath, queryString] = basePath.split('?');
  const finalQuery = preserveQuery && queryString ? `?${queryString}` : '';
  
  // If forcing public route or no user, return public path
  if (forcePublic || !user) {
    return `${cleanPath}${finalQuery}`;
  }
  
  // If no category provided, use basic role prefixing
  if (!category) {
    const prefix = getRolePrefix(user);
    return `${prefix}${cleanPath}${finalQuery}`;
  }
  
  // Use category-specific logic
  const config = ROUTE_CONFIG[category];
  if (!config) {
    // Fallback to basic prefixing
    const prefix = getRolePrefix(user);
    return `${prefix}${cleanPath}${finalQuery}`;
  }
  
  // Determine the appropriate prefix based on role and access
  let prefix = '';
  switch (user.role) {
    case Role.ADMIN:
      if (config.hasAdminAccess) {
        prefix = config.adminPrefix;
      } else if (config.hasPublicAccess) {
        prefix = config.publicPrefix;
      }
      break;
    case Role.TD:
    case Role.SA:
      if (config.hasDirectorAccess) {
        prefix = config.directorPrefix;
      } else if (config.hasPublicAccess) {
        prefix = config.publicPrefix;
      }
      break;
    default:
      if (config.hasPublicAccess) {
        prefix = config.publicPrefix;
      }
      break;
  }
  
  return `${prefix}${cleanPath}${finalQuery}`;
};

/**
 * Convenience functions for common route types
 */
export const getTournamentPath = (tournamentId: number | string, user: UserRead | null, subPath?: string): string => {
  const path = subPath ? `/tournaments/${tournamentId}${subPath}` : `/tournaments/${tournamentId}`;
  return getRoleAwarePath(path, user, { category: RouteCategory.TOURNAMENTS });
};

export const getEventPath = (eventId: number | string, user: UserRead | null, subPath?: string): string => {
  const path = subPath ? `/events/${eventId}${subPath}` : `/events/${eventId}`;
  return getRoleAwarePath(path, user, { category: RouteCategory.EVENTS });
};

export const getSquadPath = (squadId: number | string, user: UserRead | null, subPath?: string): string => {
  const path = subPath ? `/squads/${squadId}${subPath}` : `/squads/${squadId}`;
  return getRoleAwarePath(path, user, { category: RouteCategory.SQUADS });
};

export const getRoundPath = (roundId: number | string, user: UserRead | null, subPath?: string): string => {
  const path = subPath ? `/rounds/${roundId}${subPath}` : `/rounds/${roundId}`;
  return getRoleAwarePath(path, user, { category: RouteCategory.ROUNDS });
};

export const getGamePath = (gameId: number | string, user: UserRead | null, subPath?: string): string => {
  const path = subPath ? `/games/${gameId}${subPath}` : `/games/${gameId}`;
  return getRoleAwarePath(path, user, { category: RouteCategory.GAMES });
};

export const getBowlingCentersPath = (user: UserRead | null): string => {
  return getRoleAwarePath('/bowling-centers', user, { category: RouteCategory.BOWLING_CENTERS });
};

export const getAccountPath = (user: UserRead | null): string => {
  return getRoleAwarePath('/account', user, { category: RouteCategory.ACCOUNT });
};

export const getDashboardPath = (user: UserRead | null): string => {
  return getRoleAwarePath('', user, { category: RouteCategory.DASHBOARD });
};

/**
 * Get tournaments list path based on user role
 */
export const getTournamentsListPath = (user: UserRead | null): string => {
  if (!user) return '/tournaments';
  
  switch (user.role) {
    case Role.ADMIN:
    case Role.TD:
    case Role.SA:
      // Directors and admins have management pages
      return getRoleAwarePath('/tournaments', user, { category: RouteCategory.TOURNAMENTS });
    default:
      // Regular users go to the public tournament list
      return '/tournaments';
  }
};

export const getSideActionManagementPath = (user: UserRead | null): string => {
  return getRoleAwarePath('/side-actions', user, { category: RouteCategory.TOURNAMENTS });
};

export const getSaEventPath = (
  eventId: number | string,
  user: UserRead | null,
  subPath?: string
): string => {
  const path = subPath
    ? `/side-actions/events/${eventId}${subPath}`
    : `/side-actions/events/${eventId}`;
  return getRoleAwarePath(path, user, { category: RouteCategory.TOURNAMENTS });
};

/**
 * Hook-like function to be used in components
 */
export const useRoleAwareNavigation = (user: UserRead | null) => {
  return {
    getTournamentPath: (tournamentId: number | string, subPath?: string) => 
      getTournamentPath(tournamentId, user, subPath),
    getEventPath: (eventId: number | string, subPath?: string) => 
      getEventPath(eventId, user, subPath),
    getSquadPath: (squadId: number | string, subPath?: string) => 
      getSquadPath(squadId, user, subPath),
    getRoundPath: (roundId: number | string, subPath?: string) => 
      getRoundPath(roundId, user, subPath),
    getGamePath: (gameId: number | string, subPath?: string) => 
      getGamePath(gameId, user, subPath),
    getBowlingCentersPath: () => getBowlingCentersPath(user),
    getAccountPath: () => getAccountPath(user),
    getDashboardPath: () => getDashboardPath(user),
    getTournamentsListPath: () => getTournamentsListPath(user),
    getSideActionManagementPath: () => getSideActionManagementPath(user),
    getSaEventPath: (eventId: number | string, subPath?: string) =>
      getSaEventPath(eventId, user, subPath),
    getRoleAwarePath: (basePath: string, options?: Parameters<typeof getRoleAwarePath>[2]) => 
      getRoleAwarePath(basePath, user, options),
  };
};

/**
 * Legacy compatibility - matches the existing pattern used in components
 */
export const getDetailsPath = (tournamentId: number | string, user: UserRead | null): string => {
  return getTournamentPath(tournamentId, user);
}; 