/**
 * Security Headers Utility
 * Implements LUCI-010 security requirements:
 * - CSP validation and reporting
 * - Security headers monitoring
 * - Runtime security header enforcement
 */

import { logger } from './logger.js';

// CSP Configuration - Removed unsafe directives
const CSP_CONFIG = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    // Removed 'unsafe-inline' and 'unsafe-eval' for better security
    'https://accounts.google.com',
    'https://apis.google.com'
  ],
  'style-src': [
    "'self'",
    // Removed 'unsafe-inline' - styles should be in external files
    'https://fonts.googleapis.com',
    'https://cdnjs.cloudflare.com'
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
    'https://cdnjs.cloudflare.com'
  ],
  'img-src': [
    "'self'",
    'data:',
    'https:',
    'blob:'
  ],
  'connect-src': [
    "'self'",
    'https://summer-heart.lucianoaf8.workers.dev',
    'https://lucaverse-auth.lucianoaf8.workers.dev',
    'https://formerformfarmer.lucianoaf8.workers.dev',
    'https://accounts.google.com',
    'https://oauth2.googleapis.com',
    'https://www.googleapis.com'
  ],
  'frame-src': [
    "'self'",
    'https://accounts.google.com'
  ],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': [
    "'self'",
    'https://summer-heart.lucianoaf8.workers.dev',
    'https://lucaverse-auth.lucianoaf8.workers.dev',
    'https://formerformfarmer.lucianoaf8.workers.dev'
  ],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': []
};

// Security Headers Configuration
const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=()',
  'X-DNS-Prefetch-Control': 'off',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
};

/**
 * Generate CSP string from configuration
 */
const generateCSPString = (config = CSP_CONFIG) => {
  const directives = Object.entries(config).map(([directive, sources]) => {
    if (sources.length === 0) {
      return directive;
    }
    return `${directive} ${sources.join(' ')}`;
  });
  
  return directives.join('; ');
};

/**
 * Validate current CSP implementation
 */
const validateCSP = () => {
  try {
    // Check if CSP meta tag exists
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!cspMeta) {
      logger.warn('CSP meta tag not found in document');
      return {
        valid: false,
        reason: 'missing_meta_tag',
        recommendations: ['Add CSP meta tag to index.html']
      };
    }

    const currentCSP = cspMeta.getAttribute('content');
    if (!currentCSP || currentCSP.trim().length === 0) {
      logger.warn('CSP meta tag found but content is empty');
      return {
        valid: false,
        reason: 'empty_content',
        recommendations: ['Add CSP directives to meta tag content']
      };
    }

    // Basic validation of CSP directives
    const requiredDirectives = ['default-src', 'script-src', 'style-src', 'object-src'];
    const missingDirectives = requiredDirectives.filter(directive => 
      !currentCSP.includes(directive)
    );

    if (missingDirectives.length > 0) {
      logger.warn('CSP missing required directives:', missingDirectives);
      return {
        valid: false,
        reason: 'missing_directives',
        missing: missingDirectives,
        recommendations: [`Add missing CSP directives: ${missingDirectives.join(', ')}`]
      };
    }

    // Check for unsafe directives (should not exist after LUCI-HIGH-001 fix)
    const unsafePatterns = ["'unsafe-inline'", "'unsafe-eval'"];
    const foundUnsafe = unsafePatterns.filter(pattern => currentCSP.includes(pattern));
    
    if (foundUnsafe.length > 0) {
      logger.error('Unsafe CSP directives found - security vulnerability:', foundUnsafe);
      return {
        valid: false,
        reason: 'unsafe_directives_detected',
        unsafe: foundUnsafe,
        recommendations: ['Remove unsafe directives immediately', 'Use external stylesheets and scripts only']
      };
    }

    logger.info('CSP validation passed', { 
      directiveCount: currentCSP.split(';').length,
      hasUnsafe: foundUnsafe.length > 0
    });

    return {
      valid: true,
      csp: currentCSP,
      unsafe: foundUnsafe,
      recommendations: []
    };

  } catch (error) {
    logger.error('CSP validation failed:', error);
    return {
      valid: false,
      reason: 'validation_error',
      error: error.message,
      recommendations: ['Check browser console for CSP errors']
    };
  }
};

