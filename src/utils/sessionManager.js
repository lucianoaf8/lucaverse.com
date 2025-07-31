/**
 * Session Management Utility
 * LUCI-012: Implements comprehensive session timeout and management
 * LUCI-MED-003: Adds session extension limits and re-authentication requirements
 */

import { logger } from './logger.js';
import { authenticatedFetch, checkAuthStatus, logout } from './auth.js';
import { ENV_CONFIG } from '../config/environment.js';

// Session configuration
const SESSION_CONFIG = {
  // Timeout settings (in milliseconds)
  IDLE_TIMEOUT: 30 * 60 * 1000, // 30 minutes of inactivity
  ABSOLUTE_TIMEOUT: 8 * 60 * 60 * 1000, // 8 hours absolute session limit
  WARNING_TIME: 5 * 60 * 1000, // Show warning 5 minutes before timeout
  TOKEN_REFRESH_INTERVAL: 15 * 60 * 1000, // Refresh token every 15 minutes
  
  // LUCI-MED-003: Session extension limits and re-authentication
  MAX_EXTENSIONS: 3, // Maximum number of extensions allowed
  EXTENSION_DURATION: 30 * 60 * 1000, // 30 minutes per extension
  REAUTH_REQUIRED_AFTER: 4 * 60 * 60 * 1000, // Require re-auth after 4 hours
  
  // Activity tracking
  ACTIVITY_EVENTS: [
    'mousedown', 'mousemove', 'keypress', 'scroll', 
    'touchstart', 'click', 'focus', 'blur'
  ],
  
  // Storage keys
  STORAGE_KEYS: {
    LAST_ACTIVITY: 'lucaverse_last_activity',
    SESSION_START: 'lucaverse_session_start',
    WARNING_SHOWN: 'lucaverse_warning_shown',
    EXTENSION_COUNT: 'lucaverse_extension_count',
    LAST_REAUTH: 'lucaverse_last_reauth'
  }
};

/**
 * Session Manager Class
 */
class SessionManager {
  constructor() {
    this.isInitialized = false;
    this.timeoutWarningTimer = null;
    this.timeoutTimer = null;
    this.refreshTimer = null;
    this.activityListeners = [];
    this.warningCallbacks = [];
    this.timeoutCallbacks = [];
    this.isActive = true;
    
    // Bind methods to preserve context
    this.handleActivity = this.handleActivity.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
  }

  /**
   * Initialize session management
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('Session manager already initialized');
      return;
    }

    try {
      // Check if user is authenticated
      const authStatus = await checkAuthStatus();
      if (!authStatus.authenticated) {
        logger.info('User not authenticated, skipping session management');
        return;
      }

      logger.info('Initializing session management');

      // Set up activity tracking
      this.setupActivityTracking();
      
      // Set up visibility change detection
      this.setupVisibilityTracking();
      
      // Set up beforeunload handler
      this.setupBeforeUnloadHandler();
      
      // Initialize session timestamps
      this.initializeSession();
      
      // Start periodic token refresh
      this.startTokenRefresh();
      
      // Start timeout monitoring
      this.resetTimeouts();
      
      this.isInitialized = true;
      logger.info('Session management initialized successfully', {
        idleTimeout: SESSION_CONFIG.IDLE_TIMEOUT / 1000 / 60 + ' minutes',
        absoluteTimeout: SESSION_CONFIG.ABSOLUTE_TIMEOUT / 1000 / 60 / 60 + ' hours'
      });

    } catch (error) {
      logger.error('Failed to initialize session management:', error);
    }
  }

  /**
   * Set up activity tracking
   */
  setupActivityTracking() {
    SESSION_CONFIG.ACTIVITY_EVENTS.forEach(eventType => {
      const listener = this.handleActivity;
      document.addEventListener(eventType, listener, { passive: true });
      this.activityListeners.push({ eventType, listener });
    });
  }

  /**
   * Set up page visibility tracking
   */
  setupVisibilityTracking() {
    document.addEventListener('visibilitychange', this.handleVisibilityChange, { passive: true });
  }

  /**
   * Set up beforeunload handler
   */
  setupBeforeUnloadHandler() {
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  /**
   * Initialize session timestamps
   */
  initializeSession() {
    const now = Date.now();
    
    // Set session start time if not already set
    if (!sessionStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_START)) {
      sessionStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_START, now.toString());
    }
    
