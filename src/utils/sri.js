/**
 * Subresource Integrity (SRI) Management
 * LUCI-LOW-001: Implements SRI verification for external resources
 */

import { logger } from './logger.js';

/**
 * Known SRI hashes for external resources
 * Update these when updating external dependencies
 */
export const SRI_HASHES = {
  // Font Awesome 6.5.1
  'font-awesome-6.5.1': 'sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==',
  
  // Add more external resources as needed
  // 'resource-name': 'sha384-hash or sha512-hash'
};

/**
 * Generate SRI hash for a given content
 * @param {string} content - The content to hash
 * @param {string} algorithm - Hash algorithm (sha256, sha384, sha512)
 * @returns {Promise<string>} Base64 encoded hash
 */
export async function generateSRIHash(content, algorithm = 'sha384') {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    
    const hashBuffer = await crypto.subtle.digest(
      algorithm.toUpperCase().replace('SHA', 'SHA-'),
      data
    );
    
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashBase64 = btoa(String.fromCharCode.apply(null, hashArray));
    
    return `${algorithm}-${hashBase64}`;
  } catch (error) {
    logger.error('Failed to generate SRI hash:', error);
    throw error;
  }
}

/**
 * Verify SRI hash for a resource
 * @param {string} url - URL of the resource
 * @param {string} expectedHash - Expected SRI hash
 * @returns {Promise<boolean>} Whether the hash matches
 */
export async function verifySRIHash(url, expectedHash) {
  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch resource: ${response.status}`);
    }
    
    const content = await response.text();
    const [algorithm, hash] = expectedHash.split('-');
    const computedHash = await generateSRIHash(content, algorithm);
    
    return computedHash === expectedHash;
  } catch (error) {
    logger.error('SRI verification failed:', { url, error: error.message });
    return false;
  }
}

/**
 * Monitor and report SRI failures
 */
export function monitorSRIFailures() {
  if (typeof window === 'undefined') return;
  
  // Listen for security policy violations
  window.addEventListener('securitypolicyviolation', (event) => {
    if (event.violatedDirective.includes('require-sri-for')) {
      logger.security('SRI validation failed', {
        blockedURI: event.blockedURI,
        violatedDirective: event.violatedDirective,
        originalPolicy: event.originalPolicy,
        timestamp: Date.now()
      });
    }
  });
  
  // Monitor script and link errors that might be SRI-related
  const checkSRIError = (event) => {
    const element = event.target;
    if ((element.tagName === 'SCRIPT' || element.tagName === 'LINK') && element.integrity) {
      logger.security('Possible SRI verification failure', {
        tagName: element.tagName,
        src: element.src || element.href,
        integrity: element.integrity,
        crossOrigin: element.crossOrigin,
        timestamp: Date.now()
      });
    }
  };
  
  window.addEventListener('error', checkSRIError, true);
}

/**
 * Dynamically load a script with SRI
 * @param {string} src - Script source URL
 * @param {string} integrity - SRI hash
 * @param {Object} options - Additional options
 * @returns {Promise<void>}
 */
export function loadScriptWithSRI(src, integrity, options = {}) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.integrity = integrity;
    script.crossOrigin = options.crossOrigin || 'anonymous';
    
    if (options.async !== false) {
      script.async = true;
    }
    
    if (options.defer) {
      script.defer = true;
    }
    
    script.onload = () => {
      logger.info('Script loaded with SRI', { src, integrity });
      resolve();
    };
    
    script.onerror = (error) => {
      logger.error('Failed to load script with SRI', { src, integrity, error });
      reject(new Error(`Failed to load script: ${src}`));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * Dynamically load a stylesheet with SRI
 * @param {string} href - Stylesheet URL
 * @param {string} integrity - SRI hash
 * @param {Object} options - Additional options
 * @returns {Promise<void>}
 */
export function loadStylesheetWithSRI(href, integrity, options = {}) {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.integrity = integrity;
    link.crossOrigin = options.crossOrigin || 'anonymous';
    
    if (options.media) {
      link.media = options.media;
    }
    
    link.onload = () => {
      logger.info('Stylesheet loaded with SRI', { href, integrity });
      resolve();
    };
    
    link.onerror = (error) => {
      logger.error('Failed to load stylesheet with SRI', { href, integrity, error });
      reject(new Error(`Failed to load stylesheet: ${href}`));
    };
    
    document.head.appendChild(link);
  });
}

/**
 * Get SRI recommendations for current page
 * @returns {Array} List of resources without SRI
 */
export function getSRIRecommendations() {
  const recommendations = [];
  
  // Check all script tags
  document.querySelectorAll('script[src]').forEach(script => {
    if (!script.integrity && script.src.startsWith('http') && !script.src.includes(window.location.hostname)) {
      recommendations.push({
        type: 'script',
        src: script.src,
        recommendation: 'Add integrity attribute with SRI hash'
      });
    }
  });
  
  // Check all link tags (stylesheets)
  document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    if (!link.integrity && link.href.startsWith('http') && !link.href.includes(window.location.hostname)) {
      recommendations.push({
        type: 'stylesheet',
        href: link.href,
        recommendation: 'Add integrity attribute with SRI hash'
      });
    }
  });
  
  return recommendations;
}

/**
 * Initialize SRI monitoring
 */
export function initializeSRI() {
  logger.info('Initializing SRI monitoring');
  
  // Start monitoring SRI failures
  monitorSRIFailures();
  
  // Check for missing SRI on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const recommendations = getSRIRecommendations();
      if (recommendations.length > 0) {
        logger.warn('Resources without SRI detected', { recommendations });
      }
    });
  } else {
    const recommendations = getSRIRecommendations();
    if (recommendations.length > 0) {
      logger.warn('Resources without SRI detected', { recommendations });
    }
  }
  
  logger.info('SRI monitoring initialized');
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined' && !window.__SRI_INITIALIZED__) {
  window.__SRI_INITIALIZED__ = true;
  initializeSRI();
}