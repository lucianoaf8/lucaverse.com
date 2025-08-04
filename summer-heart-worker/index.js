// Enhanced security helpers and rate limiting
const RATE_LIMIT_CONFIG = {
  maxRequests: 10,        // Max requests per time window
  timeWindow: 3600000,    // 1 hour in milliseconds
  blockDuration: 7200000  // 2 hours block duration
};

/**
 * Extract client identifier for rate limiting
 * @param {Request} request - Cloudflare request object
 * @returns {string} - Client identifier
 */
const getClientIdentifier = (request) => {
  // Use CF-Connecting-IP (real client IP) or fallback to other headers
  const clientIP = request.headers.get('CF-Connecting-IP') || 
                  request.headers.get('X-Forwarded-For') || 
                  request.headers.get('X-Real-IP') || 
                  'unknown';
  
  // Anonymize IP for privacy while maintaining rate limiting effectiveness
  if (clientIP.includes('.')) {
    // IPv4: Keep first 3 octets
    const parts = clientIP.split('.');
    return parts.slice(0, 3).join('.') + '.x';
  } else if (clientIP.includes(':')) {
    // IPv6: Keep first 4 segments
    const parts = clientIP.split(':');
    return parts.slice(0, 4).join(':') + '::x';
  }
  
  return 'unknown';
};

/**
 * Simple rate limiting using KV storage (if available)
 * @param {string} clientId - Client identifier
 * @param {Object} env - Environment variables (for KV access)
 * @returns {Promise<Object>} - Rate limit check result
 */
const checkRateLimit = async (clientId, env) => {
  // If no KV namespace available, skip rate limiting
  if (!env.RATE_LIMIT_KV) {
    return { allowed: true, remaining: RATE_LIMIT_CONFIG.maxRequests };
  }
  
  try {
    const now = Date.now();
    const key = `rate_limit:${clientId}`;
    const stored = await env.RATE_LIMIT_KV.get(key, 'json');
    
    if (!stored) {
      // First request from this client
      await env.RATE_LIMIT_KV.put(key, JSON.stringify({
        count: 1,
        firstRequest: now,
        lastRequest: now
      }), { expirationTtl: Math.ceil(RATE_LIMIT_CONFIG.timeWindow / 1000) });
      
      return { allowed: true, remaining: RATE_LIMIT_CONFIG.maxRequests - 1 };
    }
    
    // Check if we're in a new time window
    if (now - stored.firstRequest > RATE_LIMIT_CONFIG.timeWindow) {
      // Reset counter for new window
      await env.RATE_LIMIT_KV.put(key, JSON.stringify({
        count: 1,
        firstRequest: now,
        lastRequest: now
      }), { expirationTtl: Math.ceil(RATE_LIMIT_CONFIG.timeWindow / 1000) });
      
      return { allowed: true, remaining: RATE_LIMIT_CONFIG.maxRequests - 1 };
    }
    
    // Check if rate limit exceeded
    if (stored.count >= RATE_LIMIT_CONFIG.maxRequests) {
      return { 
        allowed: false, 
        remaining: 0, 
        resetTime: stored.firstRequest + RATE_LIMIT_CONFIG.timeWindow 
      };
    }
    
    // Increment counter
    await env.RATE_LIMIT_KV.put(key, JSON.stringify({
      count: stored.count + 1,
      firstRequest: stored.firstRequest,
      lastRequest: now
    }), { expirationTtl: Math.ceil(RATE_LIMIT_CONFIG.timeWindow / 1000) });
    
    return { allowed: true, remaining: RATE_LIMIT_CONFIG.maxRequests - stored.count - 1 };
    
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - allow request if rate limiting fails
    return { allowed: true, remaining: RATE_LIMIT_CONFIG.maxRequests };
  }
};

/**
 * Enhanced honeypot validation with multiple checks and bot detection
 * @param {FormData} formData - Form data to validate
 * @returns {Object} - Validation result with detailed analysis
 */
