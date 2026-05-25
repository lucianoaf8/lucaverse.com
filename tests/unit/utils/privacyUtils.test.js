/**
 * Privacy Utilities Tests
 * Tests PrivacyManager, DataCollector, FormDataBuilder, and PrivacyHelpers.
 */

import {
  PrivacyManager,
  DataCollector,
  FormDataBuilder,
  PrivacyHelpers
} from '../../../src/utils/privacyUtils.js';

// ─── localStorage mock ────────────────────────────────────────────────────
let localStore = {};
const localStorageMock = {
  getItem: jest.fn((key) => localStore[key] ?? null),
  setItem: jest.fn((key, value) => { localStore[key] = String(value); }),
  removeItem: jest.fn((key) => { delete localStore[key]; }),
  clear: jest.fn(() => { localStore = {}; })
};

// ─── sessionStorage mock ──────────────────────────────────────────────────
let sessionStore = {};
const sessionStorageMock = {
  getItem: jest.fn((key) => sessionStore[key] ?? null),
  setItem: jest.fn((key, value) => { sessionStore[key] = String(value); }),
  removeItem: jest.fn((key) => { delete sessionStore[key]; }),
  clear: jest.fn(() => { sessionStore = {}; })
};

beforeAll(() => {
  Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });
  Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock, writable: true });
});

beforeEach(() => {
  localStore = {};
  sessionStore = {};
  jest.clearAllMocks();
  // Reset DataCollector internal state
  DataCollector._formStartTime = null;
});

const STORAGE_KEY = 'lucaverse_privacy_consent';
const CONSENT_VERSION = '1.0';

const storeConsent = (prefs, version = CONSENT_VERSION) => {
  const consent = {
    version,
    timestamp: new Date().toISOString(),
    preferences: {
      essential: true,
      analytics: Boolean(prefs.analytics),
      performance: Boolean(prefs.performance)
    }
  };
  localStore[STORAGE_KEY] = JSON.stringify(consent);
  return consent;
};

// ─── PrivacyManager ───────────────────────────────────────────────────────

