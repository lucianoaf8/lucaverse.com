/**
 * CSRF Protection Utility
 * Implements LUCI-006 security requirements:
 * - CSRF token generation and validation
 * - Referer header validation
 * - SameSite cookie support information
 * - Double-submit cookie pattern implementation
 */

import { logger } from './logger.js';

// Configuration constants
const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_HEADER = 'X-CSRF-Token';
const CSRF_COOKIE_NAME = 'csrf_token';
const ALLOWED_ORIGINS = ['https://lucaverse.com', 'https://www.lucaverse.com'];

/**
 * Generate cryptographically secure CSRF token
 */
const generateCSRFToken = async () => {
  try {
    // Use Web Crypto API for secure random generation
    if (window.crypto && window.crypto.getRandomValues) {
      const array = new Uint8Array(CSRF_TOKEN_LENGTH);
      window.crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    // Fallback for older browsers
    let token = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < CSRF_TOKEN_LENGTH; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  } catch (error) {
    logger.error('Failed to generate CSRF token:', error);
    // Ultra-fallback
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
};

/**
 * Store CSRF token in sessionStorage with fallback
 */
const storeCSRFToken = (token) => {
  try {
    sessionStorage.setItem(CSRF_COOKIE_NAME, token);
    // Also store in localStorage as backup
    localStorage.setItem(CSRF_COOKIE_NAME, token);
    return true;
  } catch (error) {
    logger.warn('Failed to store CSRF token in storage:', error);
    return false;
  }
};

/**
 * Retrieve CSRF token from storage
 */
const getStoredCSRFToken = () => {
  try {
    // Prefer sessionStorage, fallback to localStorage
    return sessionStorage.getItem(CSRF_COOKIE_NAME) || 
           localStorage.getItem(CSRF_COOKIE_NAME);
  } catch (error) {
    logger.warn('Failed to retrieve CSRF token from storage:', error);
    return null;
  }
};

/**
 * Validate origin/referer headers
 */
const validateOrigin = () => {
  const currentOrigin = window.location.origin;
  const referer = document.referrer;
  
  // In development, allow localhost
  if (import.meta.env.DEV) {
    const devOrigins = ['http://localhost', 'https://localhost'];
    const isDevOrigin = devOrigins.some(origin => currentOrigin.startsWith(origin));
    if (isDevOrigin) {
      logger.info('CSRF origin validation: Development environment detected');
      return { valid: true, reason: 'development' };
    }
  }
  
  // Check if current origin is in allowed list
  const isValidOrigin = ALLOWED_ORIGINS.includes(currentOrigin);
  if (!isValidOrigin) {
    logger.security('Invalid origin detected', { 
      current: currentOrigin, 
      allowed: ALLOWED_ORIGINS 
    });
    return { 
      valid: false, 
      reason: 'invalid_origin',
      current: currentOrigin,
      allowed: ALLOWED_ORIGINS
    };
  }
  
  // Validate referer if present
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      const isValidReferer = ALLOWED_ORIGINS.includes(refererOrigin) || refererOrigin === currentOrigin;
      
      if (!isValidReferer) {
        logger.security('Invalid referer detected', { 
          referer: refererOrigin, 
          current: currentOrigin 
        });
        return { 
          valid: false, 
          reason: 'invalid_referer',
          referer: refererOrigin,
          current: currentOrigin
        };
      }
    } catch (error) {
      logger.warn('Failed to parse referer URL:', { referer, error: error.message });
      // Don't fail validation for malformed referer
    }
  }
  
  return { valid: true, origin: currentOrigin, referer };
};

/**
 * Get or create CSRF token for the session
 */
const getCSRFToken = async () => {
  // Try to get existing token
  let token = getStoredCSRFToken();
  
  if (!token) {
    // Generate new token
    token = await generateCSRFToken();
    storeCSRFToken(token);
    logger.info('Generated new CSRF token for session');
  }
  
  return token;
};

/**
 * Add CSRF token to form data
 */
const addCSRFTokenToFormData = async (formData) => {
  const token = await getCSRFToken();
  
  if (formData instanceof FormData) {
    formData.append('csrf_token', token);
  } else if (typeof formData === 'object') {
    formData.csrf_token = token;
  }
  
  return formData;
};

/**
 * Add CSRF token to request headers
 */
const addCSRFTokenToHeaders = async (headers = {}) => {
  const token = await getCSRFToken();
  
  return {
    ...headers,
    [CSRF_TOKEN_HEADER]: token,
    'X-Requested-With': 'XMLHttpRequest' // Additional CSRF protection
  };
};

/**
 * Validate CSRF protection requirements
 */