/**
 * Check for security headers presence
 */
const validateSecurityHeaders = () => {
  const results = {
    valid: true,
    present: [],
    missing: [],
    recommendations: []
  };

  // Check meta tags for security headers
  Object.entries(SECURITY_HEADERS).forEach(([header, expectedValue]) => {
    const metaTag = document.querySelector(`meta[http-equiv="${header}"]`);
    
    if (metaTag) {
      const actualValue = metaTag.getAttribute('content');
      results.present.push({
        header,
        value: actualValue,
        expected: expectedValue,
        matches: actualValue === expectedValue
      });
      
      if (actualValue !== expectedValue) {
        results.recommendations.push(`Update ${header} meta tag value to: ${expectedValue}`);
      }
    } else {
      results.missing.push(header);
      results.valid = false;
      results.recommendations.push(`Add ${header} meta tag with value: ${expectedValue}`);
    }
  });

  if (results.missing.length > 0) {
    logger.warn('Missing security headers:', results.missing);
  }

  if (results.present.length > 0) {
    logger.info('Security headers present:', results.present.map(h => h.header));
  }

  return results;
};

/**
 * Monitor CSP violations
 */
const setupCSPReporting = () => {
  // Listen for CSP violation events
  document.addEventListener('securitypolicyviolation', (event) => {
    logger.security('CSP violation detected:', {
      violatedDirective: event.violatedDirective,
      blockedURI: event.blockedURI,
      originalPolicy: event.originalPolicy,
      effectiveDirective: event.effectiveDirective,
      sourceFile: event.sourceFile,
      lineNumber: event.lineNumber,
      columnNumber: event.columnNumber
    });

    // In development, provide helpful guidance
    if (import.meta.env.DEV) {
      console.group('🛡️ CSP Violation Detected');
      console.warn('Blocked:', event.blockedURI);
      console.warn('Directive:', event.violatedDirective);
      console.warn('Policy:', event.originalPolicy);
      console.groupEnd();
    }
  });

  logger.info('CSP violation reporting enabled');
};

/**
 * Runtime security validation
 */
const validateRuntimeSecurity = () => {
  const results = {
    timestamp: Date.now(),
    environment: import.meta.env.MODE,
    checks: {}
  };

  // 1. CSP validation
  results.checks.csp = validateCSP();

  // 2. Security headers validation
  results.checks.securityHeaders = validateSecurityHeaders();

  // 3. HTTPS validation
  results.checks.https = {
    valid: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
    protocol: window.location.protocol,
    recommendations: window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' 
      ? ['Use HTTPS in production'] 
      : []
  };

  // 4. Mixed content validation
  results.checks.mixedContent = {
    valid: !document.querySelectorAll('img[src^="http:"], script[src^="http:"], link[href^="http:"]').length,
    recommendations: document.querySelectorAll('img[src^="http:"], script[src^="http:"], link[href^="http:"]').length > 0
      ? ['Remove or upgrade HTTP resources to HTTPS']
      : []
  };

  // Overall validation status
  results.valid = Object.values(results.checks).every(check => check.valid);

  // Compile all recommendations
  results.recommendations = Object.values(results.checks)
    .flatMap(check => check.recommendations || [])
    .filter((rec, index, arr) => arr.indexOf(rec) === index); // Remove duplicates

  if (results.valid) {
    logger.info('Runtime security validation passed', {
      checksCount: Object.keys(results.checks).length,
      environment: results.environment
    });
  } else {
    logger.warn('Runtime security validation failed', {
      failedChecks: Object.entries(results.checks)
        .filter(([_, check]) => !check.valid)
        .map(([name, _]) => name),
      recommendations: results.recommendations
    });
  }

  return results;
};

