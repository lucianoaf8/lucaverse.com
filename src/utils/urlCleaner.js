/**
 * URL Parameter Cleaner
 * LUCI-HIGH-002: Removes sensitive parameters from URL without page reload
 */

import { logger } from './logger.js';

const SENSITIVE_PARAMS = ['token', 'session', 'access_token', 'id_token', 'code'];

export const cleanSensitiveUrlParams = () => {
  if (typeof window === 'undefined') return;
  
  const url = new URL(window.location);
  let hasChanges = false;
  
  // Remove sensitive parameters
  SENSITIVE_PARAMS.forEach(param => {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      hasChanges = true;
      
      // Log removal for security audit
      logger.security('Removed sensitive URL parameter', { 
        parameter: param,
        url: window.location.href.split('?')[0] // Log URL without params
      });
    }
  });
  
  // Update URL without page reload if changes were made
  if (hasChanges) {
    window.history.replaceState({}, document.title, url.toString());
  }
};

export const monitorUrlChanges = () => {
  // Clean parameters on initial load
  cleanSensitiveUrlParams();
  
  // Monitor for programmatic URL changes
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;
  
  window.history.pushState = function(...args) {
    originalPushState.apply(this, args);
    setTimeout(cleanSensitiveUrlParams, 0);
  };
  
  window.history.replaceState = function(...args) {
    originalReplaceState.apply(this, args);
    setTimeout(cleanSensitiveUrlParams, 0);
  };
  
  // Monitor hash changes
  window.addEventListener('hashchange', cleanSensitiveUrlParams);
  window.addEventListener('popstate', cleanSensitiveUrlParams);
};

// Enhanced URL sanitization for logging
export const sanitizeUrlForLogging = (url) => {
  try {
    const urlObj = new URL(url);
    
    // Remove all query parameters for logging
    urlObj.search = '';
    
    // Also remove hash if it contains sensitive data
    if (urlObj.hash && SENSITIVE_PARAMS.some(param => urlObj.hash.includes(param))) {
      urlObj.hash = '';
    }
    
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return a safe default
    return '[INVALID_URL]';
  }
};

// Validate URL doesn't contain sensitive data before external calls
export const validateUrlSafety = (url) => {
  if (typeof url !== 'string') return false;
  
  // Check if URL contains sensitive parameters
  const hasSensitiveData = SENSITIVE_PARAMS.some(param => 
    url.toLowerCase().includes(param.toLowerCase())
  );
  
  if (hasSensitiveData) {
    logger.error('Attempted to use URL with sensitive data', {
      sanitizedUrl: sanitizeUrlForLogging(url)
    });
    return false;
  }
  
  return true;
};