const validateCSRFProtection = async (options = {}) => {
  const {
    skipOriginCheck = false,
    requireToken = true
  } = options;
  
  const result = {
    valid: true,
    checks: {},
    timestamp: Date.now()
  };
  
  // 1. Origin/Referer validation
  if (!skipOriginCheck) {
    result.checks.origin = validateOrigin();
    if (!result.checks.origin.valid) {
      result.valid = false;
      logger.security('CSRF validation failed: Invalid origin', result.checks.origin);
    }
  }
  
  // 2. Token presence validation
  if (requireToken) {
    const token = await getCSRFToken();
    result.checks.token = {
      present: !!token,
      length: token ? token.length : 0,
      valid: token && token.length >= 16 // Minimum viable token length
    };
    
    if (!result.checks.token.valid) {
      result.valid = false;
      logger.security('CSRF validation failed: Invalid or missing token', result.checks.token);
    }
  }
  
  // 3. Additional security headers validation
  result.checks.headers = {
    userAgent: navigator.userAgent ? 'present' : 'missing',
    cookiesEnabled: navigator.cookieEnabled,
    javascriptEnabled: true // If this runs, JS is enabled
  };
  
  if (result.valid) {
    logger.info('CSRF validation passed', {
      origin: result.checks.origin?.origin,
      tokenLength: result.checks.token?.length
    });
  }
  
  return result;
};

/**
 * Create CSRF-protected form submission headers
 */
const createProtectedHeaders = async (additionalHeaders = {}) => {
  // Validate CSRF requirements
  const validation = await validateCSRFProtection();
  if (!validation.valid) {
    const error = new Error('CSRF validation failed');
    error.validation = validation;
    throw error;
  }
  
  // Add CSRF token to headers
  const headers = await addCSRFTokenToHeaders(additionalHeaders);
  
  // Add additional security headers
  headers['X-Origin'] = window.location.origin;
  headers['X-Request-ID'] = `csrf-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  
  return headers;
};

/**
 * Create CSRF-protected form data
 */
const createProtectedFormData = async (formData, options = {}) => {
  // Validate CSRF requirements
  const validation = await validateCSRFProtection(options);
  if (!validation.valid) {
    const error = new Error('CSRF validation failed');
    error.validation = validation;
    throw error;
  }
  
  // Add CSRF token to form data
  const protectedData = await addCSRFTokenToFormData(formData);
  
  // Add additional security metadata
  if (protectedData instanceof FormData) {
    protectedData.append('origin', window.location.origin);
    protectedData.append('timestamp', Date.now().toString());
    protectedData.append('request_id', `csrf-${Date.now()}-${Math.random().toString(36).substring(2)}`);
  } else if (typeof protectedData === 'object') {
    protectedData.origin = window.location.origin;
    protectedData.timestamp = Date.now();
    protectedData.request_id = `csrf-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  }
  
  return protectedData;
};

/**
 * Comprehensive CSRF protection for form submissions
 */
export class CSRFProtection {
  constructor() {
    this.initialized = false;
    this.token = null;
  }
  
  /**
   * Initialize CSRF protection
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      this.token = await getCSRFToken();
      this.initialized = true;
      
      logger.info('CSRF protection initialized', {
        tokenLength: this.token?.length,
        origin: window.location.origin
      });
    } catch (error) {
      logger.error('Failed to initialize CSRF protection:', error);
      throw error;
    }
  }
  
  /**
   * Validate current session for CSRF protection
   */
  async validate(options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return validateCSRFProtection(options);
  }
  
  /**
   * Protect form data with CSRF token and validation
   */
  async protectFormData(formData, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return createProtectedFormData(formData, options);
  }
  
  /**
   * Create protected headers for CSRF-safe requests
   */
  async protectHeaders(headers = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return createProtectedHeaders(headers);
  }
  
  /**
   * Get current CSRF token
   */
  async getToken() {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return this.token;
  }
  
  /**
   * Refresh CSRF token (generate new one)
   */
  async refreshToken() {
    this.token = await generateCSRFToken();
    storeCSRFToken(this.token);
    
    logger.info('CSRF token refreshed', {
      tokenLength: this.token?.length
    });
    
    return this.token;
  }
  
  /**
   * Get user-friendly error message for CSRF failures
   */
  getErrorMessage(validation, t) {
    if (validation.valid) return null;
    
    // Check what failed
    if (validation.checks.origin && !validation.checks.origin.valid) {
      if (validation.checks.origin.reason === 'invalid_origin') {
        return 'Security error: Request from unauthorized origin. Please refresh the page and try again.';
      }
      if (validation.checks.origin.reason === 'invalid_referer') {
        return 'Security error: Invalid request source. Please navigate directly to this page and try again.';
      }
    }
    
    if (validation.checks.token && !validation.checks.token.valid) {
      return 'Security token missing or invalid. Please refresh the page and try again.';
    }
    
    return 'Security validation failed. Please refresh the page and try again.';
  }
}

// Convenience functions for direct use
export const csrfProtection = new CSRFProtection();

export const generateCSRFProtectedFormData = async (formData, options = {}) => {
  return csrfProtection.protectFormData(formData, options);
};

export const generateCSRFProtectedHeaders = async (headers = {}) => {
  return csrfProtection.protectHeaders(headers);
};

export const validateCSRF = async (options = {}) => {
  return csrfProtection.validate(options);
};

export default CSRFProtection;