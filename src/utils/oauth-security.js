// OAuth Security Utilities
// Provides secure OAuth flow implementation with state, CSRF, and PKCE protection

import { sanitizeText } from './sanitize.js';
import { logger } from './logger.js';

/**
 * Generate cryptographically secure random string
 * @param {number} length - Length of the random string
 * @returns {string} - Base64URL encoded random string
 */
export const generateSecureRandom = (length = 32) => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

/**
 * Generate OAuth state parameter for CSRF protection
 * @returns {string} - Secure state parameter
 */
export const generateOAuthState = () => {
  const timestamp = Date.now().toString();
  const randomValue = generateSecureRandom(24);
  return `${timestamp}.${randomValue}`;
};

/**
 * Validate OAuth state parameter
 * @param {string} receivedState - State parameter from OAuth callback
 * @param {string} expectedState - State parameter stored before OAuth redirect
 * @returns {boolean} - True if state is valid
 */
export const validateOAuthState = (receivedState, expectedState) => {
  if (!receivedState || !expectedState) {
    return false;
  }
  
  // Sanitize inputs to prevent XSS
  const cleanReceived = sanitizeText(receivedState);
  const cleanExpected = sanitizeText(expectedState);
  
  if (cleanReceived !== cleanExpected) {
    return false;
  }
  
  // Check timestamp to prevent replay attacks (5 minute window)
  const parts = cleanReceived.split('.');
  if (parts.length !== 2) {
    return false;
  }
  
  const timestamp = parseInt(parts[0], 10);
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  return (now - timestamp) <= fiveMinutes;
};

/**
 * Generate PKCE code verifier
 * @returns {string} - Base64URL encoded code verifier
 */
export const generateCodeVerifier = () => {
  return generateSecureRandom(96); // 128 characters for high entropy
};

/**
 * Generate PKCE code challenge from verifier
 * @param {string} codeVerifier - The code verifier
 * @returns {Promise<string>} - Base64URL encoded code challenge
 */
export const generateCodeChallenge = async (codeVerifier) => {
  if (!crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

/**
 * Generate CSRF token for additional protection
 * @returns {string} - CSRF token
 */
export const generateCSRFToken = () => {
  const timestamp = Date.now().toString();
  const randomValue = generateSecureRandom(32);
  return `csrf_${timestamp}_${randomValue}`;
};

/**
 * Validate CSRF token
 * @param {string} token - Token to validate
 * @param {number} maxAge - Maximum age in milliseconds (default: 30 minutes)
 * @returns {boolean} - True if token is valid
 */
export const validateCSRFToken = (token, maxAge = 30 * 60 * 1000) => {
  if (!token || !token.startsWith('csrf_')) {
    return false;
  }
  
  const cleanToken = sanitizeText(token);
  const parts = cleanToken.split('_');
  
  if (parts.length !== 3) {
    return false;
  }
  
  const timestamp = parseInt(parts[1], 10);
  if (isNaN(timestamp)) {
    return false;
  }
  
  const now = Date.now();
  return (now - timestamp) <= maxAge;
};

/**
 * Secure storage for OAuth parameters
 */
class OAuthSecureStorage {
  constructor() {
    this.storage = new Map();
    this.prefix = 'oauth_secure_';
  }
  
  /**
   * Store OAuth parameters securely
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = 10 * 60 * 1000) { // 10 minutes default
    const cleanKey = sanitizeText(key);
    const expiresAt = Date.now() + ttl;
    
    this.storage.set(this.prefix + cleanKey, {
      value,
      expiresAt
    });
    
    // Auto-cleanup expired entries
    setTimeout(() => {
      this.delete(cleanKey);
    }, ttl);
  }
  
  /**
   * Retrieve OAuth parameters securely
   * @param {string} key - Storage key
   * @returns {any} - Stored value or null if expired/not found
   */
  get(key) {
    const cleanKey = sanitizeText(key);
    const item = this.storage.get(this.prefix + cleanKey);
    
    if (!item) {
      return null;
    }
    
    if (Date.now() > item.expiresAt) {
      this.delete(cleanKey);
      return null;
    }
    
    return item.value;
  }
  
  /**
   * Delete stored OAuth parameters
   * @param {string} key - Storage key
   */
  delete(key) {
    const cleanKey = sanitizeText(key);
    this.storage.delete(this.prefix + cleanKey);
  }
  
  /**
   * Clear all OAuth parameters
   */
  clear() {
    for (const key of this.storage.keys()) {
      if (key.startsWith(this.prefix)) {
        this.storage.delete(key);
      }
    }
  }
}

// Export singleton instance
export const oauthStorage = new OAuthSecureStorage();

/**
 * Validate PostMessage source and origin
 * @param {MessageEvent} event - PostMessage event
 * @param {Window} expectedSource - Expected source window
 * @param {string} expectedOrigin - Expected origin
 * @returns {boolean} - True if validation passes
 */
export const validateMessageSource = (event, expectedSource, expectedOrigin) => {
  // Validate origin
  if (event.origin !== expectedOrigin) {
    logger.security('Invalid origin', { received: event.origin, expected: expectedOrigin });
    return false;
  }
  
  // Validate source window
  if (event.source !== expectedSource) {
    logger.security('Invalid source window');
    return false;
  }
  
  return true;
};

/**
 * Create secure OAuth parameters
 * @returns {Object} - OAuth security parameters
 */
export const createOAuthSecurityParams = async () => {
  const state = generateOAuthState();
  const csrfToken = generateCSRFToken();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  // Store parameters securely
  const sessionId = generateSecureRandom(16);
  oauthStorage.set(sessionId, {
    state,
    csrfToken,
    codeVerifier,
    codeChallenge,
    timestamp: Date.now()
  });
  
  return {
    sessionId,
    state,
    csrfToken,
    codeChallenge,
    codeChallengeMethod: 'S256'
  };
};

/**
 * Validate OAuth callback parameters
 * @param {Object} params - Callback parameters
 * @returns {Object} - Validation result
 */
export const validateOAuthCallback = (params) => {
  const { sessionId, state, csrfToken, error, code } = params;
  
  if (error) {
    return {
      valid: false,
      error: 'OAuth error: ' + sanitizeText(error)
    };
  }
  
  if (!sessionId || !state || !code) {
    return {
      valid: false,
      error: 'Missing required OAuth parameters'
    };
  }
  
  // Retrieve stored parameters
  const storedParams = oauthStorage.get(sessionId);
  if (!storedParams) {
    return {
      valid: false,
      error: 'OAuth session not found or expired'
    };
  }
  
  // Validate state parameter
  if (!validateOAuthState(state, storedParams.state)) {
    return {
      valid: false,
      error: 'Invalid OAuth state parameter'
    };
  }
  
  // Validate CSRF token if provided
  if (csrfToken && !validateCSRFToken(csrfToken)) {
    return {
      valid: false,
      error: 'Invalid CSRF token'
    };
  }
  
  // Clean up stored parameters
  oauthStorage.delete(sessionId);
  
  return {
    valid: true,
    codeVerifier: storedParams.codeVerifier
  };
};

export default {
  generateSecureRandom,
  generateOAuthState,
  validateOAuthState,
  generateCodeVerifier,
  generateCodeChallenge,
  generateCSRFToken,
  validateCSRFToken,
  oauthStorage,
  validateMessageSource,
  createOAuthSecurityParams,
  validateOAuthCallback
};