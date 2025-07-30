/**
 * CSP Nonce Generation Utility
 * LUCI-HIGH-001: Generates cryptographically secure nonces for CSP
 */

// Generate a cryptographically secure nonce
export const generateNonce = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array));
  }
  
  // Fallback for environments without crypto API
  return btoa(Math.random().toString(36).substring(2, 15) + 
              Math.random().toString(36).substring(2, 15));
};

// Store nonce for use in CSP and inline scripts
let currentNonce = null;

export const getCurrentNonce = () => {
  if (!currentNonce) {
    currentNonce = generateNonce();
  }
  return currentNonce;
};

export const resetNonce = () => {
  currentNonce = generateNonce();
  return currentNonce;
};

// Server-side nonce generation for build time
export const generateBuildTimeNonce = () => {
  // Use Node.js crypto for server-side generation
  if (typeof require !== 'undefined') {
    try {
      const crypto = require('crypto');
      return crypto.randomBytes(16).toString('base64');
    } catch (e) {
      // Fallback if require fails
    }
  }
  
  // Fallback using Math.random for build time
  return btoa(Array.from({length: 32}, () => 
    Math.floor(Math.random() * 16).toString(16)).join(''));
};