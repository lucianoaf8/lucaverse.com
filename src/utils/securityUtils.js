/**
 * Security Utilities for XSS Prevention and Input Sanitization
 * Following OWASP XSS Prevention Guidelines
 */

import { securityLogger } from './logger.js';

// HTML entities for encoding
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

// URL validation regex
const URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

// Enhanced email validation regex (RFC 5322 compliant - matches server-side)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Enhanced name validation - supports international characters (matches server-side)
const NAME_REGEX = /^[a-zA-ZÀ-ÿĀ-žА-я\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\s'-]{1,100}$/u;

// XSS detection patterns (matches server-side)
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe[^>]*>/gi,
  /<object[^>]*>/gi,
  /<embed[^>]*>/gi,
  /<form[^>]*>/gi,
  /data:text\/html/gi,
  /vbscript:/gi
];

// SQL injection patterns (matches server-side)
const SQL_PATTERNS = [
  /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/gi,
  /('|(\\')|(;)|(\\;)|(\|)|(\*)|(%)|(<)|(>)|(\{)|(\})|(\[)|(\])|(\()|(\)))/g,
  /(exec|execute|sp_|xp_)/gi
];

/**
 * HTML encode a string to prevent XSS
 * @param {string} str - String to encode
 * @returns {string} - HTML-encoded string
 */
export const htmlEncode = (str) => {
  if (typeof str !== 'string') {
    return '';
  }
  
  return str.replace(/[&<>"'`=\/]/g, (char) => HTML_ENTITIES[char] || char);
};

/**
 * JavaScript encode a string for use in JavaScript contexts
 * @param {string} str - String to encode
 * @returns {string} - JavaScript-encoded string
 */
export const jsEncode = (str) => {
  if (typeof str !== 'string') {
    return '';
  }
  
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\0/g, '\\0')
    .replace(/\x08/g, '\\b')
    .replace(/\x0c/g, '\\f')
    .replace(/\v/g, '\\v');
};

/**
 * URL encode a string for use in URL contexts
 * @param {string} str - String to encode
 * @returns {string} - URL-encoded string
 */
export const urlEncode = (str) => {
  if (typeof str !== 'string') {
    return '';
  }
  
  return encodeURIComponent(str);
};

/**
 * Detect potential XSS and injection attacks (matches server-side detection)
 * @param {string} input - Input to analyze
 * @returns {Array} - Array of detected threats
 */
export const detectSecurityThreats = (input) => {
  if (typeof input !== 'string') return [];
  
  const threats = [];
  const lowerInput = input.toLowerCase();
  
  // Check for XSS patterns
  XSS_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(input)) {
      threats.push(`XSS Pattern ${index + 1} detected`);
    }
  });
  
  // Check for SQL injection patterns
  SQL_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(input)) {
      threats.push(`SQL Injection Pattern ${index + 1} detected`);
    }
  });
  
  // Check for common script injection attempts
  const scriptKeywords = ['javascript:', 'vbscript:', 'data:text/html', 'file://', 'ftp://'];
  scriptKeywords.forEach(keyword => {
    if (lowerInput.includes(keyword)) {
      threats.push(`Script injection attempt: ${keyword}`);
    }
  });
  
  return threats;
};

/**
 * Validate and sanitize user input with configurable options
 * @param {string} input - Input to sanitize
 * @param {Object} options - Sanitization options
 * @returns {Object} - {isValid: boolean, sanitized: string, errors: string[]}
 */
export const sanitizeInput = (input, options = {}) => {
  const {
    maxLength = 1000,
    minLength = 0,
    allowHtml = false,
    type = 'text',
    required = false
  } = options;
  
  const errors = [];
  const warnings = [];
  let sanitized = input;
  
  // Type validation
  if (typeof input !== 'string') {
    sanitized = String(input || '');
    warnings.push('Input was converted to string');
  }
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Required validation
  if (required && !sanitized) {
    errors.push('Field is required');
    return { isValid: false, sanitized: '', errors, warnings };
  }
  
  // Skip further validation for empty optional fields
  if (!sanitized && !required) {
    return { isValid: true, sanitized: '', errors: [], warnings };
  }
  
  // Security threat detection
  const threats = detectSecurityThreats(sanitized);
  if (threats.length > 0) {
    errors.push('Security threat detected in input');
    // Use structured security logging
    securityLogger.security('Input validation threat detected', {
      type,
      threats,
      inputLength: input.length,
      threatCount: threats.length
    });
    return { isValid: false, sanitized: '', errors, warnings, threats };
  }
  
  // Length validation
  if (sanitized.length > maxLength) {
    errors.push(`Input exceeds maximum length of ${maxLength} characters`);
    sanitized = sanitized.substring(0, maxLength);
  }
  
  if (sanitized.length < minLength) {
    errors.push(`Input must be at least ${minLength} characters`);
  }
  
  // Type-specific validation and sanitization
  switch (type) {
    case 'email':
      if (sanitized && !EMAIL_REGEX.test(sanitized)) {
        errors.push('Invalid email format');
      }
      break;
      
    case 'name':
      if (sanitized && !NAME_REGEX.test(sanitized)) {
        errors.push('Name contains invalid characters');
      }
      break;
      
    case 'url':
      if (sanitized && !URL_REGEX.test(sanitized)) {
        errors.push('Invalid URL format');
      }
      break;
      
    case 'html':
      if (!allowHtml) {
        sanitized = htmlEncode(sanitized);
      }
      break;
      
    default:
      // Default text sanitization
      sanitized = htmlEncode(sanitized);
  }
  
  return {
    isValid: errors.length === 0,
    sanitized,
    errors,
    warnings
  };
};

