/**
 * Advanced Spam Protection Utility
 * Implements LUCI-008 and LUCI-MED-001 security requirements:
 * - Multiple honeypot fields
 * - Behavioral analysis with user interaction tracking
 * - Enhanced rate limiting with client fingerprinting (LUCI-MED-001)
 * - Dual-layer rate limiting (global + fingerprint-based)
 * - SessionStorage-based tracking for security
 * - Form interaction validation
 * - Time-based submission analysis
 * - Client fingerprinting for enhanced bot detection
 */

import { logger } from './logger.js';
import { recordSecurityEvent, SECURITY_EVENT_TYPES, ALERT_LEVELS } from './securityMonitoring.js';

// Configuration constants
const MIN_FORM_TIME = 3000; // Minimum 3 seconds to fill form (humans need time)
const MAX_FORM_TIME = 1800000; // Maximum 30 minutes (prevent stale sessions)
const SUBMISSION_RATE_LIMIT = 5; // Max 5 submissions per time window
const RATE_LIMIT_WINDOW = 600000; // 10 minute window
const MIN_INTERACTION_EVENTS = 2; // Minimum user interactions expected

/**
 * Honeypot field configurations
 * Multiple fields with different visibility techniques
 */
const HONEYPOT_FIELDS = [
  {
    name: 'website',
    type: 'text',
    style: { display: 'none' },
    attributes: { tabIndex: '-1', autoComplete: 'off' }
  },
  {
    name: 'company',
    type: 'text',
    style: { position: 'absolute', left: '-9999px', top: '-9999px' },
    attributes: { tabIndex: '-1', autoComplete: 'off' }
  },
  {
    name: 'phone',
    type: 'tel',
    style: { opacity: '0', height: '0', width: '0', position: 'absolute' },
    attributes: { tabIndex: '-1', autoComplete: 'off' }
  },
  {
    name: 'fax',
    type: 'text',
    style: { visibility: 'hidden', position: 'absolute' },
    attributes: { tabIndex: '-1', autoComplete: 'off' }
  }
];

/**
 * Enhanced rate limiting with client fingerprinting
 * LUCI-MED-001: Implements robust client-side rate limiting
 */
class RateLimiter {
  constructor() {
    this.storageKey = 'spam_protection_submissions';
    this.fingerprintKey = 'client_fingerprint_submissions';
    this.fallbackStore = new Map();
    this.clientFingerprint = this.generateClientFingerprint();
  }

  /**
   * Generate a client fingerprint for enhanced rate limiting
   */
  generateClientFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Client fingerprint', 2, 2);
    
    const fingerprint = {
      userAgent: navigator.userAgent.substring(0, 100),
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      timezoneOffset: new Date().getTimezoneOffset(),
      canvasFingerprint: canvas.toDataURL().substring(0, 50),
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack || 'unknown'
    };
    
