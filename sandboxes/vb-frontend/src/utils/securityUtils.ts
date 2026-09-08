/**
 * HTTPS Security Enforcement
 * 
 * This module provides comprehensive protection against HTTP usage for our domain.
 * It intercepts URL creation, fetch calls, and XMLHttpRequest to ensure all
 * communications use HTTPS, preventing mixed content and CORS issues.
 */

// Enhanced pattern matching for our domains
const isDomainOfInterest = (url: string): boolean => {
  return url.includes('victorybowling.com') || 
         url.includes('api.victorybowling') || 
         url.match(/^https?:\/\/api\./i) !== null;
};

// Consistent URL upgrade function
const upgradeToHttps = (url: string): string => {
  if (!url) return url;
  
  // Direct HTTP to HTTPS conversion
  let finalUrl = url.replace(/^http:\/\//i, 'https://');
  
  // Add protocol if missing for our domains
  if (isDomainOfInterest(url) && !finalUrl.startsWith('https://') && !finalUrl.startsWith('http://')) {
    finalUrl = `https://${finalUrl.replace(/^\/\//, '')}`;
  }
  
  // Convert protocol-relative URLs
  if (finalUrl.startsWith('//') && isDomainOfInterest(finalUrl)) {
    finalUrl = `https:${finalUrl}`;
  }
  
  // Only log upgrades in development (avoid console.trace spam in production)
  if (finalUrl !== url && import.meta.env.DEV) {
    console.warn('Security: URL upgraded:', url, '→', finalUrl);
  }
  
  return finalUrl;
};

// Extend the URL class to catch direct URL constructions
const originalURL = window.URL;
window.URL = class extends originalURL {
  constructor(url: string | URL, base?: string | URL) {
    // Handle string URLs that need upgrading
    if (typeof url === 'string' && isDomainOfInterest(url)) {
      // Check for HTTP or missing protocol
      if (url.startsWith('http:') || !url.startsWith('https:')) {
        url = upgradeToHttps(url);
      }
    }
    
    // Handle base URLs that need upgrading
    if (typeof base === 'string' && isDomainOfInterest(base)) {
      if (base.startsWith('http:') || !base.startsWith('https:')) {
        base = upgradeToHttps(base);
      }
    }
    
    super(url, base);
  }
} as any;

// Override XMLHttpRequest to force HTTPS
const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(
  method: string,
  url: string | URL,
  async: boolean = true,
  username?: string | null,
  password?: string | null
): void {
  let modifiedUrl = url;
  
  if (typeof url === 'string' && isDomainOfInterest(url)) {
    // Check if not already HTTPS
    if (url.startsWith('http:') || !url.startsWith('https:')) {
      modifiedUrl = upgradeToHttps(url);
    }
  }
  
  return originalOpen.call(this, method, modifiedUrl, async, username, password);
};

// Override fetch to ensure HTTPS
const originalFetch = window.fetch;
window.fetch = function(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // Handle string URLs
  if (typeof input === 'string' && isDomainOfInterest(input)) {
    if (input.startsWith('http:') || !input.startsWith('https:')) {
      input = upgradeToHttps(input);
    }
  }
  // Handle Request objects
  else if (input instanceof Request) {
    const url = input.url;
    if (isDomainOfInterest(url)) {
      if (url.startsWith('http:') || !url.startsWith('https:')) {
        // We need to create a new Request with the upgraded URL
        const newUrl = upgradeToHttps(url);
        input = new Request(newUrl, input);
      }
    }
  }
  
  return originalFetch.call(window, input, init);
};

// Export nothing but make this a module
export {};