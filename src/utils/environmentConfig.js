/**
 * Environment Configuration Utility
 * LUCI-011: Secure environment-specific configuration management
 */

import { logger } from './logger.js';

// Environment detection
export const ENV = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test'
};

/**
 * Get current environment
 */
export const getCurrentEnvironment = () => {
  return import.meta.env.MODE || ENV.DEVELOPMENT;
};

/**
 * Check if running in development
 */
export const isDevelopment = () => {
  return getCurrentEnvironment() === ENV.DEVELOPMENT;
};

/**
 * Check if running in production
 */
export const isProduction = () => {
  return getCurrentEnvironment() === ENV.PRODUCTION;
};

/**
 * Check if running in test environment
 */
export const isTest = () => {
  return getCurrentEnvironment() === ENV.TEST;
};

/**
 * Get environment-specific configuration
 */
export const getEnvironmentConfig = () => {
  const environment = getCurrentEnvironment();
  
  const config = {
    environment,
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    isTest: isTest(),
    
    // Server configuration
    server: {
      host: isDevelopment() ? 'localhost' : 'localhost',
      enableHostBinding: import.meta.env.VITE_HOST === 'true',
      enablePreviewHostBinding: import.meta.env.VITE_PREVIEW_HOST === 'true'
    },
    
    // Security configuration
    security: {
      enableSourceMaps: import.meta.env.VITE_ENABLE_SOURCEMAPS === 'true' || isDevelopment(),
      enableDevTools: import.meta.env.VITE_ENABLE_DEV_TOOLS === 'true' || isDevelopment(),
      cspReportOnly: import.meta.env.VITE_CSP_REPORT_ONLY === 'true' || isDevelopment(),
      securityHeadersEnabled: import.meta.env.VITE_SECURITY_HEADERS_ENABLED !== 'false',
      strictSecurity: import.meta.env.VITE_STRICT_SECURITY === 'true' || isProduction()
    },
    
    // Debugging configuration
    debug: {
      enabled: import.meta.env.VITE_DEBUG_MODE === 'true' || isDevelopment(),
      loggingLevel: import.meta.env.VITE_LOGGING_LEVEL || (isDevelopment() ? 'debug' : 'error'),
      performanceMonitoring: import.meta.env.VITE_PERFORMANCE_MONITORING === 'true' || isProduction()
    },
    
    // Build configuration
    build: {
      bundleAnalyzer: import.meta.env.VITE_BUNDLE_ANALYZER === 'true',
      treeShaking: import.meta.env.VITE_TREE_SHAKING !== 'false',
      minification: import.meta.env.VITE_MINIFICATION !== 'false' || isProduction()
    }
  };
  
  // Log configuration in development
  if (isDevelopment()) {
    logger.info('Environment configuration loaded:', {
      environment: config.environment,
      securityEnabled: config.security.securityHeadersEnabled,
      debugEnabled: config.debug.enabled
    });
  }
  
  return config;
};

/**
 * Validate environment configuration
 */
export const validateEnvironmentConfig = () => {
  const config = getEnvironmentConfig();
  const issues = [];
  
  // Security validations
  if (config.isProduction) {
    if (config.security.enableSourceMaps) {
      issues.push('Source maps should be disabled in production');
    }
    
    if (config.security.enableDevTools) {
      issues.push('Dev tools should be disabled in production');
    }
    
    if (config.debug.enabled) {
      issues.push('Debug mode should be disabled in production');
    }
    
    if (!config.security.strictSecurity) {
      issues.push('Strict security should be enabled in production');
    }
  }
  
  if (config.isDevelopment) {
    if (config.server.enableHostBinding) {
      logger.warn('Host binding is enabled in development - ensure this is intentional');
    }
  }
  
  // Log validation results
  if (issues.length > 0) {
    logger.error('Environment configuration issues detected:', issues);
    return {
      valid: false,
      issues,
      recommendations: issues.map(issue => `Fix: ${issue}`)
    };
  }
  
  logger.info('Environment configuration validation passed');
  return {
    valid: true,
    issues: [],
    recommendations: []
  };
};

/**
 * Get security-specific environment settings
 */
export const getSecurityConfig = () => {
  const config = getEnvironmentConfig();
  
  return {
    // CSP configuration
    csp: {
      reportOnly: config.security.cspReportOnly,
      strictMode: config.security.strictSecurity
    },
    
    // Headers configuration
    headers: {
      enabled: config.security.securityHeadersEnabled,
      hsts: config.isProduction,
      frameOptions: true,
      contentTypeOptions: true
    },
    
    // Development server configuration
    server: {
      allowExternalConnections: config.server.enableHostBinding || config.server.enablePreviewHostBinding,
      corsEnabled: config.isDevelopment,
      strictHost: !config.server.enableHostBinding
    },
    
    // Logging configuration
    logging: {
      level: config.debug.loggingLevel,
      sanitized: config.isProduction,
      detailedErrors: config.isDevelopment
    }
  };
};

/**
 * Export environment utilities
 */
export default {
  ENV,
  getCurrentEnvironment,
  isDevelopment,
  isProduction,
  isTest,
  getEnvironmentConfig,
  validateEnvironmentConfig,
  getSecurityConfig
};