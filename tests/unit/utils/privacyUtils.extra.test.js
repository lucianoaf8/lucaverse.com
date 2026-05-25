/**
 * Extra privacyUtils tests to cover missing branches:
 * - line 105: formType || 'contact' (falsy formType)
 * - line 138: referrer ternary (when referrer is set)
 * - lines 160-165: collectPerformanceData internal branches
 * - lines 220-227: _getScrollDepth with scrollable content
 * - lines 240-243: _getDeviceType tablet/mobile/desktop branches
 * - lines 258-259: _getViewportSize fallback branches
 * - line 316: value?.toString() || 'unknown' (when value is null/undefined)
 */

import {
  PrivacyManager,
  DataCollector,
  FormDataBuilder,
} from '../../../src/utils/privacyUtils.js';

// ─── localStorage mock ────────────────────────────────────────────────────
let localStore = {};
const localStorageMock = {
  getItem: jest.fn((key) => localStore[key] ?? null),
  setItem: jest.fn((key, value) => { localStore[key] = String(value); }),
  removeItem: jest.fn((key) => { delete localStore[key]; }),
  clear: jest.fn(() => { localStore = {}; })
};

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
  DataCollector._formStartTime = null;
});

const STORAGE_KEY = 'lucaverse_privacy_consent';
const CONSENT_VERSION = '1.0';

const storeConsent = (prefs) => {
  const consent = {
    version: CONSENT_VERSION,
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

// ─── line 105: formType || 'contact' (falsy formType → uses 'contact') ─────
describe('collectEssentialData — formType || fallback (line 105)', () => {
  it('uses "contact" fallback when formType is null', () => {
    const result = DataCollector.collectEssentialData({}, null);
    expect(result.formType).toBe('contact');
  });

  it('uses "contact" fallback when formType is undefined', () => {
    const result = DataCollector.collectEssentialData({});
    expect(result.formType).toBe('contact');
  });

  it('uses "contact" fallback when formType is empty string', () => {
    const result = DataCollector.collectEssentialData({}, '');
    expect(result.formType).toBe('contact');
  });

  it('uses provided formType when truthy (covers the true branch)', () => {
    const result = DataCollector.collectEssentialData({}, 'access_request');
    expect(result.formType).toBe('access_request');
  });
});

// ─── line 138: referrer ternary ──────────────────────────────────────────
describe('collectAnalyticsData — referrer branch (line 138)', () => {
  it('returns "direct" when document.referrer is empty string', () => {
    // jsdom default: document.referrer = ''
    storeConsent({ analytics: true, performance: false });
    const result = DataCollector.collectAnalyticsData();
    expect(result.referrer).toBe('direct');
  });

  it('returns "external" when document.referrer is set', () => {
    storeConsent({ analytics: true, performance: false });
    // Set referrer via Object.defineProperty
    Object.defineProperty(document, 'referrer', {
      value: 'https://external.com',
      configurable: true,
      writable: true
    });
    const result = DataCollector.collectAnalyticsData();
    expect(result.referrer).toBe('external');
    // Restore
    Object.defineProperty(document, 'referrer', {
      value: '',
      configurable: true,
      writable: true
    });
  });
});

// ─── lines 240-243: _getDeviceType branches ──────────────────────────────
describe('_getDeviceType — tablet/mobile/desktop branches (lines 240-243)', () => {
  const origUserAgent = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: origUserAgent,
      configurable: true,
      writable: true
    });
  });

  it('returns "tablet" for iPad UA', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)',
      configurable: true,
      writable: true
    });
    expect(DataCollector._getDeviceType()).toBe('tablet');
  });

  it('returns "mobile" for iPhone UA (not tablet)', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
      configurable: true,
      writable: true
    });
    expect(DataCollector._getDeviceType()).toBe('mobile');
  });

  it('returns "desktop" for standard desktop UA', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      configurable: true,
      writable: true
    });
    expect(DataCollector._getDeviceType()).toBe('desktop');
  });

  it('returns "mobile" for Android Mobile UA', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 10; Mobile)',
      configurable: true,
      writable: true
    });
    expect(DataCollector._getDeviceType()).toBe('mobile');
  });

  it('uses empty string fallback when navigator.userAgent is undefined (line 240 || branch)', () => {
    Object.defineProperty(navigator, 'userAgent', {
      get() { return undefined; },
      configurable: true
    });
    // With ua='', neither isMobile nor isTablet → desktop
    const result = DataCollector._getDeviceType();
    expect(result).toBe('desktop');
    // Restore
    Object.defineProperty(navigator, 'userAgent', {
      value: origUserAgent,
      configurable: true,
      writable: true
    });
  });
});

