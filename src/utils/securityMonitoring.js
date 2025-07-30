/**
 * Security Monitoring and Alerting System
 * LUCI-LOW-004: Implements comprehensive security event monitoring and alerting
 */

import { logger } from './logger.js';

// Security monitoring configuration
const MONITORING_CONFIG = {
  // Alert thresholds
  THRESHOLDS: {
    FAILED_LOGINS_PER_MINUTE: 5,
    CSP_VIOLATIONS_PER_MINUTE: 10,
    SPAM_ATTEMPTS_PER_MINUTE: 3,
    SUSPICIOUS_REQUESTS_PER_MINUTE: 5,
    SESSION_ANOMALIES_PER_HOUR: 10,
    RATE_LIMIT_HITS_PER_MINUTE: 20
  },
  
  // Monitoring intervals
  INTERVALS: {
    SECURITY_CHECK: 60000, // 1 minute
    REPORT_GENERATION: 300000, // 5 minutes
    CLEANUP: 3600000, // 1 hour
    HEALTH_CHECK: 30000 // 30 seconds
  },
  
  // Data retention
  RETENTION: {
    SECURITY_EVENTS: 7 * 24 * 60 * 60 * 1000, // 7 days
    METRICS: 24 * 60 * 60 * 1000, // 24 hours
    ALERTS: 3 * 24 * 60 * 60 * 1000 // 3 days
  },
  
  // Storage keys
  STORAGE_KEYS: {
    SECURITY_EVENTS: 'lucaverse_security_events',
    SECURITY_METRICS: 'lucaverse_security_metrics',
    SECURITY_ALERTS: 'lucaverse_security_alerts',
    MONITORING_STATE: 'lucaverse_monitoring_state'
  },
  
  // Alert endpoint
  ALERT_ENDPOINT: 'https://summer-heart.lucianoaf8.workers.dev/security-alert'
};

/**
 * Security Event Types
 */
export const SECURITY_EVENT_TYPES = {
  AUTHENTICATION_FAILURE: 'auth_failure',
  CSP_VIOLATION: 'csp_violation',
  SPAM_ATTEMPT: 'spam_attempt',
  RATE_LIMIT_HIT: 'rate_limit',
  SUSPICIOUS_REQUEST: 'suspicious_request',
  SESSION_ANOMALY: 'session_anomaly',
  INPUT_VALIDATION_FAILURE: 'input_validation',
  SECURITY_HEADER_TAMPERING: 'header_tampering',
  XSS_ATTEMPT: 'xss_attempt',
  SQL_INJECTION_ATTEMPT: 'sql_injection',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  MALFORMED_REQUEST: 'malformed_request'
};

/**
 * Security Alert Levels
 */
export const ALERT_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Security Monitoring Class
 */
class SecurityMonitor {
  constructor() {
    this.isInitialized = false;
    this.monitoringTimers = new Map();
    this.eventBuffer = [];
    this.metrics = new Map();
    this.alertHistory = [];
    this.isActive = true;
    
    this.initialize();
  }

  /**
   * Initialize security monitoring
   */
  initialize() {
    if (this.isInitialized) return;
    
    try {
      // Load stored data
      this.loadStoredData();
      
      // Start monitoring intervals
      this.startMonitoring();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Register cleanup
      this.setupCleanup();
      
      this.isInitialized = true;
      logger.info('Security monitoring system initialized');
      
      // Record initialization event
      this.recordEvent(SECURITY_EVENT_TYPES.SECURITY_HEADER_TAMPERING, {
        action: 'monitoring_initialized',
        timestamp: Date.now()
      }, ALERT_LEVELS.LOW);
      
    } catch (error) {
      logger.error('Failed to initialize security monitoring:', error);
    }
  }

  /**
   * Load stored monitoring data
   */
  loadStoredData() {
    try {
      // Load security events
      const storedEvents = sessionStorage.getItem(MONITORING_CONFIG.STORAGE_KEYS.SECURITY_EVENTS);
      if (storedEvents) {
        this.eventBuffer = JSON.parse(storedEvents);
      }
      
      // Load metrics
      const storedMetrics = sessionStorage.getItem(MONITORING_CONFIG.STORAGE_KEYS.SECURITY_METRICS);
      if (storedMetrics) {
        const metricsData = JSON.parse(storedMetrics);
        this.metrics = new Map(Object.entries(metricsData));
      }
      
      // Load alert history
      const storedAlerts = sessionStorage.getItem(MONITORING_CONFIG.STORAGE_KEYS.SECURITY_ALERTS);
      if (storedAlerts) {
        this.alertHistory = JSON.parse(storedAlerts);
      }
      
    } catch (error) {
      logger.error('Failed to load stored monitoring data:', error);
    }
  }

