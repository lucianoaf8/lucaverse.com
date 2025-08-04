/**
 * Privacy Utilities for Lucaverse Portfolio
 * Implements privacy-by-design data collection with user consent management
 */

const PRIVACY_STORAGE_KEY = 'lucaverse_privacy_consent';
const CONSENT_VERSION = '1.0';

/**
 * Privacy consent management
 */
export const PrivacyManager = {
  /**
   * Get current user consent preferences
   */
  getConsent() {
    try {
      const stored = localStorage.getItem(PRIVACY_STORAGE_KEY);
      if (!stored) return null;
      
      const consent = JSON.parse(stored);
      
      // Check if consent version is current
      if (consent.version !== CONSENT_VERSION) {
        this.clearConsent();
        return null;
      }
      
      return consent;
    } catch (error) {
      console.warn('Failed to read privacy consent:', error);
      return null;
    }
  },

  /**
   * Store user consent preferences
   */
  setConsent(consentPreferences) {
    try {
      const consent = {
        version: CONSENT_VERSION,
        timestamp: new Date().toISOString(),
        preferences: {
          essential: true, // Always true
          analytics: Boolean(consentPreferences.analytics),
          performance: Boolean(consentPreferences.performance)
        }
      };
      
      localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(consent));
      return consent;
    } catch (error) {
      console.error('Failed to store privacy consent:', error);
      return null;
    }
  },

  /**
   * Clear stored consent (user withdrawal or version change)
   */
  clearConsent() {
    try {
      localStorage.removeItem(PRIVACY_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear privacy consent:', error);
    }
  },

  /**
   * Check if specific data collection is allowed
   */
  isAllowed(category) {
    const consent = this.getConsent();
    if (!consent) return false;
    
    // Essential data is always allowed
    if (category === 'essential') return true;
    
    return Boolean(consent.preferences[category]);
  },

  /**
   * Check if user has made any consent decision
   */
  hasConsent() {
    return this.getConsent() !== null;
  }
};

/**
 * Privacy-compliant data collection functions
 */
export const DataCollector = {
  /**
   * Collect essential data only (always allowed)
   */
  collectEssentialData(formData, formType) {
    return {
      // Core form data
      name: formData.name || '',
      email: formData.email || '',
      message: formData.message || '',
      subject: formData.subject || '',
      formType: formType || 'contact',
      
      // Essential technical data for functionality
      timestamp: new Date().toISOString(),
      formTitle: formType === 'access_request' 
        ? 'Access Request from Lucaverse Portfolio'
        : `Contact Message: ${formData.subject || 'General Inquiry'}`
    };
  },

  /**
   * Collect analytics data (requires consent)
   */
  collectAnalyticsData() {
    if (!PrivacyManager.isAllowed('analytics')) {
      return {};
    }

    try {
      return {
        // Basic usage analytics
        siteLanguage: this._getSiteLanguage(),
        country: 'consent-based', // Will be populated server-side if allowed
        
        // Form interaction patterns (anonymized)
        timeToComplete: this._getFormCompletionTime(),
        scrollDepth: this._getScrollDepth(),
        sessionDuration: this._getSessionDuration(),
        
        // Basic device context (not fingerprinting)
        deviceType: this._getDeviceType(),
        
        // Page context
        referrer: document.referrer ? 'external' : 'direct', // Anonymized
        currentUrl: window.location.origin // Domain only, no full path
      };
    } catch (error) {
      console.warn('Analytics data collection failed:', error);
      return {};
    }
  },

  /**
   * Collect performance data (requires consent)
   */
  collectPerformanceData() {
    if (!PrivacyManager.isAllowed('performance')) {
      return {};
    }

    try {
      return {
        // Technical optimization data
        screenSize: this._getScreenSize(),
        viewportSize: this._getViewportSize(),
        browserLanguage: navigator.language || 'unknown',
        connectionType: this._getConnectionType(),
        
        // Performance metrics
        pixelRatio: window.devicePixelRatio || 1,
        colorDepth: screen.colorDepth || 24,
        touchSupport: this._getTouchSupport()
      };
    } catch (error) {
      console.warn('Performance data collection failed:', error);
      return {};
    }
  },

  /**
   * Collect all allowed data based on consent
   */
  collectAllowedData(formData, formType, formStartTime = null) {
    const data = {
      ...this.collectEssentialData(formData, formType)
    };

    // Set form start time for analytics if provided
    if (formStartTime && PrivacyManager.isAllowed('analytics')) {
      this._formStartTime = formStartTime;
    }

    // Add optional data based on consent
    if (PrivacyManager.isAllowed('analytics')) {
      Object.assign(data, this.collectAnalyticsData());
    }

    if (PrivacyManager.isAllowed('performance')) {
      Object.assign(data, this.collectPerformanceData());
    }

    return data;
  },

  // Private helper methods
  _getSiteLanguage() {
    return document.documentElement.lang || 
           localStorage.getItem('i18nextLng') || 
           'en';
  },

  _getFormCompletionTime() {
    return this._formStartTime 
      ? Date.now() - this._formStartTime
      : 0;
  },

  _getScrollDepth() {
    const docHeight = Math.max(
      document.body.scrollHeight || 0,
      document.body.offsetHeight || 0,
      document.documentElement.clientHeight || 0,
      document.documentElement.scrollHeight || 0,
      document.documentElement.offsetHeight || 0
    );
    const windowHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
    const scrollableHeight = Math.max(0, docHeight - windowHeight);
    
    return scrollableHeight > 0 
      ? Math.min(100, Math.max(0, Math.round((scrollTop / scrollableHeight) * 100)))
      : 0;
  },

  _getSessionDuration() {
    // Simple session tracking - in a real app you might use more sophisticated methods
    const sessionStart = sessionStorage.getItem('session_start');
    if (!sessionStart) {
      sessionStorage.setItem('session_start', Date.now().toString());
      return 0;
    }
    return Date.now() - parseInt(sessionStart);
  },

  _getDeviceType() {
    const ua = navigator.userAgent || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);
    return isTablet ? 'tablet' : (isMobile ? 'mobile' : 'desktop');
  },

  _getScreenSize() {
    const width = screen.width || 0;
    const height = screen.height || 0;
    
    // Round to common resolutions to reduce fingerprinting
    const roundedWidth = Math.round(width / 100) * 100;
    const roundedHeight = Math.round(height / 100) * 100;
    
    return `${roundedWidth}x${roundedHeight}`;
  },

  _getViewportSize() {
    const width = window.innerWidth || document.documentElement.clientWidth || 0;
    const height = window.innerHeight || document.documentElement.clientHeight || 0;
    
    // Round to reduce fingerprinting
    const roundedWidth = Math.round(width / 50) * 50;
    const roundedHeight = Math.round(height / 50) * 50;
    
    return `${roundedWidth}x${roundedHeight}`;
  },

  _getConnectionType() {
    if (navigator.connection) {
      return navigator.connection.effectiveType || 'unknown';
    }
    return 'unknown';
  },

  _getTouchSupport() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
};

