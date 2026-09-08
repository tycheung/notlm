import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig, AxiosRequestConfig } from 'axios';
import { devError, devLog } from './devLog';
import { addTrailingSlash, ensureHttps, isLocalApiUrl, needsTrailingSlash } from './httpUtils';

// Get API URL from environment variable
let API_URL = import.meta.env.VITE_API_URL || '';
const API_PREFIX = '/api/v1';

if (!isLocalApiUrl(API_URL)) {
  API_URL = API_URL.replace(/^http:\/\//i, 'https://');
}
API_URL = API_URL.replace(/\/+$/, '');

// If API_URL is empty, default to local API in dev and production API in builds
if (!API_URL) {
  API_URL = import.meta.env.DEV
    ? 'http://localhost:8000'
    : 'https://api.victorybowling.com';
}

// Create axios instance - don't append API_PREFIX if VITE_API_URL already contains it
const baseURL = API_URL.includes('/api/v1') ? API_URL : `${API_URL}${API_PREFIX}`;

// Log the actual baseURL being used for debugging
devLog(`Using API baseURL: ${baseURL}`);

// Extend Axios request config to include our custom properties
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _redirectCount?: number;
  _retry?: boolean;
  _refreshAttempted?: boolean;
  /** When true, 403 responses are not redirected to the access-denied page */
  skip403Redirect?: boolean;
}

/**
 * Manual redirect handler - keeps track of redirect counts to prevent loops
 */
const handleRedirects = async (
  response: AxiosResponse, 
  maxRedirects: number = 5
): Promise<AxiosResponse> => {
  // Get the config and cast it to our extended type
  const config = response.config as ExtendedAxiosRequestConfig;
  
  // Initialize redirect count if not present
  const redirectCount = config._redirectCount || 0;
  
  // Check if we're in a redirect response and haven't exceeded max redirects
  if ((response.status === 301 || response.status === 302 || response.status === 307 || response.status === 308) && 
      response.headers.location && 
      redirectCount < maxRedirects) {
        
    // Get the redirect URL and ensure it uses HTTPS
    let redirectUrl = response.headers.location;
    
    // Check if the URL is relative (doesn't start with http:// or https://)
    if (!redirectUrl.startsWith('http')) {
      // If it's an absolute path (starts with /)
      if (redirectUrl.startsWith('/')) {
        const urlObj = new URL(config.url || '', config.baseURL);
        redirectUrl = `${urlObj.origin}${redirectUrl}`;
      } else {
        // It's a relative path, append to the current path
        const urlObj = new URL(config.url || '', config.baseURL);
        const currentPath = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);
        redirectUrl = `${urlObj.origin}${currentPath}${redirectUrl}`;
      }
    }
    
    // Ensure HTTPS
    redirectUrl = ensureHttps(redirectUrl);
    
    devLog(`Following redirect (${redirectCount + 1}/${maxRedirects}): ${redirectUrl}`);
    
    // Create a new request config for the redirect
    const redirectConfig: ExtendedAxiosRequestConfig = {
      ...config,
      url: redirectUrl,
      baseURL: '', // Don't use baseURL for redirects
      _redirectCount: redirectCount + 1 // Increment redirect count
    };
    
    // Follow the redirect
    try {
      const redirectResponse = await axios(redirectConfig);
      
      // Check if we get another redirect
      if ((redirectResponse.status === 301 || redirectResponse.status === 302 || 
           redirectResponse.status === 307 || redirectResponse.status === 308) && 
          redirectResponse.headers.location) {
        // Recursively handle the redirect
        return handleRedirects(redirectResponse, maxRedirects);
      }
      
      return redirectResponse;
    } catch (error) {
      devError('Error following redirect:', error);
      throw error;
    }
  }
  
  // Not a redirect or exceeded max redirects, return the response
  return response;
};

/**
 * Debug helper to build the full URL with query params
 */
