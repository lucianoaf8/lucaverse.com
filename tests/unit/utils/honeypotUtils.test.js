/**
 * Honeypot Utilities Tests
 * Tests real exports: generateHoneypotFieldName, generateHoneypotFields,
 * validateHoneypotFields, storeHoneypotConfig, getHoneypotConfig,
 * addBotDetectionFields, trackFormInteraction, initializeHoneypot.
 */

import {
  generateHoneypotFieldName,
  generateHoneypotFields,
  validateHoneypotFields,
  storeHoneypotConfig,
  getHoneypotConfig,
  addBotDetectionFields,
  trackFormInteraction,
  initializeHoneypot
} from '../../../src/utils/honeypotUtils.js';

// Use real sessionStorage mock backed by an in-memory store
let sessionStore = {};
const sessionStorageMock = {
  getItem: jest.fn((key) => sessionStore[key] ?? null),
  setItem: jest.fn((key, value) => { sessionStore[key] = String(value); }),
  removeItem: jest.fn((key) => { delete sessionStore[key]; }),
  clear: jest.fn(() => { sessionStore = {}; })
};

beforeAll(() => {
  Object.defineProperty(global, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true
  });
});

beforeEach(() => {
  sessionStore = {};
  jest.clearAllMocks();
});

// ─── generateHoneypotFieldName ─────────────────────────────────────────────

describe('generateHoneypotFieldName', () => {
  const VALID_PREFIXES = ['user', 'contact', 'form', 'customer', 'client', 'account'];
  const VALID_SUFFIXES = ['url', 'site', 'page', 'link', 'address', 'info', 'data'];

  it('returns a non-empty string', () => {
    expect(typeof generateHoneypotFieldName()).toBe('string');
    expect(generateHoneypotFieldName().length).toBeGreaterThan(0);
  });

  it('starts with one of the known prefixes', () => {
    for (let i = 0; i < 20; i++) {
      const name = generateHoneypotFieldName();
      const hasPrefix = VALID_PREFIXES.some(p => name.startsWith(p));
      expect(hasPrefix).toBe(true);
    }
  });

  it('ends with one of the known suffixes', () => {
    for (let i = 0; i < 20; i++) {
      const name = generateHoneypotFieldName();
      const hasSuffix = VALID_SUFFIXES.some(s => name.endsWith(s));
      expect(hasSuffix).toBe(true);
    }
  });

  it('produces varied names (not always identical)', () => {
    const names = new Set(Array.from({ length: 50 }, () => generateHoneypotFieldName()));
    // With 6 prefixes × 7 suffixes × 3 separators = 126 combinations, expect variety
    expect(names.size).toBeGreaterThan(1);
  });

  it('separator is either _, -, or empty string', () => {
    for (let i = 0; i < 30; i++) {
      const name = generateHoneypotFieldName();
      // name = prefix + separator + suffix
      // Check it only contains alphanumeric, underscore, or hyphen
      expect(name).toMatch(/^[a-z_-]+$/);
    }
  });
});

// ─── generateHoneypotFields ────────────────────────────────────────────────

describe('generateHoneypotFields', () => {
  it('returns an array of the requested length', () => {
    const fields = generateHoneypotFields(3);
    expect(Array.isArray(fields)).toBe(true);
    expect(fields).toHaveLength(3);
  });

  it('defaults to 2 fields when no argument given', () => {
    const fields = generateHoneypotFields();
    expect(fields).toHaveLength(2);
  });

  it('generates 0 fields when count is 0', () => {
    expect(generateHoneypotFields(0)).toHaveLength(0);
  });

  it('each field has name, type, placeholder, and style properties', () => {
    const fields = generateHoneypotFields(2);
    fields.forEach(field => {
      expect(field).toHaveProperty('name');
      expect(field).toHaveProperty('type');
      expect(field).toHaveProperty('placeholder');
      expect(field).toHaveProperty('style');
    });
  });

  it('field type is either "text" or "email"', () => {
    const fields = generateHoneypotFields(10);
    fields.forEach(field => {
      expect(['text', 'email']).toContain(field.type);
    });
  });

  it('field names are unique within the set', () => {
    // Run several times to be sure uniqueness enforcement works
    for (let i = 0; i < 5; i++) {
      const fields = generateHoneypotFields(5);
      const names = fields.map(f => f.name);
      const unique = new Set(names);
      expect(unique.size).toBe(names.length);
    }
  });

  it('field style is an object with CSS properties', () => {
    const fields = generateHoneypotFields(2);
    fields.forEach(field => {
      expect(typeof field.style).toBe('object');
      expect(field.style).not.toBeNull();
    });
  });
});