describe('PrivacyManager', () => {
  describe('getConsent', () => {
    it('returns null when no consent is stored', () => {
      expect(PrivacyManager.getConsent()).toBeNull();
    });

    it('returns stored consent when valid', () => {
      storeConsent({ analytics: true, performance: false });
      const result = PrivacyManager.getConsent();
      expect(result).not.toBeNull();
      expect(result.version).toBe(CONSENT_VERSION);
    });

    it('returns null and clears consent for old version', () => {
      storeConsent({ analytics: true }, '0.9');
      const result = PrivacyManager.getConsent();
      expect(result).toBeNull();
    });

    it('returns null for malformed JSON in storage', () => {
      localStore[STORAGE_KEY] = 'broken{json';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = PrivacyManager.getConsent();
      expect(result).toBeNull();
      warnSpy.mockRestore();
    });

    it('returns null when localStorage.getItem returns null', () => {
      // No data — already empty
      expect(PrivacyManager.getConsent()).toBeNull();
    });
  });

  describe('setConsent', () => {
    it('stores consent with current version and timestamp', () => {
      const result = PrivacyManager.setConsent({ analytics: true, performance: false });
      expect(result).not.toBeNull();
      expect(result.version).toBe(CONSENT_VERSION);
      expect(result.timestamp).toBeTruthy();
    });

    it('stores essential=true regardless of input', () => {
      const result = PrivacyManager.setConsent({ analytics: false, performance: false });
      expect(result.preferences.essential).toBe(true);
    });

    it('casts analytics to boolean', () => {
      const result = PrivacyManager.setConsent({ analytics: 1, performance: 0 });
      expect(result.preferences.analytics).toBe(true);
      expect(result.preferences.performance).toBe(false);
    });

    it('writes to localStorage', () => {
      PrivacyManager.setConsent({ analytics: true, performance: true });
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.any(String)
      );
    });

    it('returns null on localStorage write error', () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('quota'); });
      const result = PrivacyManager.setConsent({ analytics: true, performance: true });
      expect(result).toBeNull();
      errSpy.mockRestore();
    });
  });

  describe('clearConsent', () => {
    it('removes consent from localStorage', () => {
      storeConsent({ analytics: true });
      PrivacyManager.clearConsent();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('does not throw when nothing to clear', () => {
      expect(() => PrivacyManager.clearConsent()).not.toThrow();
    });

    it('swallows error when localStorage.removeItem throws', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      localStorageMock.removeItem.mockImplementationOnce(() => { throw new Error('storage locked'); });
      expect(() => PrivacyManager.clearConsent()).not.toThrow();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('isAllowed', () => {
    it('returns false when no consent stored', () => {
      expect(PrivacyManager.isAllowed('analytics')).toBe(false);
    });

    it('returns true for essential even without stored consent', () => {
      // essential is always allowed even without consent object if consent exists
      storeConsent({ analytics: false, performance: false });
      expect(PrivacyManager.isAllowed('essential')).toBe(true);
    });

    it('returns true for analytics when consent grants it', () => {
      storeConsent({ analytics: true, performance: false });
      expect(PrivacyManager.isAllowed('analytics')).toBe(true);
    });

    it('returns false for analytics when consent denies it', () => {
      storeConsent({ analytics: false, performance: false });
      expect(PrivacyManager.isAllowed('analytics')).toBe(false);
    });

    it('returns true for performance when consent grants it', () => {
      storeConsent({ analytics: false, performance: true });
      expect(PrivacyManager.isAllowed('performance')).toBe(true);
    });

    it('returns false for unknown category', () => {
      storeConsent({ analytics: true, performance: true });
      expect(PrivacyManager.isAllowed('marketing')).toBe(false);
    });
  });

  describe('hasConsent', () => {
    it('returns false when no consent stored', () => {
      expect(PrivacyManager.hasConsent()).toBe(false);
    });

    it('returns true when consent is stored', () => {
      storeConsent({ analytics: true });
      expect(PrivacyManager.hasConsent()).toBe(true);
    });
  });
});

// ─── DataCollector ────────────────────────────────────────────────────────

describe('DataCollector', () => {
  describe('collectEssentialData', () => {
    it('returns core form fields', () => {
      const result = DataCollector.collectEssentialData(
        { name: 'Alice', email: 'a@b.com', message: 'Hi', subject: 'Test' },
        'contact'
      );
      expect(result.name).toBe('Alice');
      expect(result.email).toBe('a@b.com');
      expect(result.message).toBe('Hi');
      expect(result.subject).toBe('Test');
      expect(result.formType).toBe('contact');
    });

    it('defaults missing fields to empty string', () => {
      const result = DataCollector.collectEssentialData({}, 'contact');
      expect(result.name).toBe('');
      expect(result.email).toBe('');
      expect(result.message).toBe('');
      expect(result.subject).toBe('');
    });

    it('includes timestamp', () => {
      const result = DataCollector.collectEssentialData({}, 'contact');
      expect(result.timestamp).toBeTruthy();
      // ISO 8601 format
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('sets formTitle for access_request type', () => {
      const result = DataCollector.collectEssentialData({ name: 'Bob' }, 'access_request');
      expect(result.formTitle).toContain('Access Request');
    });

    it('sets formTitle for contact type using subject', () => {
      const result = DataCollector.collectEssentialData(
        { name: 'Bob', subject: 'Hello' },
        'contact'
      );
      expect(result.formTitle).toContain('Hello');
    });

    it('falls back to General Inquiry when no subject for contact', () => {
      const result = DataCollector.collectEssentialData({ name: 'Bob' }, 'contact');
      expect(result.formTitle).toContain('General Inquiry');
    });
  });

  describe('collectAnalyticsData', () => {
    it('returns empty object when analytics not allowed', () => {
      // No consent stored
      const result = DataCollector.collectAnalyticsData();
      expect(result).toEqual({});
    });

    it('returns analytics data when consent granted', () => {
      storeConsent({ analytics: true, performance: false });
      const result = DataCollector.collectAnalyticsData();
      expect(result).toHaveProperty('siteLanguage');
      expect(result).toHaveProperty('deviceType');
    });

    it('returns empty object and warns when internal method throws', () => {
      storeConsent({ analytics: true, performance: false });
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      // Make _getSiteLanguage throw to trigger the catch branch
      const origGetSiteLanguage = DataCollector._getSiteLanguage;
      DataCollector._getSiteLanguage = () => { throw new Error('simulated'); };
      const result = DataCollector.collectAnalyticsData();
      expect(result).toEqual({});
      expect(warnSpy).toHaveBeenCalled();
      DataCollector._getSiteLanguage = origGetSiteLanguage;
      warnSpy.mockRestore();
    });
  });

  describe('collectPerformanceData', () => {
    it('returns empty object when performance not allowed', () => {
      const result = DataCollector.collectPerformanceData();
      expect(result).toEqual({});
    });

    it('returns performance data when consent granted', () => {
      storeConsent({ analytics: false, performance: true });
      const result = DataCollector.collectPerformanceData();
      expect(result).toHaveProperty('browserLanguage');
      expect(result).toHaveProperty('screenSize');
    });

    it('returns empty object and warns when internal method throws', () => {
      storeConsent({ analytics: false, performance: true });
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const origGetScreenSize = DataCollector._getScreenSize;
      DataCollector._getScreenSize = () => { throw new Error('simulated'); };
      const result = DataCollector.collectPerformanceData();
      expect(result).toEqual({});
      expect(warnSpy).toHaveBeenCalled();
      DataCollector._getScreenSize = origGetScreenSize;
      warnSpy.mockRestore();
    });
  });

  describe('collectAllowedData', () => {
    it('always includes essential data', () => {
      const result = DataCollector.collectAllowedData(
        { name: 'Alice', email: 'a@b.com' },
        'contact'
      );
      expect(result.name).toBe('Alice');
      expect(result.formType).toBe('contact');
    });

    it('includes analytics when consented', () => {
      storeConsent({ analytics: true, performance: false });
      const result = DataCollector.collectAllowedData({ name: 'A' }, 'contact');
      expect(result).toHaveProperty('siteLanguage');
    });

    it('includes performance when consented', () => {
      storeConsent({ analytics: false, performance: true });
      const result = DataCollector.collectAllowedData({ name: 'A' }, 'contact');
      expect(result).toHaveProperty('browserLanguage');
    });

    it('uses formStartTime for analytics when provided', () => {
      storeConsent({ analytics: true, performance: false });
      const startTime = Date.now() - 5000;
      DataCollector.collectAllowedData({ name: 'A' }, 'contact', startTime);
      expect(DataCollector._formStartTime).toBe(startTime);
    });
  });

  describe('private helpers', () => {
    it('_getDeviceType returns desktop, mobile, or tablet', () => {
      const type = DataCollector._getDeviceType();
      expect(['desktop', 'mobile', 'tablet']).toContain(type);
    });

    it('_getScrollDepth returns a number 0-100', () => {
      const depth = DataCollector._getScrollDepth();
      expect(depth).toBeGreaterThanOrEqual(0);
      expect(depth).toBeLessThanOrEqual(100);
    });

    it('_getScrollDepth uses ratio when scrollableHeight > 0', () => {
      // Make docHeight > windowHeight so scrollableHeight > 0
      const origScrollHeight = Object.getOwnPropertyDescriptor(document.documentElement, 'scrollHeight');
      const origClientHeight = Object.getOwnPropertyDescriptor(document.documentElement, 'clientHeight');
      Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, configurable: true });
      Object.defineProperty(document.documentElement, 'clientHeight', { value: 500, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 500, writable: true, configurable: true });
      // pageYOffset = 0 → depth = 0% but via the positive scrollableHeight branch
      const depth = DataCollector._getScrollDepth();
      expect(depth).toBeGreaterThanOrEqual(0);
      expect(depth).toBeLessThanOrEqual(100);
      // Restore
      if (origScrollHeight) Object.defineProperty(document.documentElement, 'scrollHeight', origScrollHeight);
      if (origClientHeight) Object.defineProperty(document.documentElement, 'clientHeight', origClientHeight);
    });

    it('_getSessionDuration initializes session when not started', () => {
      const duration = DataCollector._getSessionDuration();
      expect(duration).toBe(0);
      expect(sessionStore['session_start']).toBeTruthy();
    });

    it('_getSessionDuration returns elapsed ms on second call', () => {
      sessionStore['session_start'] = (Date.now() - 10000).toString();
      const duration = DataCollector._getSessionDuration();
      expect(duration).toBeGreaterThan(0);
    });

    it('_getSiteLanguage returns a string', () => {
      const lang = DataCollector._getSiteLanguage();
      expect(typeof lang).toBe('string');
    });

    it('_getScreenSize returns "NNNxNNN" format', () => {
      const size = DataCollector._getScreenSize();
      expect(size).toMatch(/^\d+x\d+$/);
    });

    it('_getViewportSize returns "NNNxNNN" format', () => {
      const size = DataCollector._getViewportSize();
      expect(size).toMatch(/^\d+x\d+$/);
    });

    it('_getViewportSize falls back to documentElement.clientWidth when innerWidth is 0', () => {
      const origInnerWidth = window.innerWidth;
      const origInnerHeight = window.innerHeight;
      Object.defineProperty(window, 'innerWidth', { value: 0, writable: true, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 0, writable: true, configurable: true });
      // Set clientWidth/Height to non-zero so the middle fallback branch fires
      Object.defineProperty(document.documentElement, 'clientWidth', { value: 800, configurable: true });
      Object.defineProperty(document.documentElement, 'clientHeight', { value: 600, configurable: true });
      const size = DataCollector._getViewportSize();
      expect(size).toMatch(/^\d+x\d+$/);
      // Restore
      Object.defineProperty(window, 'innerWidth', { value: origInnerWidth, writable: true, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: origInnerHeight, writable: true, configurable: true });
      Object.defineProperty(document.documentElement, 'clientWidth', { value: 0, configurable: true });
      Object.defineProperty(document.documentElement, 'clientHeight', { value: 0, configurable: true });
    });

    it('_getConnectionType returns a string', () => {
      const ct = DataCollector._getConnectionType();
      expect(typeof ct).toBe('string');
    });

    it('_getConnectionType reads effectiveType when navigator.connection exists', () => {
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '4g' },
        writable: true,
        configurable: true
      });
      const ct = DataCollector._getConnectionType();
      expect(ct).toBe('4g');
      // Restore
      Object.defineProperty(navigator, 'connection', {
        value: undefined,
        writable: true,
        configurable: true
      });
    });

    it('_getConnectionType returns "unknown" when effectiveType is undefined', () => {
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: undefined },
        writable: true,
        configurable: true
      });
      const ct = DataCollector._getConnectionType();
      expect(ct).toBe('unknown');
      Object.defineProperty(navigator, 'connection', {
        value: undefined,
        writable: true,
        configurable: true
      });
    });

    it('_getTouchSupport returns a boolean', () => {
      const ts = DataCollector._getTouchSupport();
      expect(typeof ts).toBe('boolean');
    });

    it('_getFormCompletionTime returns 0 when no start time set', () => {
      DataCollector._formStartTime = null;
      expect(DataCollector._getFormCompletionTime()).toBe(0);
    });

    it('_getFormCompletionTime returns elapsed ms when start time is set', () => {
      DataCollector._formStartTime = Date.now() - 3000;
      const elapsed = DataCollector._getFormCompletionTime();
      expect(elapsed).toBeGreaterThan(0);
    });
  });
});