  /**
   * Save monitoring data to storage
   */
  saveData() {
    try {
      // Save events (keep only recent ones)
      const cutoff = Date.now() - MONITORING_CONFIG.RETENTION.SECURITY_EVENTS;
      const recentEvents = this.eventBuffer.filter(event => event.timestamp > cutoff);
      sessionStorage.setItem(
        MONITORING_CONFIG.STORAGE_KEYS.SECURITY_EVENTS,
        JSON.stringify(recentEvents.slice(-100)) // Keep last 100 events
      );
      this.eventBuffer = recentEvents;
      
      // Save metrics
      sessionStorage.setItem(
        MONITORING_CONFIG.STORAGE_KEYS.SECURITY_METRICS,
        JSON.stringify(Object.fromEntries(this.metrics))
      );
      
      // Save alerts
      const recentAlerts = this.alertHistory.filter(alert => 
        Date.now() - alert.timestamp < MONITORING_CONFIG.RETENTION.ALERTS
      );
      sessionStorage.setItem(
        MONITORING_CONFIG.STORAGE_KEYS.SECURITY_ALERTS,
        JSON.stringify(recentAlerts.slice(-50)) // Keep last 50 alerts
      );
      this.alertHistory = recentAlerts;
      
    } catch (error) {
      logger.error('Failed to save monitoring data:', error);
    }
  }

  /**
   * Record a security event
   */
  recordEvent(type, data, alertLevel = ALERT_LEVELS.LOW) {
    const event = {
      id: this.generateEventId(),
      type,
      timestamp: Date.now(),
      data: { ...data },
      alertLevel,
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
      sessionId: this.getSessionId()
    };
    
    // Add to buffer
    this.eventBuffer.push(event);
    
    // Update metrics
    this.updateMetrics(type, alertLevel);
    
    // Check for alert conditions
    this.checkAlertConditions(type, event);
    
    // Log the event
    logger.security(`Security event recorded: ${type}`, {
      eventId: event.id,
      alertLevel,
      data: data
    });
    
    // Save data periodically
    if (this.eventBuffer.length % 10 === 0) {
      this.saveData();
    }
    
    return event.id;
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('lucaverse_monitoring_session');
    if (!sessionId) {
      sessionId = this.generateEventId();
      sessionStorage.setItem('lucaverse_monitoring_session', sessionId);
    }
    return sessionId;
  }

  /**
   * Update security metrics
   */
  updateMetrics(eventType, alertLevel) {
    const minute = Math.floor(Date.now() / 60000);
    const hour = Math.floor(Date.now() / 3600000);
    
    // Per-minute metrics
    const minuteKey = `${eventType}_${minute}`;
    this.metrics.set(minuteKey, (this.metrics.get(minuteKey) || 0) + 1);
    
    // Per-hour metrics
    const hourKey = `${eventType}_hour_${hour}`;
    this.metrics.set(hourKey, (this.metrics.get(hourKey) || 0) + 1);
    
    // Alert level metrics
    const alertKey = `${alertLevel}_${minute}`;
    this.metrics.set(alertKey, (this.metrics.get(alertKey) || 0) + 1);
    
    // Clean old metrics
    this.cleanOldMetrics();
  }

  /**
   * Clean old metrics
   */
  cleanOldMetrics() {
    const cutoff = Date.now() - MONITORING_CONFIG.RETENTION.METRICS;
    const cutoffMinute = Math.floor(cutoff / 60000);
    
    for (const [key] of this.metrics) {
      const parts = key.split('_');
      const timestamp = parseInt(parts[parts.length - 1]);
      if (timestamp < cutoffMinute) {
        this.metrics.delete(key);
      }
    }
  }

  /**
   * Check alert conditions
   */
  checkAlertConditions(eventType, event) {
    const currentMinute = Math.floor(Date.now() / 60000);
    const minuteKey = `${eventType}_${currentMinute}`;
    const eventCount = this.metrics.get(minuteKey) || 0;
    
    // Define thresholds for different event types
    const threshold = this.getThreshold(eventType);
    
    if (eventCount >= threshold) {
      this.triggerAlert({
        type: 'threshold_exceeded',
        eventType,
        count: eventCount,
        threshold,
        recentEvent: event,
        alertLevel: this.getAlertLevelForThreshold(eventCount, threshold)
      });
    }
    
    // Check for pattern-based alerts
    this.checkPatternAlerts(eventType, event);
  }