// ─── validateHoneypotFields ────────────────────────────────────────────────

describe('validateHoneypotFields', () => {
  let honeypotFields;

  beforeEach(() => {
    honeypotFields = [
      { name: 'user_url', type: 'text' },
      { name: 'contact_site', type: 'email' }
    ];
  });

  const makeFormData = (overrides = {}) => {
    const fd = new FormData();
    const defaults = {
      name: 'Alice',
      email: 'alice@example.com',
      message: 'Hello world',
      ...overrides
    };
    Object.entries(defaults).forEach(([k, v]) => {
      if (v !== undefined) fd.append(k, v);
    });
    return fd;
  };

  describe('clean human submission', () => {
    it('returns isBot=false for clean data with all human fields', () => {
      const fd = makeFormData();
      const result = validateHoneypotFields(fd, honeypotFields);
      expect(result.isBot).toBe(false);
    });

    it('suspicionScore is 0 for clean data', () => {
      const fd = makeFormData();
      const result = validateHoneypotFields(fd, honeypotFields);
      expect(result.suspicionScore).toBe(0);
    });

    it('indicators array is empty for clean data', () => {
      const fd = makeFormData();
      const result = validateHoneypotFields(fd, honeypotFields);
      expect(result.indicators).toHaveLength(0);
    });

    it('confidence is 0 for clean data', () => {
      const fd = makeFormData();
      const result = validateHoneypotFields(fd, honeypotFields);
      expect(result.confidence).toBe(0);
    });
  });

  describe('honeypot field filled (bot behaviour)', () => {
    it('returns isBot=true when honeypot field has value', () => {
      const fd = makeFormData({ user_url: 'http://spam.com' });
      const result = validateHoneypotFields(fd, honeypotFields);
      expect(result.isBot).toBe(true);
    });

    it('adds 10 to suspicionScore per filled honeypot', () => {
      const fd = makeFormData({ user_url: 'spam', contact_site: 'spam' });
      const result = validateHoneypotFields(fd, honeypotFields);
      expect(result.suspicionScore).toBeGreaterThanOrEqual(20);
    });

    it('adds indicator message per filled honeypot', () => {
      const fd = makeFormData({ user_url: 'bot-fill' });
      const result = validateHoneypotFields(fd, honeypotFields);
      expect(result.indicators.some(i => i.includes('user_url'))).toBe(true);
    });

    it('ignores whitespace-only honeypot values', () => {
      const fd = makeFormData({ user_url: '   ' });
      const result = validateHoneypotFields(fd, honeypotFields);
      // Whitespace-only is treated as empty — should NOT trigger honeypot
      expect(result.indicators.some(i => i.includes('user_url'))).toBe(false);
    });
  });

  describe('fast submission detection', () => {
    it('adds suspicion for submission under 3 seconds', () => {
      const now = Date.now();
      const fd = makeFormData({
        timestamp: (now).toString(),
        formStartTime: (now - 1000).toString() // 1 second — too fast
      });
      const result = validateHoneypotFields(fd, honeypotFields);
      expect(result.indicators.some(i => i.toLowerCase().includes('fast'))).toBe(true);
    });

    it('does not flag submission over 3 seconds', () => {
      const now = Date.now();
      const fd = makeFormData({
        timestamp: (now).toString(),
        formStartTime: (now - 5000).toString()
      });
      const result = validateHoneypotFields(fd, honeypotFields);
      expect(result.indicators.some(i => i.toLowerCase().includes('fast'))).toBe(false);
    });
  });

  describe('multiple rapid submissions', () => {
    it('flags when submissionCount > 3', () => {
      const fd = makeFormData({ submissionCount: '5' });
      const result = validateHoneypotFields(fd, honeypotFields);
      expect(result.indicators.some(i => i.toLowerCase().includes('submission'))).toBe(true);
    });

    it('does not flag submissionCount <= 3', () => {
      const fd = makeFormData({ submissionCount: '2' });
      const result = validateHoneypotFields(fd, honeypotFields);
      expect(result.indicators.some(i => i.toLowerCase().includes('multiple rapid'))).toBe(false);
    });
  });

  describe('missing human-expected fields', () => {
    it('flags missing name field', () => {
      const fd = new FormData();
      fd.append('email', 'test@test.com');
      fd.append('message', 'hello');
      const result = validateHoneypotFields(fd, honeypotFields);
      expect(result.indicators.some(i => i.includes('name'))).toBe(true);
    });

    it('flags missing email field', () => {
      const fd = new FormData();
      fd.append('name', 'Bob');
      fd.append('message', 'hello');
      const result = validateHoneypotFields(fd, honeypotFields);
      expect(result.indicators.some(i => i.includes('email'))).toBe(true);
    });

    it('flags missing message field', () => {
      const fd = new FormData();
      fd.append('name', 'Bob');
      fd.append('email', 'b@b.com');
      const result = validateHoneypotFields(fd, honeypotFields);
      expect(result.indicators.some(i => i.includes('message'))).toBe(true);
    });
  });

  describe('confidence score', () => {
    it('is capped at 1', () => {
      // Fill both honeypots + missing fields + fast submission
      const now = Date.now();
      const fd = new FormData();
      fd.append('user_url', 'spam');
      fd.append('contact_site', 'spam');
      fd.append('timestamp', now.toString());
      fd.append('formStartTime', (now - 500).toString());
      fd.append('submissionCount', '10');
      const result = validateHoneypotFields(fd, honeypotFields);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('is between 0 and 1', () => {
      const fd = makeFormData({ user_url: 'bot' });
      const result = validateHoneypotFields(fd, honeypotFields);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('return shape', () => {
    it('result has isBot, suspicionScore, indicators, confidence', () => {
      const fd = makeFormData();
      const result = validateHoneypotFields(fd, honeypotFields);
      expect(result).toHaveProperty('isBot');
      expect(result).toHaveProperty('suspicionScore');
      expect(result).toHaveProperty('indicators');
      expect(result).toHaveProperty('confidence');
    });
  });
});

// ─── storeHoneypotConfig / getHoneypotConfig ───────────────────────────────

describe('storeHoneypotConfig', () => {
  it('stores config in sessionStorage', () => {
    const fields = [{ name: 'user_url', type: 'text' }];
    storeHoneypotConfig(fields);
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
      'honeypot_config',
      expect.any(String)
    );
  });

  it('stored JSON contains field name and type', () => {
    const fields = [{ name: 'contact_site', type: 'email', placeholder: 'x', style: {} }];
    storeHoneypotConfig(fields);
    const raw = sessionStore['honeypot_config'];
    const parsed = JSON.parse(raw);
    expect(parsed.fields[0].name).toBe('contact_site');
    expect(parsed.fields[0].type).toBe('email');
  });

  it('stored config includes timestamp', () => {
    const fields = [{ name: 'form_link', type: 'text' }];
    storeHoneypotConfig(fields);
    const parsed = JSON.parse(sessionStore['honeypot_config']);
    expect(typeof parsed.timestamp).toBe('number');
  });
});

describe('getHoneypotConfig', () => {
  it('returns null when nothing is stored', () => {
    expect(getHoneypotConfig()).toBeNull();
  });

  it('returns parsed config when valid data is stored', () => {
    const fields = [{ name: 'user_url', type: 'text' }];
    const config = {
      fields: fields.map(f => ({ name: f.name, type: f.type })),
      timestamp: Date.now()
    };
    sessionStore['honeypot_config'] = JSON.stringify(config);
    const result = getHoneypotConfig();
    expect(result).not.toBeNull();
    expect(result.fields[0].name).toBe('user_url');
  });

  it('returns null and removes entry for expired config (> 1 hour old)', () => {
    const fields = [{ name: 'x', type: 'text' }];
    const config = {
      fields,
      timestamp: Date.now() - (2 * 60 * 60 * 1000) // 2 hours ago
    };
    sessionStore['honeypot_config'] = JSON.stringify(config);
    const result = getHoneypotConfig();
    expect(result).toBeNull();
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('honeypot_config');
  });

  it('returns null for malformed JSON', () => {
    sessionStore['honeypot_config'] = 'not-json{{{';
    expect(getHoneypotConfig()).toBeNull();
  });
});

// ─── addBotDetectionFields ─────────────────────────────────────────────────

describe('addBotDetectionFields', () => {
  it('appends timestamp field', () => {
    sessionStore['form_interactions'] = '3';
    sessionStore['submission_count'] = '1';
    const fd = new FormData();
    const startTime = Date.now() - 5000;
    addBotDetectionFields(fd, startTime);
    expect(fd.get('timestamp')).toBeTruthy();
  });

  it('appends formStartTime field matching provided startTime', () => {
    const fd = new FormData();
    const startTime = 1234567890;
    addBotDetectionFields(fd, startTime);
    expect(fd.get('formStartTime')).toBe('1234567890');
  });

  it('appends userAgent field', () => {
    const fd = new FormData();
    addBotDetectionFields(fd, Date.now());
    expect(typeof fd.get('userAgent')).toBe('string');
  });

  it('userAgent is truncated to 100 chars max', () => {
    const fd = new FormData();
    addBotDetectionFields(fd, Date.now());
    const ua = fd.get('userAgent');
    expect(ua.length).toBeLessThanOrEqual(100);
  });

  it('appends submissionCount field', () => {
    const fd = new FormData();
    addBotDetectionFields(fd, Date.now());
    const count = fd.get('submissionCount');
    expect(parseInt(count)).toBeGreaterThanOrEqual(1);
  });

  it('increments submission count in sessionStorage', () => {
    sessionStore['submission_count'] = '2';
    const fd = new FormData();
    addBotDetectionFields(fd, Date.now());
    expect(sessionStore['submission_count']).toBe('3');
  });

  it('returns the same FormData instance', () => {
    const fd = new FormData();
    const result = addBotDetectionFields(fd, Date.now());
    expect(result).toBe(fd);
  });
});

// ─── trackFormInteraction ──────────────────────────────────────────────────

describe('trackFormInteraction', () => {
  it('initializes interaction count to 1 when none exists', () => {
    trackFormInteraction();
    expect(sessionStore['form_interactions']).toBe('1');
  });

  it('increments existing interaction count', () => {
    sessionStore['form_interactions'] = '4';
    trackFormInteraction();
    expect(sessionStore['form_interactions']).toBe('5');
  });

  it('can be called multiple times to accumulate', () => {
    trackFormInteraction();
    trackFormInteraction();
    trackFormInteraction();
    expect(sessionStore['form_interactions']).toBe('3');
  });
});

// ─── initializeHoneypot ────────────────────────────────────────────────────

describe('initializeHoneypot', () => {
  it('returns an object with fields array', () => {
    const hp = initializeHoneypot();
    expect(Array.isArray(hp.fields)).toBe(true);
    expect(hp.fields).toHaveLength(2);
  });

  it('returns an object with trackInteraction function', () => {
    const hp = initializeHoneypot();
    expect(typeof hp.trackInteraction).toBe('function');
  });

  it('returns an object with addDetectionFields function', () => {
    const hp = initializeHoneypot();
    expect(typeof hp.addDetectionFields).toBe('function');
  });

  it('returns an object with validate function', () => {
    const hp = initializeHoneypot();
    expect(typeof hp.validate).toBe('function');
  });

  it('validate function uses the generated fields', () => {
    const hp = initializeHoneypot();
    const fd = new FormData();
    fd.append('name', 'Bob');
    fd.append('email', 'bob@example.com');
    fd.append('message', 'Test message');
    // Fill one of the generated honeypot fields
    fd.append(hp.fields[0].name, 'bot-fill');
    const result = hp.validate(fd);
    expect(result.isBot).toBe(true);
  });

  it('stores honeypot config in session storage', () => {
    initializeHoneypot();
    expect(sessionStore['honeypot_config']).toBeTruthy();
  });
});