const validateHoneypotFields = (formData) => {
  const botIndicators = [];
  let suspicionScore = 0;
  
  // Get all form data keys to analyze potential honeypot fields
  const formKeys = Array.from(formData.keys());
  
  // Common honeypot field patterns that should be empty
  const honeypotPatterns = [
    /^(user|contact|form|customer|client|account)[_-]?(url|site|page|link|address|info|data)$/i,
    /^website$/i, // Legacy honeypot field
    /^(homepage|profile|company)[_-]?(url|site|link)$/i
  ];
  
  // Check for filled honeypot fields
  for (const key of formKeys) {
    const isHoneypot = honeypotPatterns.some(pattern => pattern.test(key));
    if (isHoneypot) {
      const value = formData.get(key);
      if (value && value.trim()) {
        botIndicators.push(`Honeypot field '${key}' filled with: "${value.substring(0, 50)}..."`);
        suspicionScore += 10;
      }
    }
  }
  
  // Check for suspiciously fast submission
  const timestamp = formData.get('timestamp');
  const formStartTime = formData.get('formStartTime');
  
  if (timestamp && formStartTime) {
    const submissionTime = parseInt(timestamp);
    const startTime = parseInt(formStartTime);
    const timeTaken = submissionTime - startTime;
    
    if (timeTaken < 3000) { // Less than 3 seconds
      botIndicators.push(`Suspiciously fast submission: ${timeTaken}ms`);
      suspicionScore += 8;
    } else if (timeTaken < 1000) { // Less than 1 second - very suspicious
      botIndicators.push(`Extremely fast submission: ${timeTaken}ms`);
      suspicionScore += 15;
    }
  }
  
  // Check for multiple rapid submissions
  const submissionCount = formData.get('submissionCount');
  if (submissionCount && parseInt(submissionCount) > 3) {
    botIndicators.push(`Multiple rapid submissions: ${submissionCount}`);
    suspicionScore += 5;
  }
  
  // Check for missing expected human behavior fields
  const requiredHumanFields = ['name', 'email', 'message'];
  const missingFields = requiredHumanFields.filter(field => 
    !formData.get(field) || !formData.get(field).trim()
  );
  
  if (missingFields.length > 1) {
    botIndicators.push(`Missing human-expected fields: ${missingFields.join(', ')}`);
    suspicionScore += missingFields.length * 3;
  }
  
  // Check for suspicious user agent patterns
  const userAgent = formData.get('userAgent');
  if (userAgent) {
    const suspiciousAgents = ['bot', 'crawler', 'spider', 'scraper', 'curl', 'wget'];
    const lowerAgent = userAgent.toLowerCase();
    
    for (const suspicious of suspiciousAgents) {
      if (lowerAgent.includes(suspicious)) {
        botIndicators.push(`Suspicious user agent: ${suspicious}`);
        suspicionScore += 7;
        break;
      }
    }
  }
  
  // Check interaction count (too low might indicate automation)
  const interactionCount = formData.get('interactionCount');
  if (interactionCount && parseInt(interactionCount) < 5) {
    botIndicators.push(`Low interaction count: ${interactionCount}`);
    suspicionScore += 3;
  }
  
  // Determine if this is likely a bot
  const isBot = suspicionScore >= 10 || botIndicators.length >= 2;
  const confidence = Math.min(suspicionScore / 20, 1); // Confidence score 0-1
  
  return {
    isBot,
    suspicionScore,
    indicators: botIndicators,
    confidence,
    action: isBot ? 'block' : 'allow'
  };
};

/**
 * Enhanced CSRF token validation with additional security checks
 * @param {Request} request - Cloudflare request object
 * @param {FormData} formData - Form data from request
 * @returns {Object} - Validation result
 */
const validateCSRFToken = (request, formData) => {
  // Get CSRF token from form data
  const formToken = formData.get('csrf_token');
  
  // Get CSRF token from cookie header
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) acc[name] = value;
    return acc;
  }, {});
  const cookieToken = cookies.csrf_token;
  
  // Both tokens must be present
  if (!formToken || !cookieToken) {
    return { valid: false, error: 'Missing CSRF token' };
  }
  
  // Tokens must match (double-submit cookie pattern)
  if (formToken !== cookieToken) {
    return { valid: false, error: 'Invalid CSRF token' };
  }
  
  // Token must have valid format (64 hex characters)
  const tokenRegex = /^[a-f0-9]{64}$/;
  if (!tokenRegex.test(formToken)) {
    return { valid: false, error: 'Malformed CSRF token' };
  }
  
  // Additional security: Check origin header
  const origin = request.headers.get('Origin');
  const allowedOrigins = [
    'https://lucaverse.com',
    'https://www.lucaverse.com',
    'http://localhost:3000',
    'http://localhost:5155'
  ];
  
  if (origin && !allowedOrigins.includes(origin)) {
    return { valid: false, error: 'Invalid origin' };
  }
  
  return { valid: true };
};

// Enhanced Security and Validation Utilities
// Comprehensive input validation following OWASP XSS Prevention Guidelines

// HTML entities for encoding - extended set for better security
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
  '\n': '&#10;',
  '\r': '&#13;'
};