/**
 * Sanitize OAuth user data from external providers
 * @param {Object} userData - User data from OAuth provider
 * @returns {Object} - Sanitized user data
 */
export const sanitizeOAuthUserData = (userData) => {
  if (!userData || typeof userData !== 'object') {
    return {
      id: '',
      name: 'Unknown User',
      email: '',
      picture: '',
      permissions: []
    };
  }
  
  // Sanitize each field with appropriate validation
  const name = sanitizeInput(userData.name || 'Unknown User', {
    maxLength: 100,
    type: 'name',
    required: false
  });
  
  const email = sanitizeInput(userData.email || '', {
    maxLength: 254,
    type: 'email',
    required: false
  });
  
  const picture = sanitizeInput(userData.picture || '', {
    maxLength: 2000,
    type: 'url',
    required: false
  });
  
  // Validate permissions array
  let permissions = [];
  if (Array.isArray(userData.permissions)) {
    permissions = userData.permissions
      .filter(p => typeof p === 'string')
      .map(p => sanitizeInput(p, { maxLength: 50, type: 'text' }).sanitized)
      .filter(p => p.length > 0);
  }
  
  return {
    id: sanitizeInput(userData.id || '', { maxLength: 100, type: 'text' }).sanitized,
    name: name.sanitized || 'Unknown User',
    email: email.sanitized,
    picture: picture.isValid ? picture.sanitized : '', // Only use valid URLs
    permissions
  };
};

/**
 * Validate and sanitize form data
 * @param {Object} formData - Form data to sanitize
 * @param {Object} schema - Validation schema
 * @returns {Object} - {isValid: boolean, sanitizedData: Object, errors: Object}
 */
export const sanitizeFormData = (formData, schema) => {
  const sanitizedData = {};
  const errors = {};
  let isValid = true;
  
  for (const [field, options] of Object.entries(schema)) {
    const value = formData[field];
    const result = sanitizeInput(value, options);
    
    sanitizedData[field] = result.sanitized;
    
    if (!result.isValid) {
      errors[field] = result.errors;
      isValid = false;
    }
  }
  
  return { isValid, sanitizedData, errors };
};

/**
 * Generate Content Security Policy header value
 * @returns {string} - CSP header value
 */
export const generateCSPHeader = () => {
  const policies = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://lucaverse-auth.lucianoaf8.workers.dev https://summer-heart.lucianoaf8.workers.dev https://accounts.google.com",
    "frame-src 'self' https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ];
  
  return policies.join('; ');
};

/**
 * Safe React component for rendering potentially unsafe content
 * @param {string} content - Content to render
 * @param {string} fallback - Fallback content if sanitization fails
 * @returns {string} - Safe content for React rendering
 */
export const safeRender = (content, fallback = '') => {
  if (typeof content !== 'string') {
    return fallback;
  }
  
  const result = sanitizeInput(content, { allowHtml: false });
  return result.isValid ? result.sanitized : fallback;
};

/**
 * Validate image URL for safety
 * @param {string} url - Image URL to validate
 * @returns {boolean} - Whether URL is safe
 */
export const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  // Check URL format
  if (!URL_REGEX.test(url)) {
    return false;
  }
  
  // Only allow HTTPS URLs for security
  if (!url.startsWith('https://')) {
    return false;
  }
  
  // Check for common image file extensions or known safe domains
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
  const safeDomains = [
    'lh3.googleusercontent.com', // Google profile images
    'graph.facebook.com',        // Facebook profile images
    'avatars.githubusercontent.com', // GitHub profile images
    'secure.gravatar.com'        // Gravatar images
  ];
  
  const urlObj = new URL(url);
  const isSafeDomain = safeDomains.some(domain => urlObj.hostname === domain);
  const hasImageExtension = imageExtensions.test(urlObj.pathname);
  
  return isSafeDomain || hasImageExtension;
};

// Input validation schemas for common forms (matches server-side validation)
export const VALIDATION_SCHEMAS = {
  contact: {
    name: { maxLength: 100, type: 'name', required: true, minLength: 1 },
    email: { maxLength: 254, type: 'email', required: true },
    subject: { maxLength: 200, type: 'text', required: true, minLength: 1 },
    message: { maxLength: 10000, type: 'text', required: true, minLength: 10 }
  },
  
  accessRequest: {
    name: { maxLength: 100, type: 'name', required: true, minLength: 1 },
    email: { maxLength: 254, type: 'email', required: true },
    reason: { maxLength: 2000, type: 'text', required: true, minLength: 20 }
  }
};