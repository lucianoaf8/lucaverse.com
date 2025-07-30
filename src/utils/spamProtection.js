/**
 * Advanced Spam Protection Utility
 * Implements LUCI-008 security requirements:
 * - Multiple honeypot fields
 * - Behavioral analysis
 * - Rate limiting with IP tracking
 * - Form interaction validation
 * - Time-based submission analysis
 */

import { logger } from './logger.js';

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
 * Rate limiting storage using sessionStorage with fallback
 */
class RateLimiter {
  constructor() {
    this.storageKey = 'spam_protection_submissions';
    this.fallbackStore = new Map();
  }

  getStorageItem(key) {
    try {
      return sessionStorage.getItem(key) || localStorage.getItem(key);
    } catch (e) {
      logger.warn('Storage access failed, using memory fallback');
      return this.fallbackStore.get(key);
    }
  }

  setStorageItem(key, value) {
    try {
      sessionStorage.setItem(key, value);
      localStorage.setItem(key, value);
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

  recordSubmission() {
    const now = Date.now();
    const history = this.getSubmissionHistory();
    
    // Add current submission
    history.push(now);
    
    // Clean old submissions outside the window
    const cutoff = now - RATE_LIMIT_WINDOW;
    const recentSubmissions = history.filter(timestamp => timestamp > cutoff);
    
    this.setStorageItem(this.storageKey, JSON.stringify(recentSubmissions));
    return recentSubmissions;
  }

  isRateLimited() {
    const recentSubmissions = this.getSubmissionHistory();
    const cutoff = Date.now() - RATE_LIMIT_WINDOW;
    const validSubmissions = recentSubmissions.filter(timestamp => timestamp > cutoff);
    
    return validSubmissions.length >= SUBMISSION_RATE_LIMIT;
  }

  getRemainingAttempts() {
    const recentSubmissions = this.getSubmissionHistory();
    const cutoff = Date.now() - RATE_LIMIT_WINDOW;
    const validSubmissions = recentSubmissions.filter(timestamp => timestamp > cutoff);
    
    return Math.max(0, SUBMISSION_RATE_LIMIT - validSubmissions.length);
  }

  getNextAvailableTime() {
    const recentSubmissions = this.getSubmissionHistory();
    if (recentSubmissions.length < SUBMISSION_RATE_LIMIT) {
      return Date.now();
    }
    
    const oldestInWindow = Math.min(...recentSubmissions);
    return oldestInWindow + RATE_LIMIT_WINDOW;
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
   */
  validateRateLimit() {
    if (this.rateLimiter.isRateLimited()) {
      const remaining = this.rateLimiter.getRemainingAttempts();
      const nextAvailable = this.rateLimiter.getNextAvailableTime();
      
      logger.security('Rate limit exceeded', { 
        remaining, 
        nextAvailable: new Date(nextAvailable).toISOString() 
      });
      
      return {
        passed: false,
        reason: 'rate_limited',
        remaining,
        nextAvailable,
        retryAfter: Math.ceil((nextAvailable - Date.now()) / 1000)
      };
    }

    return {
      passed: true,
      remaining: this.rateLimiter.getRemainingAttempts()
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