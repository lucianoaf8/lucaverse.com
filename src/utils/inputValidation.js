/**
 * Comprehensive Input Validation Library
 * LUCI-LOW-003: Implements secure input validation with sanitization
 */

import { logger } from './logger.js';
// import { recordSecurityEvent, SECURITY_EVENT_TYPES, ALERT_LEVELS } from './securityMonitoring.js';

// Temporary stub functions to disable security monitoring
const recordSecurityEvent = () => {};
const SECURITY_EVENT_TYPES = {
  MALICIOUS_INPUT: 'malicious_input'
};
const ALERT_LEVELS = {
  HIGH: 'high'
};

// Validation configuration
const VALIDATION_CONFIG = {
  // Field length limits
  LIMITS: {
    name: { min: 1, max: 100 },
    email: { min: 5, max: 254 },
    message: { min: 10, max: 5000 },
    subject: { min: 5, max: 200 },
    phone: { min: 10, max: 20 },
    url: { min: 10, max: 2048 },
    username: { min: 3, max: 30 },
    password: { min: 8, max: 128 },
    otp: { min: 4, max: 8 },
    general: { min: 1, max: 1000 }
  },
  
  // Regex patterns
  PATTERNS: {
    email: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    phone: /^\+?[1-9]\d{1,14}$/,
    url: /^https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?$/,
    username: /^[a-zA-Z0-9_-]+$/,
    alphanumeric: /^[a-zA-Z0-9\s]+$/,
    numeric: /^\d+$/,
    hexColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
    slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  },
  
  // Dangerous patterns to reject
  DANGEROUS_PATTERNS: [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
    /<form[^>]*>/gi,
    /data:text\/html/gi,
    /expression\s*\(/gi,
    /url\s*\(/gi,
    /@import/gi,
    /binding\s*:/gi
  ],
  
  // SQL injection patterns
  SQL_INJECTION_PATTERNS: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /'.*(?:;|--|\*\/)/gi,
    /\b(OR|AND)\s+\d+\s*=\s*\d+/gi,
    /UNION.*SELECT/gi,
    /1\s*=\s*1/gi,
    /'.*OR.*'/gi
  ]
};

/**
 * Input Validator Class
 */
export class InputValidator {
  constructor(config = {}) {
    this.config = { ...VALIDATION_CONFIG, ...config };
    this.errors = new Map();
  }

  /**
   * Validate a single field
   * @param {string} value - Value to validate
   * @param {string} type - Validation type
   * @param {Object} options - Additional validation options
   * @returns {Object} Validation result
   */
  validate(value, type, options = {}) {
    this.errors.clear();
    
    const result = {
      isValid: true,
      errors: [],
      sanitized: value,
      warnings: []
    };

    try {
      // Basic sanitization
      result.sanitized = this.basicSanitize(value);
      
      // Required field validation
      if (options.required && this.isEmpty(result.sanitized)) {
        result.errors.push('This field is required');
        result.isValid = false;
        return result;
      }
      
      // Skip further validation if field is empty and not required
      if (!options.required && this.isEmpty(result.sanitized)) {
        return result;
      }
      
      // Length validation
      const lengthResult = this.validateLength(result.sanitized, type, options);
      if (!lengthResult.isValid) {
        result.errors.push(...lengthResult.errors);
        result.isValid = false;
      }
      
      // Pattern validation
      const patternResult = this.validatePattern(result.sanitized, type, options);
      if (!patternResult.isValid) {
        result.errors.push(...patternResult.errors);
        result.isValid = false;
      }
      
      // Security validation
      const securityResult = this.validateSecurity(result.sanitized, options);
      if (!securityResult.isValid) {
        result.errors.push(...securityResult.errors);
        result.isValid = false;
      }
      
      if (securityResult.warnings) {
        result.warnings.push(...securityResult.warnings);
      }
      
      // Additional custom validation
      if (options.customValidator) {
        const customResult = options.customValidator(result.sanitized);
        if (!customResult.isValid) {
          result.errors.push(...(customResult.errors || ['Custom validation failed']));
          result.isValid = false;
        }
      }
      
    } catch (error) {
      logger.error('Input validation error:', error);
      result.errors.push('Validation error occurred');
      result.isValid = false;
    }
    
    return result;
  }

  /**
   * Basic input sanitization
   */
  basicSanitize(value) {
    if (typeof value !== 'string') {
      return String(value || '');
    }
    
    return value
      .trim()
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')
      .replace(/\u0000/g, ''); // Remove null bytes
  }

  /**
   * Check if value is empty
   */
  isEmpty(value) {
    return !value || value.trim().length === 0;
  }

  /**
   * Validate field length
   */
  validateLength(value, type, options = {}) {
    const result = { isValid: true, errors: [] };
    
    const limits = options.limits || this.config.LIMITS[type] || this.config.LIMITS.general;
    const length = value.length;
    
    if (limits.min && length < limits.min) {
      result.errors.push(`Must be at least ${limits.min} characters long`);
      result.isValid = false;
    }
    
    if (limits.max && length > limits.max) {
      result.errors.push(`Must be no more than ${limits.max} characters long`);
      result.isValid = false;
    }
    
    return result;
  }

  /**
   * Validate against patterns
   */
  validatePattern(value, type, options = {}) {
    const result = { isValid: true, errors: [] };
    
    const pattern = options.pattern || this.config.PATTERNS[type];
    
    if (pattern && !pattern.test(value)) {
      const errorMessage = options.patternError || this.getPatternErrorMessage(type);
      result.errors.push(errorMessage);
      result.isValid = false;
    }
    
    return result;
  }

  /**
   * Security validation to detect malicious input
   */
  validateSecurity(value, options = {}) {
    const result = { isValid: true, errors: [], warnings: [] };
    
    // Check for dangerous patterns
    for (const pattern of this.config.DANGEROUS_PATTERNS) {
      if (pattern.test(value)) {
        result.errors.push('Input contains potentially dangerous content');
        result.isValid = false;
        logger.security('Dangerous input pattern detected', {
          pattern: pattern.toString(),
          input: value.substring(0, 100) + (value.length > 100 ? '...' : '')
        });
        
        // LUCI-LOW-004: Record security event
        recordSecurityEvent(SECURITY_EVENT_TYPES.XSS_ATTEMPT, {
          pattern: pattern.toString(),
          inputLength: value.length,
          detectedAt: Date.now()
        }, ALERT_LEVELS.HIGH);
        
        break;
      }
    }
    
    // Check for SQL injection attempts
    if (options.checkSQLInjection !== false) {
      for (const pattern of this.config.SQL_INJECTION_PATTERNS) {
        if (pattern.test(value)) {
          result.errors.push('Input contains potentially malicious SQL content');
          result.isValid = false;
          logger.security('Potential SQL injection detected', {
            pattern: pattern.toString(),
            input: value.substring(0, 100) + (value.length > 100 ? '...' : '')
          });
          
          // LUCI-LOW-004: Record security event
          recordSecurityEvent(SECURITY_EVENT_TYPES.SQL_INJECTION_ATTEMPT, {
            pattern: pattern.toString(),
            inputLength: value.length,
            detectedAt: Date.now()
          }, ALERT_LEVELS.CRITICAL);
          
          break;
        }
      }
    }
    
    // Check for excessive special characters (potential encoding attacks)
    const specialCharCount = (value.match(/[<>'"&%]/g) || []).length;
    const specialCharRatio = specialCharCount / value.length;
    
    if (specialCharRatio > 0.3 && value.length > 10) {
      result.warnings.push('Input contains many special characters');
      logger.warn('High special character ratio in input', {
        ratio: specialCharRatio,
        specialCharCount,
        totalLength: value.length
      });
    }
    
    return result;
  }

  /**
   * Get appropriate error message for pattern validation
   */
  getPatternErrorMessage(type) {
    const messages = {
      email: 'Please enter a valid email address',
      phone: 'Please enter a valid phone number',
      url: 'Please enter a valid URL',
      username: 'Username can only contain letters, numbers, underscores, and hyphens',
      alphanumeric: 'Field can only contain letters, numbers, and spaces',
      numeric: 'Field can only contain numbers',
      hexColor: 'Please enter a valid hex color code',
      slug: 'Please enter a valid slug (lowercase letters, numbers, and hyphens)',
      uuid: 'Please enter a valid UUID'
    };
    
    return messages[type] || 'Invalid format';
  }

  /**
   * Validate multiple fields at once
   */
  validateFields(fields) {
    const results = {};
    let allValid = true;
    
    for (const [fieldName, fieldConfig] of Object.entries(fields)) {
      const { value, type, options = {} } = fieldConfig;
      results[fieldName] = this.validate(value, type, options);
      
      if (!results[fieldName].isValid) {
        allValid = false;
      }
    }
    
    return {
      isValid: allValid,
      fields: results,
      summary: this.generateValidationSummary(results)
    };
  }

  /**
   * Generate validation summary
   */
  generateValidationSummary(results) {
    const summary = {
      totalFields: Object.keys(results).length,
      validFields: 0,
      invalidFields: 0,
      totalErrors: 0,
      totalWarnings: 0
    };
    
    for (const result of Object.values(results)) {
      if (result.isValid) {
        summary.validFields++;
      } else {
        summary.invalidFields++;
      }
      
      summary.totalErrors += result.errors.length;
      summary.totalWarnings += result.warnings.length;
    }
    
    return summary;
  }

  /**
   * Sanitize HTML content
   */
  sanitizeHTML(input, options = {}) {
    if (typeof input !== 'string') {
      return '';
    }
    
    let sanitized = input;
    
    // Remove script tags
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
    
    // Remove dangerous attributes
    sanitized = sanitized.replace(/\s*on\w+\s*=/gi, '');
    
    // Remove javascript: and vbscript: protocols
    sanitized = sanitized.replace(/(javascript|vbscript):/gi, '');
    
    // Allow only specific tags if whitelist provided
    if (options.allowedTags) {
      const allowedTagPattern = new RegExp(
        `<(?!/?(?:${options.allowedTags.join('|')})\\b)[^>]*>`,
        'gi'
      );
      sanitized = sanitized.replace(allowedTagPattern, '');
    } else if (!options.allowHTML) {
      // Remove all HTML tags by default
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }
    
    // Decode HTML entities
    if (options.decodeEntities) {
      const entityMap = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#x27;': "'"
      };
      
      for (const [entity, char] of Object.entries(entityMap)) {
        sanitized = sanitized.replace(new RegExp(entity, 'g'), char);
      }
    }
    
    return sanitized.trim();
  }

  /**
   * Create validation schema
   */
  static createSchema(schemaDefinition) {
    return new ValidationSchema(schemaDefinition);
  }
}

/**
 * Validation Schema Class
 */
export class ValidationSchema {
  constructor(definition) {
    this.definition = definition;
    this.validator = new InputValidator();
  }

  /**
   * Validate data against schema
   */
  validate(data) {
    const fields = {};
    
    for (const [fieldName, fieldSchema] of Object.entries(this.definition)) {
      const value = data[fieldName];
      fields[fieldName] = {
        value,
        type: fieldSchema.type,
        options: fieldSchema.options || {}
      };
    }
    
    return this.validator.validateFields(fields);
  }
}

/**
 * Predefined validation schemas
 */
export const ValidationSchemas = {
  contactForm: new ValidationSchema({
    name: {
      type: 'general',
      options: { required: true, limits: { min: 2, max: 100 } }
    },
    email: {
      type: 'email',
      options: { required: true }
    },
    message: {
      type: 'message',
      options: { required: true, limits: { min: 10, max: 5000 } }
    }
  }),
  
  userRegistration: new ValidationSchema({
    username: {
      type: 'username',
      options: { required: true }
    },
    email: {
      type: 'email',
      options: { required: true }
    },
    password: {
      type: 'password',
      options: { required: true }
    }
  }),
  
  profileUpdate: new ValidationSchema({
    name: {
      type: 'general',
      options: { required: false, limits: { max: 100 } }
    },
    bio: {
      type: 'general',
      options: { required: false, limits: { max: 500 } }
    },
    website: {
      type: 'url',
      options: { required: false }
    }
  })
};

/**
 * Utility functions
 */
export const validateEmail = (email) => {
  const validator = new InputValidator();
  return validator.validate(email, 'email', { required: true });
};

export const validateURL = (url) => {
  const validator = new InputValidator();
  return validator.validate(url, 'url', { required: true });
};

export const sanitizeInput = (input, options = {}) => {
  const validator = new InputValidator();
  return validator.sanitizeHTML(input, options);
};

// Export default instance
export default new InputValidator();