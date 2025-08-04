/**
 * Simple logging utility with environment-based log levels
 * Helps reduce console noise in production while maintaining debug capability
 */

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level based on environment
const currentLogLevel = import.meta.env.DEV ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;

/**
 * Create a logger instance with optional prefix
 * @param {string} prefix - Optional prefix for all log messages
 * @returns {Object} - Logger instance with error, warn, info, debug methods
 */
export const createLogger = (prefix = '') => {
  const formatMessage = (level, message, ...args) => {
    const timestamp = new Date().toISOString();
    const prefixText = prefix ? `[${prefix}] ` : '';
    return [`${timestamp} ${level} ${prefixText}${message}`, ...args];
  };

  return {
    error: (message, ...args) => {
      if (currentLogLevel >= LOG_LEVELS.ERROR) {
        console.error(...formatMessage('ERROR', message, ...args));
      }
    },
    
    warn: (message, ...args) => {
      if (currentLogLevel >= LOG_LEVELS.WARN) {
        console.warn(...formatMessage('WARN', message, ...args));
      }
    },
    
    info: (message, ...args) => {
      if (currentLogLevel >= LOG_LEVELS.INFO) {
        console.info(...formatMessage('INFO', message, ...args));
      }
    },
    
    debug: (message, ...args) => {
      if (currentLogLevel >= LOG_LEVELS.DEBUG) {
        console.log(...formatMessage('DEBUG', message, ...args));
      }
    },
    
    // Group logging for better organization in dev tools
    group: (label) => {
      if (currentLogLevel >= LOG_LEVELS.DEBUG) {
        console.group(label);
      }
    },
    
    groupEnd: () => {
      if (currentLogLevel >= LOG_LEVELS.DEBUG) {
        console.groupEnd();
      }
    },
    
    // Structured logging for security events
    security: (event, data) => {
      if (currentLogLevel >= LOG_LEVELS.WARN) {
        console.warn(`🔒 SECURITY: ${event}`, data);
      }
    },
    
    // Performance timing
    time: (label) => {
      if (currentLogLevel >= LOG_LEVELS.DEBUG) {
        console.time(label);
      }
    },
    
    timeEnd: (label) => {
      if (currentLogLevel >= LOG_LEVELS.DEBUG) {
        console.timeEnd(label);
      }
    }
  };
};

// Default logger instance
export const logger = createLogger();

// Specialized loggers for different modules
export const authLogger = createLogger('AUTH');
export const securityLogger = createLogger('SECURITY');
export const apiLogger = createLogger('API');
export const formLogger = createLogger('FORMS');

// Export log levels for external use
export { LOG_LEVELS };