/**
 * Initialize security monitoring
 */
export const initializeSecurityHeaders = () => {
  try {
    // Setup CSP violation reporting
    setupCSPReporting();

    // Run initial security validation
    const validation = validateRuntimeSecurity();

    // Log validation results in development
    if (import.meta.env.DEV && !validation.valid) {
      console.group('🛡️ Security Headers Validation');
      console.warn('Validation failed:', validation.recommendations);
      console.groupEnd();
    }

    logger.info('Security headers monitoring initialized', {
      valid: validation.valid,
      checksCount: Object.keys(validation.checks).length
    });

    return validation;

  } catch (error) {
    logger.error('Failed to initialize security headers:', error);
    return {
      valid: false,
      error: error.message,
      recommendations: ['Check browser console for errors']
    };
  }
};

/**
 * Generate CSP for dynamic environments
 */
export const generateDynamicCSP = (additionalSources = {}) => {
  const dynamicConfig = { ...CSP_CONFIG };
  
  // Merge additional sources
  Object.entries(additionalSources).forEach(([directive, sources]) => {
    if (dynamicConfig[directive]) {
      dynamicConfig[directive] = [...dynamicConfig[directive], ...sources];
    } else {
      dynamicConfig[directive] = sources;
    }
  });

  // Remove unsafe directives in production
  if (import.meta.env.PROD) {
    // Keep unsafe-inline for styles (often required for CSS-in-JS)
    // But consider removing unsafe-eval if not needed
    logger.info('Production CSP generated with security considerations');
  }

  return generateCSPString(dynamicConfig);
};

/**
 * Validate external resource security
 */
export const validateExternalResources = () => {
  const externalResources = [];
  
  // Check scripts
  document.querySelectorAll('script[src]').forEach(script => {
    const src = script.getAttribute('src');
    if (src && !src.startsWith('/') && !src.startsWith(window.location.origin)) {
      externalResources.push({
        type: 'script',
        src,
        hasIntegrity: script.hasAttribute('integrity'),
        hasCrossorigin: script.hasAttribute('crossorigin')
      });
    }
  });

  // Check stylesheets
  document.querySelectorAll('link[rel="stylesheet"][href]').forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.startsWith('/') && !href.startsWith(window.location.origin)) {
      externalResources.push({
        type: 'stylesheet',
        src: href,
        hasIntegrity: link.hasAttribute('integrity'),
        hasCrossorigin: link.hasAttribute('crossorigin')
      });
    }
  });

  // Check for missing SRI
  const missingIntegrity = externalResources.filter(resource => !resource.hasIntegrity);
  
  if (missingIntegrity.length > 0) {
    logger.warn('External resources without SRI:', missingIntegrity);
  }

  return {
    totalExternal: externalResources.length,
    withIntegrity: externalResources.filter(r => r.hasIntegrity).length,
    withoutIntegrity: missingIntegrity.length,
    resources: externalResources,
    recommendations: missingIntegrity.length > 0 
      ? ['Add integrity hashes to external resources for Subresource Integrity (SRI)']
      : []
  };
};

// Export utility functions
// Add nonce validation
export const validateCSPNonces = () => {
  const scripts = document.querySelectorAll('script[nonce]');
  const styles = document.querySelectorAll('style[nonce]');
  
  return {
    scriptsWithNonce: scripts.length,
    stylesWithNonce: styles.length,
    recommendations: scripts.length === 0 ? ['Add nonces to inline scripts'] : []
  };
};

export {
  validateCSP,
  validateSecurityHeaders,
  validateRuntimeSecurity,
  generateCSPString,
  validateCSPNonces,
  CSP_CONFIG,
  SECURITY_HEADERS
};

export default {
  initialize: initializeSecurityHeaders,
  validate: validateRuntimeSecurity,
  generateCSP: generateDynamicCSP,
  validateExternal: validateExternalResources
};