// Security patterns for validation
const SECURITY_PATTERNS = {
  // Enhanced email validation (RFC 5322 compliant)
  email: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  
  // Enhanced name validation - supports international characters
  name: /^[a-zA-ZÀ-ÿĀ-žА-я\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\s'-]{1,100}$/u,
  
  // URL validation - HTTPS only for security
  url: /^https:\/\/[^\s/$.?#].[^\s]*$/i,
  
  // Phone number validation (international format)
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  
  // Postal code validation (flexible international)
  postalCode: /^[a-zA-Z0-9\s-]{3,10}$/,
  
  // Safe text - no script injection patterns
  safeText: /^[^<>]*$/,
  
  // XSS detection patterns
  xssPatterns: [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
    /<form[^>]*>/gi,
    /data:text\/html/gi,
    /vbscript:/gi
  ],
  
  // SQL injection patterns
  sqlPatterns: [
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/gi,
    /('|(\\')|(;)|(\\;)|(\|)|(\*)|(%)|(<)|(>)|(\{)|(\})|(\[)|(\])|(\()|(\)))/g,
    /(exec|execute|sp_|xp_)/gi
  ]
};

// Content type detection and validation
const CONTENT_TYPES = {
  text: { maxLength: 5000, minLength: 1 },
  name: { maxLength: 100, minLength: 1 },
  email: { maxLength: 254, minLength: 5 },
  subject: { maxLength: 200, minLength: 1 },
  message: { maxLength: 10000, minLength: 10 },
  phone: { maxLength: 20, minLength: 7 },
  url: { maxLength: 2000, minLength: 10 },
  postalCode: { maxLength: 10, minLength: 3 }
};

/**
 * Enhanced HTML encoding with comprehensive entity mapping
 * @param {string} str - String to encode
 * @returns {string} - HTML-encoded string
 */
const htmlEncode = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"'`=\/\n\r]/g, (char) => HTML_ENTITIES[char] || char);
};

/**
 * JavaScript encoding for context-aware output encoding
 * @param {string} str - String to encode
 * @returns {string} - JavaScript-encoded string
 */
const jsEncode = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\0/g, '\\0');
};

/**
 * URL encoding for URL context
 * @param {string} str - String to encode
 * @returns {string} - URL-encoded string
 */
const urlEncode = (str) => {
  if (typeof str !== 'string') return '';
  return encodeURIComponent(str);
};

/**
 * Detect potential XSS and injection attacks
 * @param {string} input - Input to analyze
 * @returns {Array} - Array of detected threats
 */