  /**
   * Get threshold for event type
   */
  getThreshold(eventType) {
    const thresholds = {
      [SECURITY_EVENT_TYPES.AUTHENTICATION_FAILURE]: MONITORING_CONFIG.THRESHOLDS.FAILED_LOGINS_PER_MINUTE,
      [SECURITY_EVENT_TYPES.CSP_VIOLATION]: MONITORING_CONFIG.THRESHOLDS.CSP_VIOLATIONS_PER_MINUTE,
      [SECURITY_EVENT_TYPES.SPAM_ATTEMPT]: MONITORING_CONFIG.THRESHOLDS.SPAM_ATTEMPTS_PER_MINUTE,
      [SECURITY_EVENT_TYPES.RATE_LIMIT_HIT]: MONITORING_CONFIG.THRESHOLDS.RATE_LIMIT_HITS_PER_MINUTE,
      [SECURITY_EVENT_TYPES.SUSPICIOUS_REQUEST]: MONITORING_CONFIG.THRESHOLDS.SUSPICIOUS_REQUESTS_PER_MINUTE
    };
    
    return thresholds[eventType] || 5; // Default threshold
  }

  /**
   * Get alert level based on threshold exceedance
   */
  getAlertLevelForThreshold(count, threshold) {
    const ratio = count / threshold;
    
    if (ratio >= 5) return ALERT_LEVELS.CRITICAL;
    if (ratio >= 3) return ALERT_LEVELS.HIGH;
    if (ratio >= 2) return ALERT_LEVELS.MEDIUM;
    return ALERT_LEVELS.LOW;
  }

  /**
   * Check for pattern-based alerts
   */
  checkPatternAlerts(eventType, event) {
    // Check for rapid succession of same event type
    const recentEvents = this.eventBuffer
      .filter(e => e.type === eventType && Date.now() - e.timestamp < 60000)
      .slice(-10);
    
    if (recentEvents.length >= 5) {
      const timeSpan = recentEvents[recentEvents.length - 1].timestamp - recentEvents[0].timestamp;
      if (timeSpan < 30000) { // 30 seconds
        this.triggerAlert({
          type: 'rapid_succession',
          eventType,
          count: recentEvents.length,
          timeSpan,
          alertLevel: ALERT_LEVELS.HIGH
        });
      }
    }
    
    // Check for distributed attacks (multiple session IDs)
    if (eventType === SECURITY_EVENT_TYPES.AUTHENTICATION_FAILURE) {
      const uniqueSessions = new Set(recentEvents.map(e => e.sessionId));
      if (uniqueSessions.size >= 3 && recentEvents.length >= 6) {
        this.triggerAlert({
          type: 'distributed_attack',
          eventType,
          uniqueSessions: uniqueSessions.size,
          totalEvents: recentEvents.length,
          alertLevel: ALERT_LEVELS.CRITICAL
        });
      }
    }
  }

  /**
   * Trigger security alert
   */
  async triggerAlert(alertData) {
    const alert = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      ...alertData
    };
    
    // Add to alert history
    this.alertHistory.push(alert);
    
    // Log the alert
    logger.warn(`Security alert triggered: ${alert.type}`, alert);
    
    // Send alert notification
    try {
      await this.sendAlertNotification(alert);
    } catch (error) {
      logger.error('Failed to send alert notification:', error);
    }
    
