// Force HTTPS for remote APIs; keep HTTP for local development
export const isLocalApiUrl = (url: string): boolean =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url);

/**
 * Enhanced function to ensure URL uses HTTPS
 */
export const ensureHttps = (url: string): string => {
  // Handle null/undefined URLs
  if (!url) return url;

  // Direct HTTP to HTTPS conversion for non-local URLs
  if (url.startsWith('http:') && !isLocalApiUrl(url)) {
    return url.replace(/^http:\/\//i, 'https://');
  }

  // Convert protocol-relative URLs (starting with //)
  if (url.startsWith('//')) {
    return `https:${url}`;
  }

  // Add protocol if missing for our domain
  if (!url.startsWith('http') &&
      (url.includes('victorybowling.com') || url.includes('api.victorybowling'))) {
    return `https://${url.replace(/^\/\//, '')}`;
  }

  return url;
};

/**
 * FastAPI list routes are declared at "/" and expect a trailing slash on the mount path.
 * Without it, Starlette issues a redirect that breaks local HTTP dev.
 */
export const needsTrailingSlash = (url: string): boolean => {
  if (!url || url.includes('?') || url.endsWith('/')) return false;
  if (url.match(/\.[a-z]+$/i)) return false;
  const segments = url.split('/').filter(Boolean);
  if (segments.length === 0) return false;
  const last = segments[segments.length - 1];
  if (/^\d+$/.test(last)) return false;
  const noSlashActions = new Set([
    'search', 'recommended', 'near-me', 'me', 'login', 'refresh', 'logout', 'token',
    // Action POSTs registered without a trailing slash (Starlette 307 otherwise)
    'batch-assign', 'batch-remove', 'batch-reentry', 'batch-team-operations',
  ]);
  if (noSlashActions.has(last)) return false;
  if (segments.length > 2) return false;
  return true;
};

/**
 * Ensures path components end with a trailing slash to prevent redirects
 */
export const addTrailingSlash = (url: string): string => {
  if (!url) return url;

  // Skip URLs with query parameters or file extensions
  if (url.includes('?') || url.match(/\.[a-z]+$/i)) {
    return url;
  }

  // Add trailing slash if not present
  return url.endsWith('/') ? url : `${url}/`;
};
