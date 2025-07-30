/**
 * Content Security Policy (CSP) Violation Reporting
 * LUCI-LOW-002: Implements comprehensive CSP violation monitoring and reporting
 */

import { logger } from './logger.js';

// CSP violation storage and reporting configuration
const CSP_CONFIG = {
  MAX_VIOLATIONS_STORED: 50,
  BATCH_REPORT_SIZE: 10,
  REPORT_INTERVAL_MS: 30000, // 30 seconds
  REPORT_ENDPOINT: 'https://summer-heart.lucianoaf8.workers.dev/csp-report',
  STORAGE_KEY: 'lucaverse_csp_violations',
  
  // Rate limiting for violation reporting
  MAX_REPORTS_PER_MINUTE: 20,
  RATE_LIMIT_STORAGE_KEY: 'lucaverse_csp_rate_limit'
};

/**
 * CSP Violation Reporter Class
 */
class CSPViolationReporter {
  constructor() {
    this.violations = [];
    this.reportTimer = null;
    this.isReporting = false;
    this.rateLimitTracker = new Map();
    
    this.initialize();
  }

  initialize() {
    // Load stored violations
    this.loadStoredViolations();
    
    // Set up violation listener
    this.setupViolationListener();
    
    // Start periodic reporting
    this.startPeriodicReporting();
    
    logger.info('CSP violation reporting initialized');
  }

  /**
   * Load previously stored violations
   */
  loadStoredViolations() {
    try {
      const stored = sessionStorage.getItem(CSP_CONFIG.STORAGE_KEY);
      if (stored) {
        this.violations = JSON.parse(stored);
        logger.info('Loaded stored CSP violations', { count: this.violations.length });
      }
    } catch (error) {
      logger.error('Failed to load stored CSP violations:', error);
      this.violations = [];
    }
  }

  /**
   * Store violations in session storage
   */
  storeViolations() {
    try {
      // Keep only the most recent violations
      const recentViolations = this.violations.slice(-CSP_CONFIG.MAX_VIOLATIONS_STORED);
      sessionStorage.setItem(CSP_CONFIG.STORAGE_KEY, JSON.stringify(recentViolations));
      this.violations = recentViolations;
    } catch (error) {
      logger.error('Failed to store CSP violations:', error);
    }
  }

  /**
   * Set up CSP violation event listener
   */
  setupViolationListener() {
    if (typeof window === 'undefined') return;

    window.addEventListener('securitypolicyviolation', (event) => {
      this.handleViolation(event);
    });

    // Also listen for deprecated CSP reporting
    document.addEventListener('DOMContentLoaded', () => {
      // Check if browser supports SecurityPolicyViolationEvent
      if (!window.SecurityPolicyViolationEvent) {
        logger.warn('Browser does not support SecurityPolicyViolationEvent');
      }
    });
  }

  /**
   * Handle CSP violation event
   */
  handleViolation(event) {
    const violation = this.parseViolationEvent(event);
    
    // Apply rate limiting
    if (!this.shouldReportViolation(violation)) {
      return;
    }

    // Log the violation
    logger.security('CSP violation detected', violation);

    // Store the violation
    this.violations.push(violation);
    this.storeViolations();

    // If we have enough violations, report immediately
    if (this.violations.length >= CSP_CONFIG.BATCH_REPORT_SIZE) {
      this.reportViolations();
    }
  }

  /**
   * Parse CSP violation event into structured data
   */
  parseViolationEvent(event) {
    return {
      timestamp: Date.now(),
      documentURI: event.documentURI || window.location.href,
      blockedURI: event.blockedURI || 'unknown',
      violatedDirective: event.violatedDirective || 'unknown',
      originalPolicy: event.originalPolicy || 'unknown',
      effectiveDirective: event.effectiveDirective || event.violatedDirective || 'unknown',
      sourceFile: event.sourceFile || null,
      lineNumber: event.lineNumber || null,
      columnNumber: event.columnNumber || null,
      statusCode: event.statusCode || null,
      referrer: event.referrer || document.referrer || null,
      userAgent: navigator.userAgent,
      // Additional context
      pageLoadTime: Date.now() - (window.performance?.timing?.navigationStart || Date.now()),
      violationType: this.categorizeViolation(event.violatedDirective, event.blockedURI),
      sessionId: this.getSessionId()
    };
  }

  /**
   * Categorize violation type for better analysis
   */
  categorizeViolation(directive, blockedURI) {
    if (!directive) return 'unknown';

    const directiveLower = directive.toLowerCase();
    
    if (directiveLower.includes('script-src')) {
      if (blockedURI.includes('data:')) return 'inline-script-data';
      if (blockedURI.includes('eval')) return 'eval-script';
      return 'external-script';
    }
    
    if (directiveLower.includes('style-src')) {
      if (blockedURI.includes('data:')) return 'inline-style-data';
      return 'external-style';
    }
    
    if (directiveLower.includes('img-src')) return 'image-source';
    if (directiveLower.includes('connect-src')) return 'xhr-fetch';
    if (directiveLower.includes('frame-src')) return 'frame-source';
    if (directiveLower.includes('object-src')) return 'object-source';
    
    return 'other';
  }