    // Update last activity
    this.updateLastActivity();
  }

  /**
   * Handle user activity
   */
  handleActivity() {
    if (!this.isActive) return;
    
    this.updateLastActivity();
    this.resetTimeouts();
    
    // Clear warning if shown
    const warningShown = sessionStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.WARNING_SHOWN);
    if (warningShown) {
      sessionStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.WARNING_SHOWN);
    }
  }

  /**
   * Handle page visibility change
   */
  handleVisibilityChange() {
    if (document.hidden) {
      // Page is hidden, pause session monitoring
      this.isActive = false;
      logger.info('Page hidden, pausing session monitoring');
    } else {
      // Page is visible, resume session monitoring
      this.isActive = true;
      this.handleActivity(); // Treat visibility change as activity
      logger.info('Page visible, resuming session monitoring');
    }
  }

  /**
   * Handle beforeunload event
   */
  handleBeforeUnload() {
    // Clear session storage on page unload for security
    try {
      sessionStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.LAST_ACTIVITY);
      sessionStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_START);
      sessionStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.WARNING_SHOWN);
      sessionStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.EXTENSION_COUNT);
      sessionStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.LAST_REAUTH);
      logger.info('Session storage cleared on page unload');
    } catch (error) {
      logger.error('Failed to clear session storage on unload:', error);
    }
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity() {
    const now = Date.now();
    sessionStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.LAST_ACTIVITY, now.toString());
  }

  /**
   * Get last activity timestamp
   */
  getLastActivity() {
    const lastActivity = sessionStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.LAST_ACTIVITY);
    return lastActivity ? parseInt(lastActivity, 10) : Date.now();
  }

  /**
   * Get session start timestamp
   */
  getSessionStart() {
    const sessionStart = sessionStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_START);
    return sessionStart ? parseInt(sessionStart, 10) : Date.now();
  }

  /**
   * Check if session has expired
   */
  isSessionExpired() {
    const now = Date.now();
    const lastActivity = this.getLastActivity();
    const sessionStart = this.getSessionStart();
    
    // Check idle timeout
    const idleTime = now - lastActivity;
    if (idleTime > SESSION_CONFIG.IDLE_TIMEOUT) {
      logger.warn('Session expired due to inactivity', {
        idleTime: idleTime / 1000 / 60 + ' minutes'
      });
      return { expired: true, reason: 'idle_timeout', idleTime };
    }
    
    // Check absolute timeout
    const sessionDuration = now - sessionStart;
    if (sessionDuration > SESSION_CONFIG.ABSOLUTE_TIMEOUT) {
      logger.warn('Session expired due to absolute timeout', {
        sessionDuration: sessionDuration / 1000 / 60 / 60 + ' hours'
      });
      return { expired: true, reason: 'absolute_timeout', sessionDuration };
    }
    
    return { expired: false };
  }

  /**
   * Reset timeout timers
   */
  resetTimeouts() {
    // Clear existing timers
    if (this.timeoutWarningTimer) {
      clearTimeout(this.timeoutWarningTimer);
    }
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
    }

    // Set warning timer
    this.timeoutWarningTimer = setTimeout(() => {
      this.showTimeoutWarning();
    }, SESSION_CONFIG.IDLE_TIMEOUT - SESSION_CONFIG.WARNING_TIME);

    // Set timeout timer
    this.timeoutTimer = setTimeout(() => {
      this.handleSessionTimeout();
    }, SESSION_CONFIG.IDLE_TIMEOUT);
  }

  /**
   * Show timeout warning
   */
  showTimeoutWarning() {
    // Prevent multiple warnings
    const warningShown = sessionStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.WARNING_SHOWN);
    if (warningShown) return;

    sessionStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.WARNING_SHOWN, 'true');
    
    logger.warn('Session timeout warning displayed');
    
    // Notify callbacks
    this.warningCallbacks.forEach(callback => {
      try {
        callback({
          type: 'warning',
          timeRemaining: SESSION_CONFIG.WARNING_TIME,
          message: 'Your session will expire in 5 minutes due to inactivity. Please move your mouse or press any key to continue.'
        });
      } catch (error) {
        logger.error('Warning callback error:', error);
      }
    });
  }

  /**
   * Handle session timeout
   */
  async handleSessionTimeout() {
    logger.warn('Session timeout occurred');
    
    // Notify callbacks
    this.timeoutCallbacks.forEach(callback => {
      try {
        callback({
          type: 'timeout',
          reason: 'idle_timeout',
          message: 'Your session has expired due to inactivity. You will be logged out.'
        });
      } catch (error) {
        logger.error('Timeout callback error:', error);
      }
    });
    
    // Perform logout
    await this.logout();
  }

  /**
   * Start periodic token refresh
   */
  startTokenRefresh() {
    this.refreshTimer = setInterval(async () => {
      if (!this.isActive) return;
      
      try {
        const authStatus = await checkAuthStatus();
        if (!authStatus.authenticated) {
          logger.warn('Authentication lost during session, logging out');
          await this.logout();
          return;
        }
        
        // Attempt token refresh
        const response = await authenticatedFetch(
          `${ENV_CONFIG.authWorkerUrl}/auth/refresh`,
          { method: 'POST' }
        );
        
        if (response.ok) {
          logger.info('Token refreshed successfully');
        } else {
          logger.warn('Token refresh failed, session may expire soon');
        }
      } catch (error) {
        logger.error('Token refresh error:', error);
      }
    }, SESSION_CONFIG.TOKEN_REFRESH_INTERVAL);
  }

  /**
   * Extend session with limits and re-authentication (LUCI-MED-003)
   */
  async extendSession() {
    try {
      const now = Date.now();
      const sessionStart = this.getSessionStart();
      const lastReauth = sessionStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.LAST_REAUTH);
      const extensionCount = parseInt(sessionStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.EXTENSION_COUNT) || '0');
      
      // Check if re-authentication is required
      const timeSinceReauth = lastReauth ? now - parseInt(lastReauth) : now - sessionStart;
      const requireReauth = timeSinceReauth > SESSION_CONFIG.REAUTH_REQUIRED_AFTER;
      
      // Check extension limits
      if (extensionCount >= SESSION_CONFIG.MAX_EXTENSIONS) {
        logger.warn('Maximum session extensions reached', { extensionCount, maxExtensions: SESSION_CONFIG.MAX_EXTENSIONS });
        return { 
          success: false, 
          error: 'Maximum extensions reached. Please log in again.',
          requiresReauth: true
        };
      }
      
      if (requireReauth) {
        logger.warn('Re-authentication required for session extension', { 
          timeSinceReauth: timeSinceReauth / 1000 / 60 + ' minutes',
          reAuthThreshold: SESSION_CONFIG.REAUTH_REQUIRED_AFTER / 1000 / 60 + ' minutes'
        });
        return { 
          success: false, 
          error: 'Please verify your identity to continue.',
          requiresReauth: true
        };
      }
      
      // Attempt server-side extension
      const response = await authenticatedFetch(
        `${ENV_CONFIG.authWorkerUrl}/auth/extend`,
        { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            extensionCount: extensionCount + 1,
            timeSinceStart: now - sessionStart,
            extensionDuration: SESSION_CONFIG.EXTENSION_DURATION
          })
        }
      );
      
      if (response.ok) {
        // Update extension tracking
        sessionStorage.setItem(
          SESSION_CONFIG.STORAGE_KEYS.EXTENSION_COUNT, 
          (extensionCount + 1).toString()
        );
        
        this.handleActivity(); // Reset activity tracking
        logger.info('Session extended successfully', { 
          extensionCount: extensionCount + 1,
          remainingExtensions: SESSION_CONFIG.MAX_EXTENSIONS - (extensionCount + 1)
        });
        
        return { 
          success: true,
          extensionCount: extensionCount + 1,
          remainingExtensions: SESSION_CONFIG.MAX_EXTENSIONS - (extensionCount + 1)
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        logger.warn('Session extension failed', errorData);
        return { success: false, error: errorData.message || 'Extension failed' };
      }
    } catch (error) {
      logger.error('Session extension error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Require re-authentication (LUCI-MED-003)
   */
  async requireReauthentication() {
    logger.info('Re-authentication required');
    
    // Notify callbacks about re-auth requirement
    this.warningCallbacks.forEach(callback => {
      try {
        callback({
          type: 'reauth_required',
          message: 'Please verify your identity to continue your session.',
          action: 'redirect_to_login'
        });
      } catch (error) {
        logger.error('Re-auth callback error:', error);
      }
    });
    
    // Redirect to re-authentication after a short delay
    setTimeout(() => {
      window.location.href = '/#login?reauth=true';
    }, 3000);
  }

  /**
   * Record successful re-authentication
   */
  recordReauthentication() {
    const now = Date.now();
    sessionStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.LAST_REAUTH, now.toString());
    // Reset extension count after re-authentication
    sessionStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.EXTENSION_COUNT, '0');
    logger.info('Re-authentication recorded successfully');
  }

  /**
   * Get session status with extension and re-auth information (LUCI-MED-003)
   */
  getSessionStatus() {
    const now = Date.now();
    const lastActivity = this.getLastActivity();
    const sessionStart = this.getSessionStart();
    const lastReauth = sessionStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.LAST_REAUTH);
    const extensionCount = parseInt(sessionStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.EXTENSION_COUNT) || '0');
    const expiration = this.isSessionExpired();
    
    // Calculate re-authentication requirements
    const timeSinceReauth = lastReauth ? now - parseInt(lastReauth) : now - sessionStart;
    const requiresReauth = timeSinceReauth > SESSION_CONFIG.REAUTH_REQUIRED_AFTER;
    const timeUntilReauth = Math.max(0, SESSION_CONFIG.REAUTH_REQUIRED_AFTER - timeSinceReauth);
    
    return {
      isActive: this.isActive,
      isExpired: expiration.expired,
      expirationReason: expiration.reason,
      lastActivity: new Date(lastActivity).toISOString(),
      sessionStart: new Date(sessionStart).toISOString(),
      lastReauth: lastReauth ? new Date(parseInt(lastReauth)).toISOString() : null,
      idleTime: now - lastActivity,
      sessionDuration: now - sessionStart,
      timeUntilIdleTimeout: Math.max(0, SESSION_CONFIG.IDLE_TIMEOUT - (now - lastActivity)),
      timeUntilAbsoluteTimeout: Math.max(0, SESSION_CONFIG.ABSOLUTE_TIMEOUT - (now - sessionStart)),
      
      // LUCI-MED-003: Extension and re-auth status
      extensions: {
        count: extensionCount,
        remaining: Math.max(0, SESSION_CONFIG.MAX_EXTENSIONS - extensionCount),
        maxAllowed: SESSION_CONFIG.MAX_EXTENSIONS
      },
      reauth: {
        required: requiresReauth,
        timeSinceReauth,
        timeUntilRequired: timeUntilReauth,
        thresholdMs: SESSION_CONFIG.REAUTH_REQUIRED_AFTER
      }
    };
  }

  /**
   * Add warning callback
   */
  onWarning(callback) {
    this.warningCallbacks.push(callback);
  }

  /**
   * Add timeout callback
   */
  onTimeout(callback) {
    this.timeoutCallbacks.push(callback);
  }

  /**
   * Logout and cleanup
   */
  async logout() {
    logger.info('Session manager initiating logout');
    
    // Cleanup
    this.cleanup();
    
    // Perform logout
    await logout();
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Clear timers
    if (this.timeoutWarningTimer) {
      clearTimeout(this.timeoutWarningTimer);
      this.timeoutWarningTimer = null;
    }
    
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Remove event listeners
    this.activityListeners.forEach(({ eventType, listener }) => {
      document.removeEventListener(eventType, listener);
    });
    this.activityListeners = [];

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);

    // Clear callbacks
    this.warningCallbacks = [];
    this.timeoutCallbacks = [];

    // Clear session storage
    try {
      sessionStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.LAST_ACTIVITY);
      sessionStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_START);
      sessionStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.WARNING_SHOWN);
      sessionStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.EXTENSION_COUNT);
      sessionStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.LAST_REAUTH);
    } catch (error) {
      logger.error('Failed to clear session storage:', error);
    }

    this.isInitialized = false;
    logger.info('Session manager cleanup completed');
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

// Export session manager instance and utilities
export { sessionManager, SESSION_CONFIG };

export default {
  initialize: () => sessionManager.initialize(),
  getStatus: () => sessionManager.getSessionStatus(),
  extendSession: () => sessionManager.extendSession(),
  requireReauthentication: () => sessionManager.requireReauthentication(),
  recordReauthentication: () => sessionManager.recordReauthentication(),
  onWarning: (callback) => sessionManager.onWarning(callback),
  onTimeout: (callback) => sessionManager.onTimeout(callback),
  cleanup: () => sessionManager.cleanup(),
  logout: () => sessionManager.logout()
};