const detectSecurityThreats = (input) => {
  if (typeof input !== 'string') return [];
  
  const threats = [];
  const lowerInput = input.toLowerCase();
  
  // Check for XSS patterns
  SECURITY_PATTERNS.xssPatterns.forEach((pattern, index) => {
    if (pattern.test(input)) {
      threats.push(`XSS Pattern ${index + 1} detected`);
    }
  });
  
  // Check for SQL injection patterns
  SECURITY_PATTERNS.sqlPatterns.forEach((pattern, index) => {
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
 * Validate input length with context-aware limits
 * @param {string} input - Input to validate
 * @param {string} type - Type of input (text, email, name, etc.)
 * @returns {Object} - Validation result
 */
const validateLength = (input, type = 'text') => {
  const limits = CONTENT_TYPES[type] || CONTENT_TYPES.text;
  const length = input.length;
  
  if (length < limits.minLength) {
    return {
      valid: false,
      error: `${type} must be at least ${limits.minLength} characters`
    };
  }
  
  if (length > limits.maxLength) {
    return {
      valid: false,
      error: `${type} exceeds maximum length of ${limits.maxLength} characters`
    };
  }
  
  return { valid: true };
};

/**
 * Comprehensive input validation and sanitization
 * @param {string} input - Input to validate and sanitize
 * @param {string} type - Type of input validation
 * @param {boolean} required - Whether the field is required
 * @param {Object} options - Additional validation options
 * @returns {Object} - Validation and sanitization result
 */
const validateAndSanitizeInput = (input, type = 'text', required = false, options = {}) => {
  const result = {
    original: input,
    sanitized: '',
    valid: true,
    errors: [],
    warnings: [],
    threats: []
  };
  
  // Type coercion
  if (typeof input !== 'string') {
    input = String(input || '');
    result.warnings.push('Input was converted to string');
  }
  
  // Trim whitespace
  input = input.trim();
  
  // Required field validation
  if (required && !input) {
    result.valid = false;
    result.errors.push(`${type} field is required`);
    return result;
  }
  
  // Skip further validation for empty optional fields
  if (!input && !required) {
    result.sanitized = '';
    return result;
  }
  
  // Length validation
  const lengthValidation = validateLength(input, type);
  if (!lengthValidation.valid) {
    result.valid = false;
    result.errors.push(lengthValidation.error);
  }
  
  // Security threat detection
  const threats = detectSecurityThreats(input);
  if (threats.length > 0) {
    result.valid = false;
    result.threats = threats;
    result.errors.push('Security threat detected in input');
    return result; // Don't process further if threats detected
  }
  
  // Type-specific validation
  let sanitized = input;
  
  switch (type) {
    case 'email':
      if (!SECURITY_PATTERNS.email.test(input)) {
        result.valid = false;
        result.errors.push('Invalid email format');
      }
      sanitized = htmlEncode(input.toLowerCase());
      break;
      
    case 'name':
      if (!SECURITY_PATTERNS.name.test(input)) {
        result.valid = false;
        result.errors.push('Name contains invalid characters or format');
      }
      // Normalize name format (title case)
      sanitized = htmlEncode(input.replace(/\b\w/g, l => l.toUpperCase()));
      break;
      
    case 'phone':
      const cleanPhone = input.replace(/[\s\-\(\)\.]/g, '');
      if (!SECURITY_PATTERNS.phone.test(cleanPhone)) {
        result.valid = false;
        result.errors.push('Invalid phone number format');
      }
      sanitized = htmlEncode(cleanPhone);
      break;
      
    case 'url':
      if (!SECURITY_PATTERNS.url.test(input)) {
        result.valid = false;
        result.errors.push('Invalid URL format or non-HTTPS URL');
      }
      sanitized = urlEncode(input);
      break;
      
    case 'postalCode':
      if (!SECURITY_PATTERNS.postalCode.test(input)) {
        result.valid = false;
        result.errors.push('Invalid postal code format');
      }
      sanitized = htmlEncode(input.toUpperCase());
      break;
      
    case 'subject':
    case 'message':
    case 'text':
    default:
      // Check for unsafe patterns in text content
      if (!SECURITY_PATTERNS.safeText.test(input)) {
        result.warnings.push('Text contains potentially unsafe characters');
      }
      sanitized = htmlEncode(input);
      break;
  }
  
  // Final sanitization options
  if (options.maxWords) {
    const words = sanitized.split(/\s+/);
    if (words.length > options.maxWords) {
      sanitized = words.slice(0, options.maxWords).join(' ');
      result.warnings.push(`Text truncated to ${options.maxWords} words`);
    }
  }
  
  if (options.removeNewlines) {
    sanitized = sanitized.replace(/[\n\r]/g, ' ');
  }
  
  if (options.removeDuplicateSpaces) {
    sanitized = sanitized.replace(/\s+/g, ' ');
  }
  
  result.sanitized = sanitized;
  return result;
};

export default {
    async fetch(request, env, ctx) {
      if (request.method === 'OPTIONS') {
        return handleOptions(request);
      }
  
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(request) });
      }
      
      // SECURITY: Rate limiting check
      const clientId = getClientIdentifier(request);
      const rateLimitResult = await checkRateLimit(clientId, env);
      
      if (!rateLimitResult.allowed) {
        const resetDate = new Date(rateLimitResult.resetTime).toISOString();
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded', 
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
          resetTime: resetDate
        }), { 
          status: 429, 
          headers: { 
            ...corsHeaders(request), 
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': RATE_LIMIT_CONFIG.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
          }
        });
      }
  
      // SECURITY: Validate Content-Type header
      const contentType = request.headers.get('content-type') || '';
      if (!contentType.includes('multipart/form-data') && !contentType.includes('application/x-www-form-urlencoded')) {
        return new Response(JSON.stringify({ 
          error: 'Bad Request', 
          message: 'Content-Type must be multipart/form-data or application/x-www-form-urlencoded' 
        }), { 
          status: 400, 
          headers: { ...corsHeaders(request), 'Content-Type': 'application/json' }
        });
      }
  
      try {
        const formData = await request.formData();
  
        // SECURITY: Validate CSRF token
        const csrfValidation = validateCSRFToken(request, formData);
        if (!csrfValidation.valid) {
          return new Response(JSON.stringify({ 
            error: 'Security validation failed', 
            message: csrfValidation.error 
          }), { 
            status: 403, 
            headers: { ...corsHeaders(request), 'Content-Type': 'application/json' }
          });
        }
  
        // Enhanced honeypot validation for bot protection
        const honeypotValidation = validateHoneypotFields(formData);
        if (honeypotValidation.isBot) {
          console.log('Bot detected:', {
            score: honeypotValidation.suspicionScore,
            confidence: honeypotValidation.confidence,
            indicators: honeypotValidation.indicators,
            timestamp: new Date().toISOString()
          });
          
          return new Response(JSON.stringify({ 
            error: 'Bot activity detected',
            message: 'Automated submissions are not allowed'
          }), { 
            status: 429, // Too Many Requests - appropriate for bot blocking
            headers: { ...corsHeaders(request), 'Content-Type': 'application/json' }
          });
        }
  
        // Enhanced validation and sanitization of form fields
        const validationResults = {};
        const sanitizedData = {};
        let hasErrors = false;
        const allErrors = [];
        const allWarnings = [];
        
        // Define field validation requirements
        const fieldValidations = {
          name: { type: 'name', required: true, options: { removeDuplicateSpaces: true } },
          email: { type: 'email', required: true, options: {} },
          message: { type: 'message', required: true, options: { maxWords: 1000, removeDuplicateSpaces: true } },
          subject: { type: 'subject', required: false, options: { removeDuplicateSpaces: true } },
          formType: { type: 'text', required: false, options: {} },
          formTitle: { type: 'text', required: false, options: {} }
        };
        
        // Process each field with enhanced validation
        for (const [fieldName, config] of Object.entries(fieldValidations)) {
          const rawValue = formData.get(fieldName) || (fieldName === 'name' ? 'Anonymous' : '');
          const result = validateAndSanitizeInput(rawValue, config.type, config.required, config.options);
          
          validationResults[fieldName] = result;
          sanitizedData[fieldName] = result.sanitized;
          
          if (!result.valid) {
            hasErrors = true;
            allErrors.push(`${fieldName}: ${result.errors.join(', ')}`);
            
            // Log security threats separately for monitoring
            if (result.threats.length > 0) {
              console.warn(`Security threats detected in ${fieldName}:`, result.threats);
              allErrors.push(`${fieldName}: Security threat detected`);
            }
          }
          
          if (result.warnings.length > 0) {
            allWarnings.push(`${fieldName}: ${result.warnings.join(', ')}`);
          }
        }
        
        // Return detailed validation errors if any field failed
        if (hasErrors) {
          return new Response(JSON.stringify({ 
            error: 'Input validation failed', 
            message: 'One or more fields contain invalid or unsafe content',
            details: allErrors,
            warnings: allWarnings.length > 0 ? allWarnings : undefined
          }), { 
            status: 400, 
            headers: { ...corsHeaders(request), 'Content-Type': 'application/json' }
          });
        }
        
        // Log warnings for monitoring (but don't fail the request)
        if (allWarnings.length > 0) {
          console.log('Validation warnings:', allWarnings);
        }
        
        // Extract sanitized values for processing
        const { name, email, message, subject, formType, formTitle } = sanitizedData;
        
        // Privacy consent information
        const privacyConsent = JSON.parse(formData.get('privacyConsent') || '{}');
        const analyticsAllowed = privacyConsent.analytics === true;
        const performanceAllowed = privacyConsent.performance === true;
        
        // Privacy-compliant data collection based on user consent
        const enhancedData = {
          // Privacy metadata (always included for compliance)
          privacyConsentVersion: privacyConsent.version || 'none',
          privacyConsentTimestamp: privacyConsent.timestamp || null,
          analyticsConsent: analyticsAllowed,
          performanceConsent: performanceAllowed,
          
          // Essential technical data (always allowed)
          timestamp: formData.get('timestamp') || new Date().toISOString(),
          
          // Analytics data (only if consented)
          ...(analyticsAllowed && {
            siteLanguage: formData.get('siteLanguage') || 'unknown',
            country: request.cf?.country || 'Unknown', // Country level only
            deviceType: formData.get('deviceType') || 'unknown',
            timeToComplete: formData.get('timeToComplete') || 'unknown',
            scrollDepth: formData.get('scrollDepth') || 'unknown',
            sessionDuration: formData.get('sessionDuration') || 'unknown',
            referrer: formData.get('referrer') === 'direct' ? 'direct' : 'external' // Anonymized
          }),
          
          // Performance data (only if consented)
          ...(performanceAllowed && {
            screenSize: formData.get('screenSize') || 'unknown',
            viewportSize: formData.get('viewportSize') || 'unknown',
            browserLanguage: formData.get('browserLanguage') || 'unknown',
            connectionType: formData.get('connectionType') || 'unknown',
            pixelRatio: formData.get('pixelRatio') || 'unknown',
            touchSupport: formData.get('touchSupport') || 'unknown'
          }),
          
          // Server-side data - anonymized and consent-based
          ...(analyticsAllowed && {
            userIPAnonymized: anonymizeIP(request.headers.get('CF-Connecting-IP') || 'Unknown'),
            region: request.cf?.region || 'Unknown',
            colo: request.cf?.colo || 'Unknown'
          })
        };
  
        // Create enhanced email content based on form type
        const emailContent = createEmailContent(formType, {
          name,
          email,
          message,
          subject,
          formTitle,
          timestamp: new Date().toISOString(),
          enhancedData
        });
  
        const payload = {
          to: ['contact@lucaverse.com'],
          from: 'contact@lucaverse.com',
          subject: emailContent.emailSubject,
          html: emailContent.html,           // ✨ NEW: Rich HTML formatting
          text: emailContent.text,           // ✨ IMPROVED: Better text formatting
          reply_to: email,
        };
  
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
  
        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error('Email send failed:', errorText);
          return new Response('Failed to send email.', { status: 500, headers: corsHeaders(request) });
        }
  
        return new Response(JSON.stringify({
          success: true,
          message: getSuccessMessage(formType)  // ✨ NEW: Dynamic success messages
        }), {
          status: 200,
          headers: {
            ...corsHeaders(request),
            'Content-Type': 'application/json',
            // Security headers
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Content-Security-Policy': generateCSPHeader(),
            // Rate limit headers
            'X-RateLimit-Limit': RATE_LIMIT_CONFIG.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': (Date.now() + RATE_LIMIT_CONFIG.timeWindow).toString()
          }
        });
  
      } catch (error) {
        console.error('Form handler error:', error);
        return new Response(error.stack || error.toString(), {
          status: 500,
          headers: corsHeaders(request),
        });
      }
    }
  };
  
  // Privacy utility function for IP anonymization
  function anonymizeIP(ip) {
    if (!ip || ip === 'Unknown') return 'Unknown';
    
    const parts = ip.split('.');
    if (parts.length === 4) {
      // IPv4: Zero out last octet
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
    
    // IPv6: Keep first 64 bits only
    if (ip.includes(':')) {
      const segments = ip.split(':');
      return segments.slice(0, 4).join(':') + '::';
    }
    
    return 'Unknown';
  }
  
  /**
   * Generate Content Security Policy header for enhanced XSS protection
   * @returns {string} - CSP header value
   */
  const generateCSPHeader = () => {
    const policies = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ];
    
    return policies.join('; ');
  };
  
  // ✨ UPDATED: Create formatted email content based on form type with privacy compliance
  function createEmailContent(formType, data) {
    const { name, email, message, subject, formTitle, timestamp, enhancedData } = data;
    const isAccessRequest = formType === 'access_request';
    
    // Dynamic subject line
    const emailSubject = isAccessRequest 
      ? `🔐 Lucaverse Access Request from ${name}`
      : `📧 ${subject || 'Portfolio Contact'} from ${name}`;
  
    // Enhanced HTML content
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
        <div style="background: linear-gradient(135deg, ${isAccessRequest ? '#001a2e, #003366' : '#1a2e00, #336600'}); padding: 25px; text-align: center;">
          <h1 style="color: ${isAccessRequest ? '#00ccff' : '#66ff00'}; margin: 0; font-size: 24px; text-shadow: 0 0 15px ${isAccessRequest ? '#00ccff' : '#66ff00'};">
            ${isAccessRequest ? '🌌 Lucaverse Access Request' : '💼 Portfolio Contact'}
          </h1>
          <p style="color: ${isAccessRequest ? '#80dfff' : '#b3ff80'}; margin: 8px 0 0 0; font-size: 16px;">
            ${formTitle || 'New submission received'}
          </p>
        </div>
        
        <div style="padding: 30px;">
          <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 5px solid ${isAccessRequest ? '#00ccff' : '#66ff00'};">
            <h2 style="color: ${isAccessRequest ? '#00ccff' : '#66ff00'}; margin: 0 0 15px 0; font-size: 18px;">
              ${isAccessRequest ? 'Applicant Details' : 'Contact Information'}
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 5px 0; color: #cccccc; font-weight: bold; width: 80px;">Name:</td><td style="padding: 5px 0; color: #ffffff;">${name}</td></tr>
              <tr><td style="padding: 5px 0; color: #cccccc; font-weight: bold;">Email:</td><td style="padding: 5px 0;"><a href="mailto:${email}" style="color: ${isAccessRequest ? '#00ccff' : '#66ff00'}; text-decoration: none;">${email}</a></td></tr>
              ${!isAccessRequest && subject ? `<tr><td style="padding: 5px 0; color: #cccccc; font-weight: bold;">Subject:</td><td style="padding: 5px 0; color: #ffffff;">${subject}</td></tr>` : ''}
              <tr><td style="padding: 5px 0; color: #cccccc; font-weight: bold;">Time:</td><td style="padding: 5px 0; color: #ffffff;">${new Date(timestamp).toLocaleString()}</td></tr>
            </table>
          </div>
          
          <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; border-left: 5px solid #ff9900;">
            <h3 style="color: #ff9900; margin: 0 0 15px 0; font-size: 16px;">
              ${isAccessRequest ? 'Access Request Reason:' : 'Message:'}
            </h3>
            <div style="background: #000000; padding: 15px; border-radius: 6px; font-family: 'Consolas', 'Monaco', monospace; white-space: pre-wrap; color: #ffffff; border: 1px solid #333333; line-height: 1.4;">${message}</div>
          </div>
          
          ${enhancedData ? `
          <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; border-left: 5px solid #9900ff; margin-top: 20px;">
            <h3 style="color: #9900ff; margin: 0 0 15px 0; font-size: 16px;">🛡️ Privacy-Compliant User Context</h3>
            
            <!-- Privacy Consent Status -->
            <div style="background: #0a0a0a; padding: 15px; border-radius: 6px; margin-bottom: 15px; border: 1px solid ${enhancedData.analyticsConsent ? '#66ff00' : '#ff6600'};">
              <h4 style="color: ${enhancedData.analyticsConsent ? '#66ff00' : '#ff6600'}; margin: 0 0 8px 0; font-size: 14px;">
                📋 Privacy Consent Status
              </h4>
              <table style="width: 100%; font-size: 12px;">
                <tr><td style="color: #cccccc; padding: 2px 0;">Consent Version:</td><td style="color: #ffffff;">${enhancedData.privacyConsentVersion}</td></tr>
                <tr><td style="color: #cccccc; padding: 2px 0;">Analytics:</td><td style="color: ${enhancedData.analyticsConsent ? '#66ff00' : '#ff6600'};">${enhancedData.analyticsConsent ? 'Consented ✓' : 'Not Consented ✗'}</td></tr>
                <tr><td style="color: #cccccc; padding: 2px 0;">Performance:</td><td style="color: ${enhancedData.performanceConsent ? '#66ff00' : '#ff6600'};">${enhancedData.performanceConsent ? 'Consented ✓' : 'Not Consented ✗'}</td></tr>
                <tr><td style="color: #cccccc; padding: 2px 0;">Consent Time:</td><td style="color: #ffffff;">${enhancedData.privacyConsentTimestamp ? new Date(enhancedData.privacyConsentTimestamp).toLocaleString() : 'Not recorded'}</td></tr>
              </table>
            </div>
            <!-- Only show data sections if user consented -->
            ${enhancedData.analyticsConsent || enhancedData.performanceConsent ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              ${enhancedData.analyticsConsent ? `
              <div>
                <h4 style="color: #cc99ff; margin: 0 0 8px 0; font-size: 14px;">📊 Analytics Data (Consented)</h4>
                <table style="width: 100%; font-size: 13px;">
                  <tr><td style="color: #cccccc; padding: 2px 0;">Country:</td><td style="color: #ffffff;">${enhancedData.country || 'Not collected'}</td></tr>
                  <tr><td style="color: #cccccc; padding: 2px 0;">Region:</td><td style="color: #ffffff;">${enhancedData.region || 'Not collected'}</td></tr>
                  <tr><td style="color: #cccccc; padding: 2px 0;">Site Lang:</td><td style="color: #ffffff;">${enhancedData.siteLanguage || 'Not collected'}</td></tr>
                  <tr><td style="color: #cccccc; padding: 2px 0;">Device:</td><td style="color: #ffffff;">${enhancedData.deviceType || 'Not collected'}</td></tr>
                  <tr><td style="color: #cccccc; padding: 2px 0;">Referrer:</td><td style="color: #ffffff;">${enhancedData.referrer || 'Not collected'}</td></tr>
                  <tr><td style="color: #cccccc; padding: 2px 0;">IP (Anonymized):</td><td style="color: #ffffff;">${enhancedData.userIPAnonymized || 'Not collected'}</td></tr>
                </table>
              </div>
              ` : `
              <div>
                <h4 style="color: #ff6600; margin: 0 0 8px 0; font-size: 14px;">📊 Analytics Data</h4>
                <p style="color: #ff6600; font-size: 12px; margin: 0;">User chose not to share analytics data</p>
              </div>
              `}
              
              ${enhancedData.performanceConsent ? `
              <div>
                <h4 style="color: #cc99ff; margin: 0 0 8px 0; font-size: 14px;">⚡ Performance Data (Consented)</h4>
                <table style="width: 100%; font-size: 13px;">
                  <tr><td style="color: #cccccc; padding: 2px 0;">Screen:</td><td style="color: #ffffff;">${enhancedData.screenSize || 'Not collected'}</td></tr>
                  <tr><td style="color: #cccccc; padding: 2px 0;">Viewport:</td><td style="color: #ffffff;">${enhancedData.viewportSize || 'Not collected'}</td></tr>
                  <tr><td style="color: #cccccc; padding: 2px 0;">Browser Lang:</td><td style="color: #ffffff;">${enhancedData.browserLanguage || 'Not collected'}</td></tr>
                  <tr><td style="color: #cccccc; padding: 2px 0;">Connection:</td><td style="color: #ffffff;">${enhancedData.connectionType || 'Not collected'}</td></tr>
                  <tr><td style="color: #cccccc; padding: 2px 0;">Touch:</td><td style="color: #ffffff;">${enhancedData.touchSupport === 'true' ? 'Yes' : enhancedData.touchSupport === 'false' ? 'No' : 'Not collected'}</td></tr>
                  <tr><td style="color: #cccccc; padding: 2px 0;">Pixel Ratio:</td><td style="color: #ffffff;">${enhancedData.pixelRatio || 'Not collected'}</td></tr>
                </table>
              </div>
              ` : `
              <div>
                <h4 style="color: #ff6600; margin: 0 0 8px 0; font-size: 14px;">⚡ Performance Data</h4>
                <p style="color: #ff6600; font-size: 12px; margin: 0;">User chose not to share performance data</p>
              </div>
              `}
            </div>
            ` : ''}
            
            <!-- Form analytics only shown if analytics consented -->
            ${enhancedData.analyticsConsent ? `
            
            <div style="margin-top: 15px; padding: 15px; background: #0a0a0a; border-radius: 6px; border-left: 3px solid #ff6600;">
              <h4 style="color: #ff9966; margin: 0 0 8px 0; font-size: 14px;">📊 Form Analytics (Consented)</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
                <div>
                  <span style="color: #cccccc;">Form Time:</span> 
                  <span style="color: #ffffff;">${enhancedData.timeToComplete !== 'unknown' ? Math.round(enhancedData.timeToComplete / 1000) + 's' : 'Not collected'}</span>
                </div>
                <div>
                  <span style="color: #cccccc;">Session:</span> 
                  <span style="color: #ffffff;">${enhancedData.sessionDuration !== 'unknown' ? Math.round(enhancedData.sessionDuration / 1000) + 's' : 'Not collected'}</span>
                </div>
                <div>
                  <span style="color: #cccccc;">Scroll:</span> 
                  <span style="color: #ffffff;">${enhancedData.scrollDepth !== 'unknown' ? enhancedData.scrollDepth + '%' : 'Not collected'}</span>
                </div>
              </div>
            </div>
            ` : `
            <div style="margin-top: 15px; padding: 15px; background: #0a0a0a; border-radius: 6px; border-left: 3px solid #ff6600;">
              <h4 style="color: #ff6600; margin: 0 0 8px 0; font-size: 14px;">📊 Form Analytics</h4>
              <p style="color: #ff6600; font-size: 12px; margin: 0;">User chose not to share analytics data</p>
            </div>
            `}
          </div>
          ` : ''}
          
          <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #333333; text-align: center;">
            <p style="color: #666666; font-size: 13px; margin: 0;">
              Sent via Lucaverse Portfolio • ${new Date(timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    `;
  
    // Privacy-compliant text content
    const text = `
  ${isAccessRequest ? 'LUCAVERSE ACCESS REQUEST' : 'PORTFOLIO CONTACT MESSAGE'}
  ${'='.repeat(50)}
  
  ${isAccessRequest ? 'APPLICANT' : 'CONTACT'}: ${name}
  EMAIL: ${email}
  ${!isAccessRequest && subject ? `SUBJECT: ${subject}\n` : ''}TIME: ${new Date(timestamp).toLocaleString()}
  
  ${isAccessRequest ? 'REASON FOR ACCESS:' : 'MESSAGE:'}
  ${'-'.repeat(20)}
  ${message}
  
  PRIVACY COMPLIANCE:
  ${'-'.repeat(20)}
  Consent Version: ${enhancedData.privacyConsentVersion}
  Analytics Consent: ${enhancedData.analyticsConsent ? 'YES' : 'NO'}
  Performance Consent: ${enhancedData.performanceConsent ? 'YES' : 'NO'}
  Consent Time: ${enhancedData.privacyConsentTimestamp ? new Date(enhancedData.privacyConsentTimestamp).toLocaleString() : 'Not recorded'}
  
  ${enhancedData.analyticsConsent ? `ANALYTICS DATA (CONSENTED):
  ${'-'.repeat(30)}
  Country: ${enhancedData.country || 'Not collected'}
  Region: ${enhancedData.region || 'Not collected'}
  Site Language: ${enhancedData.siteLanguage || 'Not collected'}
  Device Type: ${enhancedData.deviceType || 'Not collected'}
  Referrer: ${enhancedData.referrer || 'Not collected'}
  IP (Anonymized): ${enhancedData.userIPAnonymized || 'Not collected'}
  
  FORM ANALYTICS:
  Form Time: ${enhancedData.timeToComplete !== 'unknown' ? Math.round(enhancedData.timeToComplete / 1000) + 's' : 'Not collected'}
  Session Duration: ${enhancedData.sessionDuration !== 'unknown' ? Math.round(enhancedData.sessionDuration / 1000) + 's' : 'Not collected'}
  Scroll Depth: ${enhancedData.scrollDepth !== 'unknown' ? enhancedData.scrollDepth + '%' : 'Not collected'}
  
  ` : 'ANALYTICS DATA: User chose not to share analytics data\n  '}${enhancedData.performanceConsent ? `PERFORMANCE DATA (CONSENTED):
  ${'-'.repeat(30)}
  Screen Size: ${enhancedData.screenSize || 'Not collected'}
  Viewport: ${enhancedData.viewportSize || 'Not collected'}
  Browser Language: ${enhancedData.browserLanguage || 'Not collected'}
  Connection: ${enhancedData.connectionType || 'Not collected'}
  Touch Support: ${enhancedData.touchSupport === 'true' ? 'Yes' : enhancedData.touchSupport === 'false' ? 'No' : 'Not collected'}
  
  ` : 'PERFORMANCE DATA: User chose not to share performance data\n  '}${'='.repeat(50)}
  Sent via Lucaverse Portfolio Contact System
    `;
  
    return { emailSubject, html, text };
  }
  
  // ✨ NEW: Dynamic success messages
  function getSuccessMessage(formType) {
    return formType === 'access_request'
      ? 'Access request submitted successfully!'
      : 'Message sent successfully!';
  }
  
  // --- CORS helper with credentials support
  function corsHeaders(request) {
    const origin = request.headers.get('Origin');
    const allowedOrigins = [
      'https://lucaverse.com',
      'https://www.lucaverse.com',
      'http://localhost:3000',
      'http://localhost:5155'
    ];
  
    return {
      'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : 'https://lucaverse.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true', // Enable credentials for secure sessions
      'Access-Control-Max-Age': '86400', // 24 hours cache for preflight requests
    };
  }
  
  // --- OPTIONS handler for CORS preflight (unchanged)
  function handleOptions(request) {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    });
  }