const buildFullUrl = (config: InternalAxiosRequestConfig): string => {
  let fullUrl = '';
  
  // Combine baseURL and URL path
  if (config.baseURL && config.url) {
    fullUrl = `${config.baseURL}${config.url.startsWith('/') ? config.url : `/${config.url}`}`;
  } else if (config.url) {
    fullUrl = config.url;
  }
  
  // Add query parameters manually
  if (config.params) {
    const queryParams: string[] = [];
    for (const key in config.params) {
      if (config.params[key] !== undefined && config.params[key] !== null) {
        queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(config.params[key])}`);
      }
    }
    
    if (queryParams.length > 0) {
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryParams.join('&');
    }
  }
  
  return fullUrl;
};

// Create axios instance with optimized configuration
const axiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000, // 15 seconds
  withCredentials: true, // Enable sending cookies with cross-origin requests
  
  // Handle our own redirects
  maxRedirects: 0,
  
  // Accept all status codes to manually handle redirects
  validateStatus: () => true,
  
  // Set a proper paramsSerializer
  paramsSerializer: {
    encode: encodeURIComponent,
    serialize: function (params: Record<string, unknown>): string {
      const searchParams = new URLSearchParams();
      for (const key in params) {
        if (params[key] !== undefined && params[key] !== null) {
          searchParams.append(key, String(params[key]));
        }
      }
      return searchParams.toString();
    },
  },
});

// State to track if a token refresh is in progress
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: string | null) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Request interceptor with enhanced URL security
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // List of endpoints that should not have authorization headers
    const publicEndpoints = [
      '/users/login',
      '/auth/token',
      '/auth/refresh',
      '/auth/logout',
      '/account/request-password-reset',
      '/account/reset-password',
      '/account/request-email-verification',
      '/account/verify-email',
      '/health'
    ];
    
    // Check if this is a public endpoint (exact path matching)
    const isPublicEndpoint = publicEndpoints.some(endpoint => {
      const url = config.url;
      if (!url) return false;
      
      // For other endpoints, match if URL starts with the endpoint
      return url === endpoint || url.startsWith(endpoint + '/') || url.startsWith(endpoint + '?');
    }) || (config.url === '/users' && config.method === 'post'); // Registration endpoint
    
    // Only add authorization header if it's not a public endpoint and we have a token
    const token = localStorage.getItem('token');
    if (token && config.headers && !isPublicEndpoint) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    const originalConfig = {
      url: config.url,
      baseURL: config.baseURL,
    };

    // Ensure URL is using HTTPS (for both baseURL and url)
    if (config.baseURL) {
      config.baseURL = ensureHttps(config.baseURL);
    }
    
    // For URLs, ensure they use HTTPS
    if (config.url) {
      // Handle absolute URLs
      if (config.url.startsWith('http')) {
        config.url = ensureHttps(config.url);
        // When using absolute URLs, disable baseURL to prevent duplication
        config.baseURL = '';
      } else if (config.url.includes('victorybowling.com')) {
        // Domain name found in relative URL, ensure it uses HTTPS
        config.url = ensureHttps(config.url);
      }
      
      // Add trailing slash on collection routes to avoid Starlette redirect loops locally
      if (config.url.startsWith('/') && needsTrailingSlash(config.url)) {
        config.url = addTrailingSlash(config.url);
      }
    }
    
    // Calculate the full URL for debugging
    // Log changes for debugging
    if (originalConfig.url !== config.url || originalConfig.baseURL !== config.baseURL) {
      devLog('URL modifications made:', {
        original: { url: originalConfig.url, baseURL: originalConfig.baseURL },
        modified: { url: config.url, baseURL: config.baseURL }
      });
    }
    
    
    return config;
  },
  (error: AxiosError) => {
    devError('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with improved redirect handling
axiosInstance.interceptors.response.use(
  async (response: AxiosResponse) => {
    // Handle all types of redirects (301, 302, 307, 308)
    if ([301, 302, 307, 308].includes(response.status) && response.headers.location) {
      return handleRedirects(response);
    }

    // validateStatus is always true so we can follow redirects manually; reject API errors
    // so callers do not treat 4xx/5xx bodies as successful JSON (e.g. missing created id).
    if (response.status >= 400) {
      return Promise.reject(
        new AxiosError(
          `Request failed with status code ${response.status}`,
          AxiosError.ERR_BAD_RESPONSE,
          response.config,
          response.request,
          response
        )
      );
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig;
    
    // Enhanced error logging
    devError('API Error:', {
      message: error.message,
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      data: error.response?.data
    });
    
    // Handle CORS errors
    if (!error.response && error.message === 'Network Error') {
      devError('CORS or network failure detected:', {
        url: originalRequest?.url,
        baseURL: originalRequest?.baseURL,
        fullURL: originalRequest ? buildFullUrl(originalRequest) : 'unknown'
      });
      
      // Try to provide helpful debugging info
      devError('This might be due to:');
      devError('1. The API server not allowing cross-origin requests from this domain');
      devError('2. The API server being down or unreachable');
      devError('3. Using HTTP instead of HTTPS in your requests (mixed content)');
    }
    
    // Handle 401 Unauthorized errors by trying refresh first.
    if (error.response?.status === 401 &&
        originalRequest &&
        !originalRequest._retry &&
        !originalRequest.url?.includes('/auth/refresh') &&
        !originalRequest.url?.includes('/auth/logout')) {
      
      // If a refresh is already in progress, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return axiosInstance(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh the token using HttpOnly cookie
        // Refresh token is automatically sent via cookie (withCredentials: true)
        // Use axiosInstance to ensure cookies are sent
        const response = await axiosInstance.post(`${axiosInstance.defaults.baseURL}/auth/refresh`, {});

        const { access_token, expires_in } = response.data;
        
        // Store the new access token with expiration
        // Refresh token is stored in HttpOnly cookie by server
        const { AuthAPI } = await import('./auth');
        AuthAPI.storeTokens(access_token, undefined, expires_in);

        let tokenToUse = access_token;
        const { reissueImpersonationAfterAdminRefresh } = await import(
          '../utils/impersonationSession'
        );
        const impersonationToken = await reissueImpersonationAfterAdminRefresh();
        if (impersonationToken) {
          tokenToUse = impersonationToken;
        }
        
        // Update the default authorization header
        if (axiosInstance.defaults.headers.common) {
          axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${tokenToUse}`;
        }
        
        // Update the failed request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${tokenToUse}`;
        }
        
        processQueue(null, tokenToUse);
        isRefreshing = false;
        
        // Retry the original request
        return axiosInstance(originalRequest);
        
      } catch (refreshError) {
        // Refresh failed, clear everything and redirect to login
        processQueue(refreshError, null);
        isRefreshing = false;
        
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token'); // Legacy cleanup
        localStorage.removeItem('user');
        localStorage.removeItem('token_expires_at');
        
        // Only redirect if we're not already on the login page
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register') {
          // Store the current page to redirect back after login
          localStorage.setItem('redirectAfterLogin', currentPath);
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 401) {
      // Already retried or refresh endpoint failed - clear auth and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('token_expires_at');

      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        localStorage.setItem('redirectAfterLogin', currentPath);
        if (!originalRequest?.url?.includes('/users/me')) {
          window.location.href = '/login';
        }
      }
    }

    if (error.response?.status === 403 && originalRequest && !originalRequest.skip403Redirect) {
      const path = window.location.pathname;
      if (!path.includes('/access-denied')) {
        const raw = (error.response?.data as { detail?: string } | undefined)?.detail;
        const reason =
          typeof raw === 'string'
            ? raw
            : 'You do not have permission to perform this action.';
        const q = encodeURIComponent(reason);
        let base = '';
        if (path.startsWith('/admin')) {
          base = '/admin';
        } else if (path.startsWith('/director')) {
          base = '/director';
        }
        window.location.assign(`${base}/access-denied?reason=${q}`);
      }
    }

    return Promise.reject(error);
  }
);

// Override global axios methods to ensure all requests go through our instance
const originalAxios = { ...axios };
axios.get = (...args: Parameters<typeof axios.get>) => axiosInstance.get(...args);
axios.post = (...args: Parameters<typeof axios.post>) => axiosInstance.post(...args);
axios.put = (...args: Parameters<typeof axios.put>) => axiosInstance.put(...args);
axios.delete = (...args: Parameters<typeof axios.delete>) => axiosInstance.delete(...args);
axios.patch = (...args: Parameters<typeof axios.patch>) => axiosInstance.patch(...args);
axios.request = (...args: Parameters<typeof axios.request>) => axiosInstance.request(...args);
axios.create = (config?: AxiosRequestConfig) => {
  // Create a safe copy of config to avoid undefined issues
  const safeConfig = { ...config } as AxiosRequestConfig;
  
  // Make sure any new instance also uses HTTPS
  if (safeConfig.baseURL) {
    safeConfig.baseURL = ensureHttps(safeConfig.baseURL);
  }
  
  return originalAxios.create(safeConfig);
};

export default axiosInstance;