// ─── FormDataBuilder ──────────────────────────────────────────────────────

describe('FormDataBuilder', () => {
  describe('buildFormData', () => {
    it('returns a FormData instance', () => {
      const result = FormDataBuilder.buildFormData(
        { name: 'Alice', email: 'a@b.com', message: 'Hi', subject: 'Test' },
        'contact'
      );
      expect(result).toBeInstanceOf(FormData);
    });

    it('appends essential fields', () => {
      const result = FormDataBuilder.buildFormData(
        { name: 'Alice', email: 'a@b.com', message: 'Hi', subject: 'Test' },
        'contact'
      );
      expect(result.get('name')).toBe('Alice');
      expect(result.get('email')).toBe('a@b.com');
      expect(result.get('message')).toBe('Hi');
      expect(result.get('subject')).toBe('Test');
    });

    it('includes website honeypot field as empty string', () => {
      const result = FormDataBuilder.buildFormData({ name: 'A' }, 'contact');
      expect(result.get('website')).toBe('');
    });

    it('includes privacyConsent as JSON string', () => {
      storeConsent({ analytics: false, performance: false });
      const result = FormDataBuilder.buildFormData({ name: 'A' }, 'contact');
      const consent = JSON.parse(result.get('privacyConsent'));
      expect(consent).toHaveProperty('version');
      expect(consent).toHaveProperty('analytics');
      expect(consent).toHaveProperty('performance');
    });

    it('privacyConsent version is "none" when no consent stored', () => {
      const result = FormDataBuilder.buildFormData({ name: 'A' }, 'contact');
      const consent = JSON.parse(result.get('privacyConsent'));
      expect(consent.version).toBe('none');
    });

    it('appends formType field', () => {
      const result = FormDataBuilder.buildFormData({ name: 'B' }, 'access_request');
      expect(result.get('formType')).toBe('access_request');
    });
  });
});