/**
 * Form data preparation for server submission
 */
export const FormDataBuilder = {
  /**
   * Create privacy-compliant FormData for server submission
   */
  buildFormData(formData, formType, formStartTime = null) {
    const data = new FormData();
    
    // Collect all allowed data
    const collectedData = DataCollector.collectAllowedData(formData, formType, formStartTime);
    
    // Add essential form fields
    data.append('name', collectedData.name);
    data.append('email', collectedData.email);
    data.append('message', collectedData.message);
    data.append('subject', collectedData.subject);
    data.append('formType', collectedData.formType);
    data.append('formTitle', collectedData.formTitle);
    
    // Add honeypot field (always included for security)
    data.append('website', '');
    
    // Add privacy consent information
    const consent = PrivacyManager.getConsent();
    data.append('privacyConsent', JSON.stringify({
      version: consent?.version || 'none',
      analytics: PrivacyManager.isAllowed('analytics'),
      performance: PrivacyManager.isAllowed('performance'),
      timestamp: consent?.timestamp || null
    }));

    // Add optional data based on consent
    Object.entries(collectedData).forEach(([key, value]) => {
      if (!['name', 'email', 'message', 'subject', 'formType', 'formTitle'].includes(key)) {
        data.append(key, value?.toString() || 'unknown');
      }
    });

    return data;
  }
};

/**
 * Privacy compliance helpers
 */
export const PrivacyHelpers = {
  /**
   * Check if user needs to see privacy consent
   */
  needsConsentDecision() {
    return !PrivacyManager.hasConsent();
  },

  /**
   * Get user-friendly consent summary
   */
  getConsentSummary() {
    const consent = PrivacyManager.getConsent();
    if (!consent) return null;

    return {
      analytics: consent.preferences.analytics,
      performance: consent.preferences.performance,
      date: new Date(consent.timestamp).toLocaleDateString(),
      version: consent.version
    };
  },

  /**
   * Anonymize IP address for logging
   */
  anonymizeIP(ip) {
    if (!ip || ip === 'unknown') return 'unknown';
    
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
    
    return 'unknown';
  },

  /**
   * Data subject rights helper
   */
  getDataRightsInfo() {
    return {
      access: 'Request a copy of your personal data',
      rectification: 'Correct inaccurate personal data',
      erasure: 'Request deletion of your personal data',
      portability: 'Receive your data in machine-readable format',
      objection: 'Object to processing based on legitimate interests',
      withdraw: 'Withdraw consent for analytics and performance data',
      contact: 'privacy@lucaverse.com'
    };
  }
};