    // Create a hash of the fingerprint
    const fingerprintString = JSON.stringify(fingerprint);
    let hash = 0;
    for (let i = 0; i < fingerprintString.length; i++) {
      const char = fingerprintString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  getStorageItem(key) {
    try {
      // Prefer sessionStorage for enhanced security (LUCI-MED-001)
      return sessionStorage.getItem(key) || this.fallbackStore.get(key);
    } catch (e) {
      logger.warn('Storage access failed, using memory fallback');
      return this.fallbackStore.get(key);
    }
  }

  setStorageItem(key, value) {
    try {
      // Primary storage in sessionStorage (more secure, per-session)
      sessionStorage.setItem(key, value);
      this.fallbackStore.set(key, value);
    } catch (e) {
      logger.warn('Storage write failed, using memory fallback');
      this.fallbackStore.set(key, value);
    }
  }

  getSubmissionHistory() {
    try {
      const stored = this.getStorageItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      logger.warn('Failed to parse submission history:', e);
      return [];
    }
  }

  getFingerprintHistory() {
    try {
      const stored = this.getStorageItem(this.fingerprintKey);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      logger.warn('Failed to parse fingerprint history:', e);
      return {};
    }
  }

  recordSubmission() {
    const now = Date.now();
    
    // Record global submission history
    const history = this.getSubmissionHistory();
    history.push(now);
    
    // Clean old submissions outside the window
    const cutoff = now - RATE_LIMIT_WINDOW;
    const recentSubmissions = history.filter(timestamp => timestamp > cutoff);
    this.setStorageItem(this.storageKey, JSON.stringify(recentSubmissions));
    
    // Record fingerprint-specific history
    const fingerprintHistory = this.getFingerprintHistory();
    if (!fingerprintHistory[this.clientFingerprint]) {
      fingerprintHistory[this.clientFingerprint] = [];
    }
    
    fingerprintHistory[this.clientFingerprint].push(now);
    
    // Clean old fingerprint submissions
    Object.keys(fingerprintHistory).forEach(fp => {
      fingerprintHistory[fp] = fingerprintHistory[fp].filter(timestamp => timestamp > cutoff);
      // Remove empty fingerprint entries
      if (fingerprintHistory[fp].length === 0) {
        delete fingerprintHistory[fp];
      }
    });
    
    this.setStorageItem(this.fingerprintKey, JSON.stringify(fingerprintHistory));
    return recentSubmissions;
  }

  isRateLimited() {
    const now = Date.now();
    const cutoff = now - RATE_LIMIT_WINDOW;
    
    // Check global rate limit
    const recentSubmissions = this.getSubmissionHistory();
    const validSubmissions = recentSubmissions.filter(timestamp => timestamp > cutoff);
    
    if (validSubmissions.length >= SUBMISSION_RATE_LIMIT) {
      return true;
    }
    
    // Check fingerprint-specific rate limit (more restrictive)
    const fingerprintHistory = this.getFingerprintHistory();
    const fingerprintSubmissions = fingerprintHistory[this.clientFingerprint] || [];
    const validFingerprintSubmissions = fingerprintSubmissions.filter(timestamp => timestamp > cutoff);
    
    // Fingerprint gets lower limit (3 vs 5)
    const FINGERPRINT_LIMIT = Math.floor(SUBMISSION_RATE_LIMIT * 0.6);
    return validFingerprintSubmissions.length >= FINGERPRINT_LIMIT;
  }

  getRemainingAttempts() {
    const now = Date.now();
    const cutoff = now - RATE_LIMIT_WINDOW;
    
    // Check global limit
    const recentSubmissions = this.getSubmissionHistory();
    const validSubmissions = recentSubmissions.filter(timestamp => timestamp > cutoff);
    const globalRemaining = Math.max(0, SUBMISSION_RATE_LIMIT - validSubmissions.length);
    
    // Check fingerprint limit
    const fingerprintHistory = this.getFingerprintHistory();
    const fingerprintSubmissions = fingerprintHistory[this.clientFingerprint] || [];
    const validFingerprintSubmissions = fingerprintSubmissions.filter(timestamp => timestamp > cutoff);
    const FINGERPRINT_LIMIT = Math.floor(SUBMISSION_RATE_LIMIT * 0.6);
    const fingerprintRemaining = Math.max(0, FINGERPRINT_LIMIT - validFingerprintSubmissions.length);
    
    // Return the more restrictive limit
    return Math.min(globalRemaining, fingerprintRemaining);
  }

  getNextAvailableTime() {
    const now = Date.now();
    const cutoff = now - RATE_LIMIT_WINDOW;
    
    // Check global submissions
    const recentSubmissions = this.getSubmissionHistory();
    const validSubmissions = recentSubmissions.filter(timestamp => timestamp > cutoff);
    
    let nextGlobalTime = now;
    if (validSubmissions.length >= SUBMISSION_RATE_LIMIT) {
      const oldestInWindow = Math.min(...validSubmissions);
      nextGlobalTime = oldestInWindow + RATE_LIMIT_WINDOW;
    }
    
    // Check fingerprint submissions
    const fingerprintHistory = this.getFingerprintHistory();
    const fingerprintSubmissions = fingerprintHistory[this.clientFingerprint] || [];
    const validFingerprintSubmissions = fingerprintSubmissions.filter(timestamp => timestamp > cutoff);
    const FINGERPRINT_LIMIT = Math.floor(SUBMISSION_RATE_LIMIT * 0.6);
    
    let nextFingerprintTime = now;
    if (validFingerprintSubmissions.length >= FINGERPRINT_LIMIT) {
      const oldestFingerprintInWindow = Math.min(...validFingerprintSubmissions);
      nextFingerprintTime = oldestFingerprintInWindow + RATE_LIMIT_WINDOW;
    }
    
    // Return the later time (more restrictive)
    return Math.max(nextGlobalTime, nextFingerprintTime);
  }

  /**
   * Get detailed rate limiting information for debugging and user feedback
   */
  getRateLimitInfo() {
    const now = Date.now();
    const cutoff = now - RATE_LIMIT_WINDOW;
    
    // Global submissions
    const recentSubmissions = this.getSubmissionHistory();
    const validSubmissions = recentSubmissions.filter(timestamp => timestamp > cutoff);
    
    // Fingerprint submissions
    const fingerprintHistory = this.getFingerprintHistory();
    const fingerprintSubmissions = fingerprintHistory[this.clientFingerprint] || [];
    const validFingerprintSubmissions = fingerprintSubmissions.filter(timestamp => timestamp > cutoff);
    
    const FINGERPRINT_LIMIT = Math.floor(SUBMISSION_RATE_LIMIT * 0.6);
    
    return {
      clientFingerprint: this.clientFingerprint,
      global: {
        current: validSubmissions.length,
        limit: SUBMISSION_RATE_LIMIT,
        remaining: Math.max(0, SUBMISSION_RATE_LIMIT - validSubmissions.length),
        isLimited: validSubmissions.length >= SUBMISSION_RATE_LIMIT
      },
      fingerprint: {
        current: validFingerprintSubmissions.length,
        limit: FINGERPRINT_LIMIT,
        remaining: Math.max(0, FINGERPRINT_LIMIT - validFingerprintSubmissions.length),
        isLimited: validFingerprintSubmissions.length >= FINGERPRINT_LIMIT
      },
      overall: {
        isLimited: this.isRateLimited(),
        remaining: this.getRemainingAttempts(),
        nextAvailable: this.getNextAvailableTime(),
        windowMs: RATE_LIMIT_WINDOW
      }
    };
  }
}

/**
 * Behavioral analysis for form interactions
 */
class BehaviorAnalyzer {
  constructor() {
    this.interactions = [];
    this.mouseEvents = 0;
    this.keyboardEvents = 0;
    this.focusEvents = 0;
    this.scrollEvents = 0;
    this.startTime = Date.now();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Mouse interaction tracking
    const trackMouseEvent = () => {
      this.mouseEvents++;
      this.recordInteraction('mouse', Date.now());
    };

    // Keyboard interaction tracking  
    const trackKeyboardEvent = (e) => {
      this.keyboardEvents++;
      this.recordInteraction('keyboard', Date.now(), {
        key: e.key?.length === 1 ? 'char' : e.key, // Don't log actual characters
        ctrlKey: e.ctrlKey,
        altKey: e.altKey
      });
    };

    // Focus tracking
    const trackFocusEvent = (e) => {
      this.focusEvents++;
      this.recordInteraction('focus', Date.now(), {
        element: e.target?.tagName?.toLowerCase(),
        id: e.target?.id,
        name: e.target?.name
      });
    };

    // Scroll tracking
    const trackScrollEvent = () => {
      this.scrollEvents++;
      if (this.scrollEvents % 5 === 0) { // Throttle scroll events
        this.recordInteraction('scroll', Date.now());
      }
    };

    // Add event listeners
    document.addEventListener('mousemove', trackMouseEvent, { passive: true });
    document.addEventListener('click', trackMouseEvent, { passive: true });
    document.addEventListener('keydown', trackKeyboardEvent, { passive: true });
    document.addEventListener('keyup', trackKeyboardEvent, { passive: true });
    document.addEventListener('focusin', trackFocusEvent, { passive: true });
    document.addEventListener('scroll', trackScrollEvent, { passive: true });

    // Store cleanup function
    this.cleanup = () => {
      document.removeEventListener('mousemove', trackMouseEvent);
      document.removeEventListener('click', trackMouseEvent);
      document.removeEventListener('keydown', trackKeyboardEvent);
      document.removeEventListener('keyup', trackKeyboardEvent);  
      document.removeEventListener('focusin', trackFocusEvent);
      document.removeEventListener('scroll', trackScrollEvent);
    };
  }