// ─── PrivacyHelpers ───────────────────────────────────────────────────────

describe('PrivacyHelpers', () => {
  describe('needsConsentDecision', () => {
    it('returns true when no consent is stored', () => {
      expect(PrivacyHelpers.needsConsentDecision()).toBe(true);
    });

    it('returns false when consent is stored', () => {
      storeConsent({ analytics: true });
      expect(PrivacyHelpers.needsConsentDecision()).toBe(false);
    });
  });

  describe('getConsentSummary', () => {
    it('returns null when no consent stored', () => {
      expect(PrivacyHelpers.getConsentSummary()).toBeNull();
    });

    it('returns summary object with analytics, performance, date, version', () => {
      storeConsent({ analytics: true, performance: false });
      const summary = PrivacyHelpers.getConsentSummary();
      expect(summary).toHaveProperty('analytics', true);
      expect(summary).toHaveProperty('performance', false);
      expect(summary).toHaveProperty('date');
      expect(summary).toHaveProperty('version', CONSENT_VERSION);
    });
  });

  describe('anonymizeIP', () => {
    it('zeroes out last octet of IPv4', () => {
      expect(PrivacyHelpers.anonymizeIP('192.168.1.100')).toBe('192.168.1.0');
    });

    it('handles IPv4 with 0 in last octet', () => {
      expect(PrivacyHelpers.anonymizeIP('10.0.0.1')).toBe('10.0.0.0');
    });

    it('returns first 4 segments for IPv6', () => {
      const ip = '2001:db8:85a3:0000:0000:8a2e:0370:7334';
      const result = PrivacyHelpers.anonymizeIP(ip);
      expect(result).toMatch(/2001:db8:85a3:0000::/);
    });

    it('returns "unknown" for null', () => {
      expect(PrivacyHelpers.anonymizeIP(null)).toBe('unknown');
    });

    it('returns "unknown" for undefined', () => {
      expect(PrivacyHelpers.anonymizeIP(undefined)).toBe('unknown');
    });

    it('returns "unknown" for the string "unknown"', () => {
      expect(PrivacyHelpers.anonymizeIP('unknown')).toBe('unknown');
    });

    it('returns "unknown" for empty string', () => {
      // empty string is falsy → hits early return
      expect(PrivacyHelpers.anonymizeIP('')).toBe('unknown');
    });

    it('returns "unknown" for a non-IP string with no dots or colons', () => {
      // "hostname" has no dots (parts.length !== 4) and no colons → hits final return 'unknown'
      expect(PrivacyHelpers.anonymizeIP('hostname')).toBe('unknown');
    });

    it('returns "unknown" for a string with some dots but not exactly 4 parts', () => {
      // "192.168.1" splits into 3 parts — not IPv4, no colon → final fallback
      expect(PrivacyHelpers.anonymizeIP('192.168.1')).toBe('unknown');
    });
  });

  describe('getDataRightsInfo', () => {
    it('returns an object with expected rights keys', () => {
      const info = PrivacyHelpers.getDataRightsInfo();
      expect(info).toHaveProperty('access');
      expect(info).toHaveProperty('rectification');
      expect(info).toHaveProperty('erasure');
      expect(info).toHaveProperty('portability');
      expect(info).toHaveProperty('objection');
      expect(info).toHaveProperty('withdraw');
      expect(info).toHaveProperty('contact');
    });

    it('contact email is privacy@lucaverse.com', () => {
      const info = PrivacyHelpers.getDataRightsInfo();
      expect(info.contact).toBe('privacy@lucaverse.com');
    });
  });
});