// ─── lines 220-227: _getScrollDepth with positive scrollable height ──────
describe('_getScrollDepth — scrollable content branch (lines 220-227)', () => {
  it('returns 0 when document height equals viewport (scrollableHeight = 0)', () => {
    // jsdom defaults: all heights 0, scrollTop 0 → scrollableHeight = 0 → returns 0
    const depth = DataCollector._getScrollDepth();
    expect(depth).toBe(0);
  });

  it('calculates percentage when scrollableHeight > 0', () => {
    // Make document taller than viewport
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 3000, configurable: true });
    Object.defineProperty(document.documentElement, 'clientHeight', { value: 800, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true, writable: true });
    // pageYOffset = 0 → depth = 0%
    Object.defineProperty(window, 'pageYOffset', { value: 0, configurable: true, writable: true });

    const depth = DataCollector._getScrollDepth();
    expect(depth).toBe(0); // scrollTop=0 / scrollable=2200 = 0%

    // Restore
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 0, configurable: true });
    Object.defineProperty(document.documentElement, 'clientHeight', { value: 0, configurable: true });
    Object.defineProperty(window, 'pageYOffset', { value: 0, configurable: true, writable: true });
  });

  it('caps depth at 100 when scrolled past bottom', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(document.documentElement, 'clientHeight', { value: 500, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 500, configurable: true, writable: true });
    // pageYOffset = 9999 → depth would be > 100, capped at 100
    Object.defineProperty(window, 'pageYOffset', { value: 9999, configurable: true, writable: true });

    const depth = DataCollector._getScrollDepth();
    expect(depth).toBe(100);

    // Restore
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 0, configurable: true });
    Object.defineProperty(document.documentElement, 'clientHeight', { value: 0, configurable: true });
    Object.defineProperty(window, 'pageYOffset', { value: 0, configurable: true, writable: true });
  });
});

// ─── lines 258-259: _getViewportSize — both || fallback branches ─────────
describe('_getViewportSize — fallback branches (lines 258-259)', () => {
  it('uses innerWidth/Height when available', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true, writable: true });
    const size = DataCollector._getViewportSize();
    expect(size).toMatch(/^\d+x\d+$/);
  });

  it('falls back to documentElement.clientWidth when innerWidth is 0', () => {
    Object.defineProperty(window, 'innerWidth', { value: 0, configurable: true, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 0, configurable: true, writable: true });
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(document.documentElement, 'clientHeight', { value: 600, configurable: true });
    const size = DataCollector._getViewportSize();
    expect(size).toMatch(/^\d+x\d+$/);
    // Restore
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true, writable: true });
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 0, configurable: true });
    Object.defineProperty(document.documentElement, 'clientHeight', { value: 0, configurable: true });
  });

  it('uses 0 when all viewport sources are 0 (last || 0 branch)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 0, configurable: true, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 0, configurable: true, writable: true });
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 0, configurable: true });
    Object.defineProperty(document.documentElement, 'clientHeight', { value: 0, configurable: true });
    const size = DataCollector._getViewportSize();
    // 0/50 rounded = 0x0
    expect(size).toBe('0x0');
  });
});

// ─── lines 160-165: collectPerformanceData || fallback branches ─────────
describe('collectPerformanceData — fallback branches (lines 160-165)', () => {
  it('uses "unknown" when navigator.language is empty string', () => {
    storeConsent({ analytics: false, performance: true });
    const origLanguage = navigator.language;
    Object.defineProperty(navigator, 'language', {
      value: '',
      configurable: true,
      writable: true
    });

    const result = DataCollector.collectPerformanceData();
    expect(result.browserLanguage).toBe('unknown');

    Object.defineProperty(navigator, 'language', {
      value: origLanguage,
      configurable: true,
      writable: true
    });
  });

  it('uses 1 when window.devicePixelRatio is 0', () => {
    storeConsent({ analytics: false, performance: true });
    const origDPR = window.devicePixelRatio;
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 0,
      configurable: true,
      writable: true
    });

    const result = DataCollector.collectPerformanceData();
    expect(result.pixelRatio).toBe(1);

    Object.defineProperty(window, 'devicePixelRatio', {
      value: origDPR,
      configurable: true,
      writable: true
    });
  });

  it('uses 24 when screen.colorDepth is 0', () => {
    storeConsent({ analytics: false, performance: true });
    const origColorDepth = screen.colorDepth;
    Object.defineProperty(screen, 'colorDepth', {
      value: 0,
      configurable: true,
      writable: true
    });

    const result = DataCollector.collectPerformanceData();
    expect(result.colorDepth).toBe(24);

    Object.defineProperty(screen, 'colorDepth', {
      value: origColorDepth,
      configurable: true,
      writable: true
    });
  });
});

// ─── line 316: value?.toString() || 'unknown' ───────────────────────────
describe('FormDataBuilder.buildFormData — value?.toString() || "unknown" (line 316)', () => {
  it('uses "unknown" when extra data field value is null', () => {
    // To hit line 316 with a null value, we need collectAllowedData to return
    // a field that is not in the skip list and has a null value.
    // The timestamp field is always a string. We can mock _getFormCompletionTime
    // to return null to produce a null-valued field.
    storeConsent({ analytics: true, performance: false });
    const origGetFormCompletionTime = DataCollector._getFormCompletionTime;
    DataCollector._getFormCompletionTime = () => null;

    const fd = FormDataBuilder.buildFormData({ name: 'A', email: 'a@b.com', message: 'Hi', subject: 'S' }, 'contact', Date.now());
    // timeToComplete would be null, so value?.toString() is null?.toString() = undefined, then || 'unknown'
    const timeToComplete = fd.get('timeToComplete');
    expect(timeToComplete).toBe('unknown');

    DataCollector._getFormCompletionTime = origGetFormCompletionTime;
  });

  it('uses value.toString() when value is a number', () => {
    storeConsent({ analytics: true, performance: false });
    const origScrollDepth = DataCollector._getScrollDepth;
    DataCollector._getScrollDepth = () => 42;

    const fd = FormDataBuilder.buildFormData({ name: 'A', email: 'a@b.com', message: 'Hi', subject: 'S' }, 'contact', Date.now());
    const scrollDepth = fd.get('scrollDepth');
    expect(scrollDepth).toBe('42');

    DataCollector._getScrollDepth = origScrollDepth;
  });
});
