/**
 * Production Environment Validator
 * LUCI-MED-002: Ensures production environment is properly configured
 */

import { logger } from './logger.js';

export const validateProductionEnvironment = () => {
  const checks = {
    nodeEnv: process.env.NODE_ENV === 'production',
    viteMode: import.meta.env.MODE === 'production',
    devMode: import.meta.env.DEV === false,
    sourceMaps: import.meta.env.VITE_ENABLE_SOURCEMAPS !== 'true',
    debugMode: import.meta.env.VITE_DEBUG_MODE !== 'true'
  };
  
  const issues = [];
  const recommendations = [];
  
  if (!checks.nodeEnv) {
    issues.push('NODE_ENV is not set to production');
    recommendations.push('Set NODE_ENV=production in build environment');
  }
  
  if (!checks.viteMode) {
    issues.push('Vite MODE is not production');
    recommendations.push('Ensure build process sets production mode');
  }
  
  if (!checks.devMode) {
    issues.push('Development mode is enabled');
    recommendations.push('Disable development mode in production builds');
  }
  
  if (!checks.sourceMaps) {
    issues.push('Source maps are enabled in production');
    recommendations.push('Disable source maps in production builds');
  }
  
  if (!checks.debugMode) {
    issues.push('Debug mode is enabled in production');
    recommendations.push('Set VITE_DEBUG_MODE=false in production');
  }
  
  const isValid = issues.length === 0;
  
  if (!isValid) {
    logger.error('Production environment validation failed', {
      issues,
      recommendations,
      currentEnv: {
        NODE_ENV: process.env.NODE_ENV,
        MODE: import.meta.env.MODE,
        DEV: import.meta.env.DEV
      }
    });
    
    // In strict mode, throw error to prevent deployment
    if (import.meta.env.VITE_STRICT_PRODUCTION === 'true') {
      throw new Error(`Production validation failed: ${issues.join(', ')}`);
    }
  } else {
    logger.info('Production environment validation passed');
  }
  
  return {
    valid: isValid,
    issues,
    recommendations,
    checks
  };
};

export const enforceProductionSecurity = () => {
  if (import.meta.env.PROD) {
    // Override console methods in production
    const noop = () => {};
    
    if (import.meta.env.VITE_DISABLE_CONSOLE === 'true') {
      console.debug = noop;
      console.info = noop;
      console.warn = noop;
      // Keep console.error for critical issues
    }
    
    // Disable React DevTools
    if (typeof window !== 'undefined') {
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
        isDisabled: true,
        supportsFiber: true,
        inject: noop,
        onCommitFiberRoot: noop,
        onCommitFiberUnmount: noop
      };
      
      // Remove development artifacts
      if (window.__REDUX_DEVTOOLS_EXTENSION__) {
        delete window.__REDUX_DEVTOOLS_EXTENSION__;
      }
      
      // Clear development globals
      if (window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__) {
        delete window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__;
      }
    }
    
    // Override error reporting in production
    if (import.meta.env.VITE_HIDE_STACK_TRACES === 'true') {
      const originalError = window.onerror;
      window.onerror = function(message, source, lineno, colno, error) {
        // Log to our secure logger instead of exposing to console
        logger.error('Production error occurred', {
          message: typeof message === 'string' ? message.substring(0, 100) : 'Unknown error',
          timestamp: Date.now()
        });
        
        // Call original handler if it exists
        if (originalError) {
          return originalError.call(this, 'An error occurred', '', 0, 0, new Error('Hidden in production'));
        }
        
        return true; // Prevent default browser error handling
      };
    }
  }
};

// Validate security-critical environment variables
export const validateSecurityEnvironment = () => {
  const securityChecks = {
    csrReportOnly: import.meta.env.VITE_CSP_REPORT_ONLY === 'false',
    securityHeaders: import.meta.env.VITE_SECURITY_HEADERS_ENABLED !== 'false',
    strictSecurity: import.meta.env.VITE_STRICT_SECURITY === 'true',
    httpsOnly: window.location.protocol === 'https:' || window.location.hostname === 'localhost'
  };
  
  const securityIssues = [];
  
  if (!securityChecks.csrReportOnly && import.meta.env.PROD) {
    securityIssues.push('CSP is in report-only mode in production');
  }
  
  if (!securityChecks.securityHeaders) {
    securityIssues.push('Security headers are disabled');
  }
  
  if (!securityChecks.strictSecurity && import.meta.env.PROD) {
    securityIssues.push('Strict security mode is not enabled in production');
  }
  
  if (!securityChecks.httpsOnly && import.meta.env.PROD) {
    securityIssues.push('HTTPS is not enforced in production');
  }
  
  return {
    valid: securityIssues.length === 0,
    issues: securityIssues,
    checks: securityChecks
  };
};

// Development mode detection and warnings
export const detectDevelopmentMode = () => {
  const devIndicators = {
    hotReload: !!import.meta.hot,
    devMode: import.meta.env.DEV,
    debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
    sourceMaps: import.meta.env.VITE_ENABLE_SOURCEMAPS === 'true',
    devtools: typeof window !== 'undefined' && window.__REACT_DEVTOOLS_GLOBAL_HOOK__
  };
  
  const isDevelopment = Object.values(devIndicators).some(indicator => indicator);
  
  if (isDevelopment && import.meta.env.PROD) {
    logger.warn('Development features detected in production build', devIndicators);
  }
  
  return {
    isDevelopment,
    indicators: devIndicators
  };
};

// Comprehensive production readiness check
export const performProductionReadinessCheck = () => {
  const envValidation = validateProductionEnvironment();
  const securityValidation = validateSecurityEnvironment();
  const devModeCheck = detectDevelopmentMode();
  
  const overallValid = envValidation.valid && securityValidation.valid && !devModeCheck.isDevelopment;
  
  const summary = {
    valid: overallValid,
    environment: envValidation,
    security: securityValidation,
    development: devModeCheck,
    timestamp: Date.now()
  };
  
  if (!overallValid) {
    logger.error('Production readiness check failed', summary);
  } else {
    logger.info('Production readiness check passed', summary);
  }
  
  return summary;
};