  recordInteraction(type, timestamp, data = {}) {
    this.interactions.push({
      type,
      timestamp,
      data,
      sessionTime: timestamp - this.startTime
    });

    // Keep only recent interactions (last 30 seconds)
    const cutoff = timestamp - 30000;
    this.interactions = this.interactions.filter(i => i.timestamp > cutoff);
  }

  getInteractionScore() {
    const totalInteractions = this.mouseEvents + this.keyboardEvents + this.focusEvents;
    const timeSpent = Date.now() - this.startTime;
    
    let score = 0;

    // Base score from total interactions
    score += Math.min(totalInteractions / 10, 10); // Max 10 points

    // Time spent score (reasonable time indicates human)
    if (timeSpent > MIN_FORM_TIME && timeSpent < MAX_FORM_TIME) {
      score += 5;
    }

    // Interaction diversity (humans use mouse, keyboard, etc.)
    const hasMouseActivity = this.mouseEvents > 0;
    const hasKeyboardActivity = this.keyboardEvents > 0; 
    const hasFocusActivity = this.focusEvents > 0;
    
    if (hasMouseActivity) score += 2;
    if (hasKeyboardActivity) score += 2;
    if (hasFocusActivity) score += 1;

    // Natural interaction patterns
    const interactionTypes = new Set(this.interactions.map(i => i.type));
    score += interactionTypes.size; // Diversity bonus

    return Math.min(score, 20); // Max score of 20
  }

