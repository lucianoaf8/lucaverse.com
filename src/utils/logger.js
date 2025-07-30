// Production-Safe Logging Utility
// Prevents sensitive data exposure in production while maintaining dev experience

const isProduction = import.meta.env.PROD;
const isDevelopment = !isProduction;

/**
 * Sanitize log messages to prevent sensitive data exposure
 * @param {any} message - Message to sanitize
 * @returns {any} - Sanitized message
 */
const sanitizeLogMessage = (message) => {
  if (typeof message === 'string') {
    // Remove potential tokens, keys, passwords, emails
    return message
      .replace(/token[=:]\s*[^\s&]+/gi, 'token=***')
      .replace(/key[=:]\s*[^\s&]+/gi, 'key=***')
      .replace(/password[=:]\s*[^\s&]+/gi, 'password=***')
      .replace(/session[=:]\s*[^\s&]+/gi, 'session=***')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***@***.***');
  }
  
  if (typeof message === 'object' && message !== null) {
    const sanitized = { ...message };
    
    // Sanitize common sensitive fields
    const sensitiveFields = ['token', 'password', 'key', 'secret', 'auth', 'session', 'email'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    });
    
    return sanitized;
  }
  
  return message;
};

/**
 * Production-safe logger with environment-based output
 */
export const logger = {
  /**
   * Log error messages
   * @param {string} message - Error message
   * @param {...any} args - Additional arguments
   */
  error: (message, ...args) => {
    if (isDevelopment) {
      console.error(message, ...args);
    } else {
      // In production, send to monitoring service (placeholder)
      // Replace with actual logging service integration
      const sanitizedMessage = sanitizeLogMessage(message);
      const sanitizedArgs = args.map(sanitizeLogMessage);
      
      // For now, store in sessionStorage for debugging (limited)
      try {
        const errorLog = {
          level: 'error',
          message: sanitizedMessage,
          args: sanitizedArgs,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent
        };
        
        const existingLogs = JSON.parse(sessionStorage.getItem('error_logs') || '[]');
        existingLogs.push(errorLog);
        
        // Keep only last 10 errors to prevent storage bloat
        const recentLogs = existingLogs.slice(-10);
        sessionStorage.setItem('error_logs', JSON.stringify(recentLogs));
      } catch (e) {
        // Silent fail if storage is full
      }
    }
  },

  /**
   * Log warning messages
   * @param {string} message - Warning message
   * @param {...any} args - Additional arguments
   */
  warn: (message, ...args) => {
    if (isDevelopment) {
      console.warn(message, ...args);
    }
    // Production warnings are generally not logged to avoid noise
  },

  /**
   * Log info messages
   * @param {string} message - Info message
   * @param {...any} args - Additional arguments
   */
  info: (message, ...args) => {
    if (isDevelopment) {
      console.info(message, ...args);
    }
    // Production info logs are suppressed
  },

  /**
   * Log debug messages
   * @param {string} message - Debug message
   * @param {...any} args - Additional arguments
   */
  debug: (message, ...args) => {
    if (isDevelopment) {
      console.debug(message, ...args);
    }
    // Debug logs never appear in production
  },

  /**
   * Log general messages
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   */
  log: (message, ...args) => {
    if (isDevelopment) {
      console.log(message, ...args);
    }
    // General logs are suppressed in production
  },

  /**
   * Security-specific logging with extra sanitization
   * @param {string} message - Security message
   * @param {...any} args - Additional arguments
   */
  security: (message, ...args) => {
    const securityMessage = `🚨 SECURITY: ${message}`;
    
    if (isDevelopment) {
      console.error(securityMessage, ...args);
    } else {
      // Security events should be logged even in production (sanitized)
      const sanitizedMessage = sanitizeLogMessage(securityMessage);
      const sanitizedArgs = args.map(sanitizeLogMessage);
      
      try {
        const securityLog = {
          level: 'security',
          message: sanitizedMessage,
          args: sanitizedArgs,
          timestamp: new Date().toISOString(),
          url: window.location.href
        };
        
        const existingLogs = JSON.parse(sessionStorage.getItem('security_logs') || '[]');
        existingLogs.push(securityLog);
        
        // Keep last 5 security events
        const recentLogs = existingLogs.slice(-5);
        sessionStorage.setItem('security_logs', JSON.stringify(recentLogs));
      } catch (e) {
        // Silent fail
      }
    }
  },

  /**
   * User-friendly error messages for production
   * @param {string} operation - What operation failed
   * @returns {string} - Generic error message
   */
  getUserFriendlyError: (operation = 'operation') => {
    const genericMessages = [
      `${operation} temporarily unavailable. Please try again.`,
      `Something went wrong. Please refresh and try again.`,
      `Service temporarily unavailable. Please try again later.`,
      `Unable to complete ${operation}. Please try again.`
    ];
    
    return genericMessages[Math.floor(Math.random() * genericMessages.length)];
  }
};

export default logger;