    // Save data immediately for critical alerts
    if (alert.alertLevel === ALERT_LEVELS.CRITICAL) {
      this.saveData();
    }
  }

  /**
   * Send alert notification
   */
  async sendAlertNotification(alert) {
    try {
      const response = await fetch(MONITORING_CONFIG.ALERT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          alert,
          context: {
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: Date.now(),
            sessionId: this.getSessionId()
          }
        })
      });
      
      if (response.ok) {
        logger.info('Alert notification sent successfully', { alertId: alert.id });
      } else {
        logger.error('Failed to send alert notification', { 
          status: response.status,
          alertId: alert.id 
        });
      }
    } catch (error) {
      logger.error('Alert notification request failed:', error);
    }
  }

  /**
   * Start monitoring intervals
   */
  startMonitoring() {
    // Security check interval
    this.monitoringTimers.set('security_check', setInterval(() => {
      this.performSecurityCheck();
    }, MONITORING_CONFIG.INTERVALS.SECURITY_CHECK));
    
    // Report generation interval
    this.monitoringTimers.set('report_generation', setInterval(() => {
      this.generateSecurityReport();
    }, MONITORING_CONFIG.INTERVALS.REPORT_GENERATION));
    
    // Cleanup interval
    this.monitoringTimers.set('cleanup', setInterval(() => {
      this.performCleanup();
    }, MONITORING_CONFIG.INTERVALS.CLEANUP));
    
    // Health check interval
    this.monitoringTimers.set('health_check', setInterval(() => {
      this.performHealthCheck();
    }, MONITORING_CONFIG.INTERVALS.HEALTH_CHECK));
  }

  /**
   * Perform periodic security check
   */
  performSecurityCheck() {
    if (!this.isActive) return;
    
    try {
      // Check for header tampering
      this.checkSecurityHeaders();
      
      // Check for DOM manipulation
      this.checkDOMIntegrity();
      
      // Check session integrity
      this.checkSessionIntegrity();
      
      // Save data
      this.saveData();
      
    } catch (error) {
      logger.error('Security check failed:', error);
    }
  }

  /**
   * Check security headers
   */
  checkSecurityHeaders() {
    // This would normally check server-sent headers, but in browser context
    // we can check for client-side header manipulation attempts
    const metaTags = document.querySelectorAll('meta[http-equiv]');
    const expectedHeaders = [
      'Content-Security-Policy',
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy'
    ];
    
    const foundHeaders = Array.from(metaTags).map(tag => 
      tag.getAttribute('http-equiv')
    );
    
    for (const header of expectedHeaders) {
      if (!foundHeaders.includes(header)) {
        this.recordEvent(SECURITY_EVENT_TYPES.SECURITY_HEADER_TAMPERING, {
          missingHeader: header,
          foundHeaders
        }, ALERT_LEVELS.HIGH);
      }
    }
  }

  /**
   * Check DOM integrity
   */
  checkDOMIntegrity() {
    // Check for suspicious script injections
    const scripts = document.querySelectorAll('script');
    let suspiciousScripts = 0;
    
    scripts.forEach(script => {
      if (script.src && !script.src.startsWith(window.location.origin) && 
          !script.integrity && !this.isWhitelistedScript(script.src)) {
        suspiciousScripts++;
      }
    });
    
    if (suspiciousScripts > 0) {
      this.recordEvent(SECURITY_EVENT_TYPES.XSS_ATTEMPT, {
        suspiciousScriptCount: suspiciousScripts,
        totalScripts: scripts.length
      }, ALERT_LEVELS.MEDIUM);
    }
  }

  /**
   * Check if script is whitelisted
   */
  isWhitelistedScript(src) {
    const whitelist = [
      'https://accounts.google.com',
      'https://apis.google.com',
      'https://fonts.googleapis.com',
      'https://cdnjs.cloudflare.com'
    ];
    
    return whitelist.some(domain => src.startsWith(domain));
  }

  /**
   * Check session integrity
   */
  checkSessionIntegrity() {
    const sessionKeys = [
      'lucaverse_last_activity',
      'lucaverse_session_start'
    ];
    
    for (const key of sessionKeys) {
      const value = sessionStorage.getItem(key);
      if (value) {
        try {
          const timestamp = parseInt(value);
          if (isNaN(timestamp) || timestamp > Date.now() || timestamp < Date.now() - (30 * 24 * 60 * 60 * 1000)) {
            this.recordEvent(SECURITY_EVENT_TYPES.SESSION_ANOMALY, {
              anomalyType: 'invalid_timestamp',
              key,
              value: value.substring(0, 20)
            }, ALERT_LEVELS.MEDIUM);
          }
        } catch (error) {
          this.recordEvent(SECURITY_EVENT_TYPES.SESSION_ANOMALY, {
            anomalyType: 'parse_error',
            key,
            error: error.message
          }, ALERT_LEVELS.MEDIUM);
        }
      }
    }
  }

  /**
   * Generate security report
   */
  generateSecurityReport() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const recentEvents = this.eventBuffer.filter(event => 
      now - event.timestamp < oneHour
    );
    
    const report = {
      timestamp: now,
      period: '1 hour',
      summary: {
        totalEvents: recentEvents.length,
        criticalAlerts: recentEvents.filter(e => e.alertLevel === ALERT_LEVELS.CRITICAL).length,
        highAlerts: recentEvents.filter(e => e.alertLevel === ALERT_LEVELS.HIGH).length,
        mediumAlerts: recentEvents.filter(e => e.alertLevel === ALERT_LEVELS.MEDIUM).length,
        lowAlerts: recentEvents.filter(e => e.alertLevel === ALERT_LEVELS.LOW).length
      },
      eventsByType: this.groupEventsByType(recentEvents),
      topThreats: this.getTopThreats(recentEvents)
    };
    
    logger.info('Security report generated', report);
    return report;
  }

  /**
   * Group events by type
   */
  groupEventsByType(events) {
    const grouped = {};
    
    events.forEach(event => {
      if (!grouped[event.type]) {
        grouped[event.type] = 0;
      }
      grouped[event.type]++;
    });
    
    return grouped;
  }

  /**
   * Get top threats
   */
  getTopThreats(events) {
    const threats = this.groupEventsByType(events);
    
    return Object.entries(threats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
  }

  /**
   * Perform cleanup
   */
  performCleanup() {
    this.cleanOldMetrics();
    this.saveData();
    
    // Clean memory
    if (this.eventBuffer.length > 200) {
      this.eventBuffer = this.eventBuffer.slice(-100);
    }
    
    if (this.alertHistory.length > 100) {
      this.alertHistory = this.alertHistory.slice(-50);
    }
  }

  /**
   * Perform health check
   */
  performHealthCheck() {
    const healthStatus = {
      monitoring: this.isActive,
      eventsBuffered: this.eventBuffer.length,
      metricsTracked: this.metrics.size,
      alertsGenerated: this.alertHistory.length,
      timersActive: this.monitoringTimers.size,
      lastCheck: Date.now()
    };
    
    // Check if monitoring is healthy
    if (!this.isActive || this.monitoringTimers.size === 0) {
      this.recordEvent(SECURITY_EVENT_TYPES.SECURITY_HEADER_TAMPERING, {
        healthCheck: 'failed',
        status: healthStatus
      }, ALERT_LEVELS.HIGH);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for unhandled errors that might indicate attacks
    window.addEventListener('error', (event) => {
      this.recordEvent(SECURITY_EVENT_TYPES.SUSPICIOUS_REQUEST, {
        type: 'unhandled_error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }, ALERT_LEVELS.LOW);
    });
    
    // Listen for security policy violations
    window.addEventListener('securitypolicyviolation', (event) => {
      this.recordEvent(SECURITY_EVENT_TYPES.CSP_VIOLATION, {
        documentURI: event.documentURI,
        blockedURI: event.blockedURI,
        violatedDirective: event.violatedDirective,
        originalPolicy: event.originalPolicy
      }, ALERT_LEVELS.MEDIUM);
    });
  }

  /**
   * Setup cleanup on page unload
   */
  setupCleanup() {
    window.addEventListener('beforeunload', () => {
      this.saveData();
      this.stop();
    });
  }

  /**
   * Get current security status
   */
  getSecurityStatus() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const recentEvents = this.eventBuffer.filter(event => 
      now - event.timestamp < oneHour
    );
    
    return {
      isActive: this.isActive,
      totalEvents: this.eventBuffer.length,
      recentEvents: recentEvents.length,
      criticalAlerts: this.alertHistory.filter(alert => 
        alert.alertLevel === ALERT_LEVELS.CRITICAL && 
        now - alert.timestamp < oneHour
      ).length,
      healthStatus: this.isActive && this.monitoringTimers.size > 0 ? 'healthy' : 'degraded',
      lastCheck: this.performHealthCheck,
      uptime: this.isInitialized ? now - this.initTime : 0
    };
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.isActive = false;
    
    // Clear all timers
    for (const [name, timer] of this.monitoringTimers) {
      clearInterval(timer);
    }
    this.monitoringTimers.clear();
    
    // Save final data
    this.saveData();
    
    logger.info('Security monitoring stopped');
  }
}

// Create singleton instance
const securityMonitor = new SecurityMonitor();

/**
 * Public API
 */
export const recordSecurityEvent = (type, data, alertLevel) => {
  return securityMonitor.recordEvent(type, data, alertLevel);
};

export const getSecurityStatus = () => {
  return securityMonitor.getSecurityStatus();
};

export const generateSecurityReport = () => {
  return securityMonitor.generateSecurityReport();
};

export const stopSecurityMonitoring = () => {
  securityMonitor.stop();
};

// Export event types and alert levels for convenience
export { SECURITY_EVENT_TYPES, ALERT_LEVELS };

// Auto-initialize if in browser environment
if (typeof window !== 'undefined' && !window.__SECURITY_MONITOR_INITIALIZED__) {
  window.__SECURITY_MONITOR_INITIALIZED__ = true;
  // Monitor is already initialized in constructor
}

export default securityMonitor;