  isLikelyHuman() {
    const score = this.getInteractionScore();
    const timeSpent = Date.now() - this.startTime;
    
    // Basic checks
    if (timeSpent < MIN_FORM_TIME) return false; // Too fast
    if (timeSpent > MAX_FORM_TIME) return false; // Too slow
    if (this.interactions.length < MIN_INTERACTION_EVENTS) return false; // Too few interactions
    
    return score >= 8; // Require minimum score of 8/20
  }

  getBehaviorReport() {
    return {
      score: this.getInteractionScore(),
      isLikelyHuman: this.isLikelyHuman(),
      timeSpent: Date.now() - this.startTime,
      interactions: {
        total: this.interactions.length,
        mouse: this.mouseEvents,
        keyboard: this.keyboardEvents,
        focus: this.focusEvents,
        scroll: this.scrollEvents
      },
      interactionTypes: [...new Set(this.interactions.map(i => i.type))]
    };
  }

  destroy() {
    if (this.cleanup) {
      this.cleanup();
    }
  }
}

/**
 * Form validation for spam protection
 */
export class SpamProtection {
  constructor(formStartTime = Date.now()) {
    this.formStartTime = formStartTime;
    this.rateLimiter = new RateLimiter();
    this.behaviorAnalyzer = new BehaviorAnalyzer();
  }

  /**
   * Generate honeypot fields for form
   */
  static getHoneypotFields() {
    return HONEYPOT_FIELDS.map(field => ({
      ...field,
      value: '', // Always empty for honeypots
      required: false
    }));
  }

  /**
   * Validate honeypot fields in form data
   */
  validateHoneypots(formData) {
    const honeypotResults = {};
    
    for (const field of HONEYPOT_FIELDS) {
      const value = formData.get ? formData.get(field.name) : formData[field.name];
      honeypotResults[field.name] = {
        filled: value && value.trim().length > 0,
        value: value ? value.length : 0 // Store length, not actual value
      };
    }

    // Check if any honeypot was filled
    const honeypotFilled = Object.values(honeypotResults).some(result => result.filled);
    
    if (honeypotFilled) {
      logger.security('Honeypot trap triggered', { honeypotResults });
      // LUCI-LOW-004: Record security event
      recordSecurityEvent(SECURITY_EVENT_TYPES.SPAM_ATTEMPT, {
        reason: 'honeypot_filled',
        details: honeypotResults
      }, ALERT_LEVELS.HIGH);
      
      return {
        passed: false,
        reason: 'honeypot_filled',
        details: honeypotResults
      };
    }

    return {
      passed: true,
      details: honeypotResults
    };
  }

  /**
   * Validate form timing
   */
  validateTiming() {
    const submissionTime = Date.now();
    const timeSpent = submissionTime - this.formStartTime;

    if (timeSpent < MIN_FORM_TIME) {
      logger.security('Form submitted too quickly', { timeSpent, minimum: MIN_FORM_TIME });
      return {
        passed: false,
        reason: 'too_fast',
        timeSpent,
        minimum: MIN_FORM_TIME
      };
    }

    if (timeSpent > MAX_FORM_TIME) {
      logger.security('Form submission took too long', { timeSpent, maximum: MAX_FORM_TIME });
      return {
        passed: false,
        reason: 'too_slow',  
        timeSpent,
        maximum: MAX_FORM_TIME
      };
    }

    return {
      passed: true,
      timeSpent
    };
  }

