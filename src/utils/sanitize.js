// HTML Sanitization utility using DOMPurify
import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} dirty - The potentially unsafe HTML string
 * @param {object} options - DOMPurify configuration options
 * @returns {string} - Sanitized HTML string
 */
export const sanitizeHtml = (dirty, options = {}) => {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  // Default configuration - very restrictive
  const defaultConfig = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'span'],
    ALLOWED_ATTR: ['class'],
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    SANITIZE_DOM: true,
    ...options
  };

  return DOMPurify.sanitize(dirty, defaultConfig);
};

/**
 * Sanitize text content - strips all HTML
 * @param {string} dirty - The potentially unsafe string
 * @returns {string} - Plain text string
 */
export const sanitizeText = (dirty) => {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(dirty, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
};

/**
 * Create a safe React component for rendering sanitized HTML
 * Use this only when absolutely necessary - prefer plain text rendering
 * @param {string} html - HTML content to sanitize and render
 * @param {object} options - DOMPurify options
 * @returns {object} - Props object for dangerouslySetInnerHTML
 */
export const createSafeHtml = (html, options = {}) => {
  const sanitized = sanitizeHtml(html, options);
  return { __html: sanitized };
};

/**
 * Validate and sanitize translation interpolation values
 * Use this for any dynamic content in i18n translations
 * @param {object} interpolationValues - Object with interpolation values
 * @returns {object} - Sanitized interpolation values
 */
export const sanitizeTranslationValues = (interpolationValues) => {
  if (!interpolationValues || typeof interpolationValues !== 'object') {
    return {};
  }

  const sanitized = {};
  
  for (const [key, value] of Object.entries(interpolationValues)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else {
      // For complex objects, convert to string and sanitize
      sanitized[key] = sanitizeText(String(value));
    }
  }

  return sanitized;
};

export default {
  sanitizeHtml,
  sanitizeText,
  createSafeHtml,
  sanitizeTranslationValues
};