  /**
   * Get or generate session ID for violation tracking
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('lucaverse_violation_session');
    if (!sessionId) {
      sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      sessionStorage.setItem('lucaverse_violation_session', sessionId);
    }
    return sessionId;
  }

  /**
   * Check if violation should be reported (rate limiting)
   */
  shouldReportViolation(violation) {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `${minute}_${violation.violatedDirective}_${violation.blockedURI}`;
    
    const count = this.rateLimitTracker.get(key) || 0;
    if (count >= CSP_CONFIG.MAX_REPORTS_PER_MINUTE) {
      return false;
    }

    this.rateLimitTracker.set(key, count + 1);
    
    // Clean old rate limit entries
    this.cleanRateLimitTracker(minute);
    
    return true;
  }

  /**
   * Clean old rate limit entries
   */
  cleanRateLimitTracker(currentMinute) {
    const cutoff = currentMinute - 5; // Keep last 5 minutes
    
    for (const [key] of this.rateLimitTracker) {
      const keyMinute = parseInt(key.split('_')[0]);
      if (keyMinute < cutoff) {
        this.rateLimitTracker.delete(key);
      }
    }
  }

  /**
   * Start periodic violation reporting
   */
  startPeriodicReporting() {
    this.reportTimer = setInterval(() => {
      if (this.violations.length > 0) {
        this.reportViolations();
      }
    }, CSP_CONFIG.REPORT_INTERVAL_MS);
  }

  /**
   * Report violations to the endpoint
   */
  async reportViolations() {
    if (this.isReporting || this.violations.length === 0) {
      return;
    }

    this.isReporting = true;

    try {
      const violationsToReport = this.violations.splice(0, CSP_CONFIG.BATCH_REPORT_SIZE);
      
      const reportData = {
        violations: violationsToReport,
        reportTime: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer,
        metadata: {
          totalViolations: violationsToReport.length,
          sessionId: this.getSessionId(),
          reportBatch: Math.floor(Date.now() / CSP_CONFIG.REPORT_INTERVAL_MS)
        }
      };

      const response = await fetch(CSP_CONFIG.REPORT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportData),
        // Don't send credentials for CSP reporting
        credentials: 'omit'
      });

      if (response.ok) {
        logger.info('CSP violations reported successfully', {
          count: violationsToReport.length,
          endpoint: CSP_CONFIG.REPORT_ENDPOINT
        });
      } else {
        // Put violations back if reporting failed
        this.violations.unshift(...violationsToReport);
        logger.error('Failed to report CSP violations', {
          status: response.status,
          statusText: response.statusText
        });
      }
    } catch (error) {
      logger.error('CSP violation reporting error:', error);
    } finally {
      this.isReporting = false;
      this.storeViolations();
    }
  }

  /**
   * Get violation statistics
   */
  getViolationStats() {
    const stats = {
      total: this.violations.length,
      byDirective: {},
      byType: {},
      recent: 0
    };

    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    this.violations.forEach(violation => {
      // Count by directive
      const directive = violation.violatedDirective || 'unknown';
      stats.byDirective[directive] = (stats.byDirective[directive] || 0) + 1;

      // Count by type
      const type = violation.violationType || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Count recent violations
      if (violation.timestamp > oneHourAgo) {
        stats.recent++;
      }
    });

    return stats;
  }

  /**
   * Clear all stored violations
   */
  clearViolations() {
    this.violations = [];
    sessionStorage.removeItem(CSP_CONFIG.STORAGE_KEY);
    logger.info('All CSP violations cleared');
  }

  /**
   * Stop violation reporting
   */
  stop() {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
    
    // Report any remaining violations
    if (this.violations.length > 0) {
      this.reportViolations();
    }
    
    logger.info('CSP violation reporting stopped');
  }
}

// Create singleton instance
const cspReporter = new CSPViolationReporter();

/**
 * Public API
 */
export const initializeCSPReporting = () => {
  // Already initialized in constructor
  logger.info('CSP reporting system ready');
  return cspReporter;
};

export const getCSPViolationStats = () => {
  return cspReporter.getViolationStats();
};

export const clearCSPViolations = () => {
  cspReporter.clearViolations();
};

export const stopCSPReporting = () => {
  cspReporter.stop();
};

// Auto-initialize if in browser environment
if (typeof window !== 'undefined' && !window.__CSP_REPORTER_INITIALIZED__) {
  window.__CSP_REPORTER_INITIALIZED__ = true;
  initializeCSPReporting();
}

export default cspReporter;