  /**
   * Validate submission rate limits
   * LUCI-MED-001: Enhanced rate limiting with fingerprinting
   */
  validateRateLimit() {
    const rateLimitInfo = this.rateLimiter.getRateLimitInfo();
    
    if (this.rateLimiter.isRateLimited()) {
      const nextAvailable = this.rateLimiter.getNextAvailableTime();
      
      logger.security('Rate limit exceeded', { 
        rateLimitInfo,
        nextAvailable: new Date(nextAvailable).toISOString() 
      });
      
      // LUCI-LOW-004: Record security event
      recordSecurityEvent(SECURITY_EVENT_TYPES.RATE_LIMIT_HIT, {
        rateLimitInfo,
        nextAvailable: nextAvailable,
        clientFingerprint: rateLimitInfo.clientFingerprint.substring(0, 8)
      }, ALERT_LEVELS.MEDIUM);
      
      return {
        passed: false,
        reason: 'rate_limited',
        remaining: rateLimitInfo.overall.remaining,
        nextAvailable,
        retryAfter: Math.ceil((nextAvailable - Date.now()) / 1000),
        details: {
          globalLimited: rateLimitInfo.global.isLimited,
          fingerprintLimited: rateLimitInfo.fingerprint.isLimited,
          clientFingerprint: rateLimitInfo.clientFingerprint.substring(0, 8) + '...' // Partial for logging
        }
      };
    }

    return {
      passed: true,
      remaining: rateLimitInfo.overall.remaining,
      details: {
        globalRemaining: rateLimitInfo.global.remaining,
        fingerprintRemaining: rateLimitInfo.fingerprint.remaining
      }
    };
  }

  /**
   * Validate behavioral patterns
   */
  validateBehavior() {
    const behaviorReport = this.behaviorAnalyzer.getBehaviorReport();
    
    if (!behaviorReport.isLikelyHuman) {
      logger.security('Suspicious behavioral pattern detected', behaviorReport);
      return {
        passed: false,
        reason: 'suspicious_behavior',
        ...behaviorReport
      };
    }

    return {
      passed: true,
      ...behaviorReport
    };
  }

  /**
   * Comprehensive spam validation
   */
  async validateSubmission(formData) {
    const results = {
      passed: true,
      checks: {},
      timestamp: Date.now(),
      formStartTime: this.formStartTime
    };

    // 1. Honeypot validation
    results.checks.honeypot = this.validateHoneypots(formData);
    if (!results.checks.honeypot.passed) {
      results.passed = false;
    }

    // 2. Timing validation
    results.checks.timing = this.validateTiming();
    if (!results.checks.timing.passed) {
      results.passed = false;
    }

    // 3. Rate limiting validation
    results.checks.rateLimit = this.validateRateLimit();
    if (!results.checks.rateLimit.passed) {
      results.passed = false;
    }

    // 4. Behavioral validation
    results.checks.behavior = this.validateBehavior();
    if (!results.checks.behavior.passed) {
      results.passed = false;
    }

    // Record submission attempt (even if failed)
    this.rateLimiter.recordSubmission();

    // Log results
    if (results.passed) {
      logger.info('Spam protection validation passed', {
        timeSpent: results.checks.timing.timeSpent,
        behaviorScore: results.checks.behavior.score
      });
    } else {
      const failedChecks = Object.entries(results.checks)
        .filter(([_, check]) => !check.passed)
        .map(([name, check]) => ({ name, reason: check.reason }));
      
      logger.security('Spam protection validation failed', { failedChecks });
    }

    return results;
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(validationResult, t) {
    if (validationResult.passed) return null;

    const failedCheck = Object.entries(validationResult.checks)
      .find(([_, check]) => !check.passed);

    if (!failedCheck) return t('genericError');

    const [checkType, checkResult] = failedCheck;

    switch (checkType) {
      case 'honeypot':
        return 'Please try again. Make sure to fill out only the visible form fields.';
      
      case 'timing':
        if (checkResult.reason === 'too_fast') {
          return 'Please take a moment to review your information before submitting.';
        } else {
          return 'Your session has expired. Please refresh the page and try again.';
        }
      
      case 'rateLimit':
        const minutes = Math.ceil(checkResult.retryAfter / 60);
        return `Too many submission attempts. Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before trying again.`;
      
      case 'behavior':
        return 'Please interact with the form naturally before submitting.';
      
      default:
        return 'Please try again. If the problem persists, contact support.';
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.behaviorAnalyzer) {
      this.behaviorAnalyzer.destroy();
    }
  }
}

export default SpamProtection;