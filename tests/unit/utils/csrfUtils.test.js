/**
 * CSRF Utilities Tests
 * Tests real behavior of generateCSRFToken, storeCSRFToken, getCSRFToken,
 * getCSRFTokenFromCookie, initializeCSRFProtection, addCSRFTokenToFormData,
 * and serverSideCSRFValidation.
 *
 * csrfUtils.js auto-initializes at module load via the `if (typeof window !== 'undefined')`
 * guard. jsdom provides window, so sessionStorage/document.cookie are used. We mock
 * the global sessionStorage (provided by jest.setup.js) and manage document.cookie carefully.
 */

import {
  generateCSRFToken,
  storeCSRFToken,
  getCSRFToken,
  getCSRFTokenFromCookie,
  initializeCSRFProtection,
  addCSRFTokenToFormData,
  serverSideCSRFValidation
} from '../../../src/utils/csrfUtils.js';

// jest.setup.js mocks sessionStorage globally. We need real mock functions per-test.
// Re-define sessionStorage mock fresh for this suite.
let sessionStorageStore = {};
const sessionStorageMock = {
  getItem: jest.fn((key) => sessionStorageStore[key] ?? null),
  setItem: jest.fn((key, value) => { sessionStorageStore[key] = String(value); }),
  removeItem: jest.fn((key) => { delete sessionStorageStore[key]; }),
  clear: jest.fn(() => { sessionStorageStore = {}; })
};

beforeAll(() => {
  Object.defineProperty(global, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true
  });
});

beforeEach(() => {
  sessionStorageStore = {};
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  // Clear document.cookie for cookie-related tests
  // jsdom allows clearing by setting expired cookies
  const existingCookies = document.cookie;
  existingCookies.split(';').forEach(cookie => {
    const name = cookie.split('=')[0].trim();
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  });
});

describe('generateCSRFToken', () => {
  it('returns a 64-character hex string', () => {
    const token = generateCSRFToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generates different tokens on each call (uniqueness)', () => {
    const tokens = new Set(Array.from({ length: 10 }, () => generateCSRFToken()));
    expect(tokens.size).toBe(10);
  });

  it('uses crypto.getRandomValues (produces 32 random bytes = 64 hex chars)', () => {
    const token = generateCSRFToken();
    expect(token.length).toBe(64);
  });

  it('only contains lowercase hex characters', () => {
    for (let i = 0; i < 5; i++) {
      const token = generateCSRFToken();
      expect(token).toMatch(/^[0-9a-f]+$/);
    }
  });
});

describe('storeCSRFToken', () => {
  it('stores token in sessionStorage under csrf_token key', () => {
    const token = 'a'.repeat(64);
    storeCSRFToken(token);
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith('csrf_token', token);
  });

  it('sets document.cookie containing the csrf_token', () => {
    const token = 'b'.repeat(64);
    storeCSRFToken(token);
    expect(document.cookie).toContain(`csrf_token=${token}`);
  });
});

describe('getCSRFToken', () => {
  it('returns null when no token is stored', () => {
    sessionStorageMock.getItem.mockReturnValueOnce(null);
    expect(getCSRFToken()).toBeNull();
  });

  it('returns stored token from sessionStorage', () => {
    const token = 'c'.repeat(64);
    sessionStorageMock.getItem.mockReturnValueOnce(token);
    expect(getCSRFToken()).toBe(token);
  });

  it('calls sessionStorage.getItem with csrf_token key', () => {
    getCSRFToken();
    expect(sessionStorageMock.getItem).toHaveBeenCalledWith('csrf_token');
  });
});

describe('getCSRFTokenFromCookie', () => {
  it('returns null when no csrf_token cookie is set', () => {
    // No csrf_token cookie set
    expect(getCSRFTokenFromCookie()).toBeNull();
  });

  it('returns the csrf_token value when cookie is present', () => {
    const token = 'd'.repeat(64);
    document.cookie = `csrf_token=${token}; path=/`;
    const result = getCSRFTokenFromCookie();
    expect(result).toBe(token);
  });

  it('handles multiple cookies and finds csrf_token', () => {
    document.cookie = 'other=foo; path=/';
    const token = 'e'.repeat(64);
    document.cookie = `csrf_token=${token}; path=/`;
    expect(getCSRFTokenFromCookie()).toBe(token);
  });
});

describe('initializeCSRFProtection', () => {
  it('generates and returns a new token when none exists', () => {
    // No token in sessionStorage, no cookie
    sessionStorageMock.getItem.mockReturnValue(null);
    const token = initializeCSRFProtection();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns existing token when session and cookie tokens match', () => {
    const token = 'f'.repeat(64);
    // Simulate matching tokens in both stores
    sessionStorageMock.getItem.mockReturnValue(token);
    document.cookie = `csrf_token=${token}; path=/`;
    const result = initializeCSRFProtection();
    expect(result).toBe(token);
  });

  it('generates new token when session token exists but cookie is missing', () => {
    const token = '1'.repeat(64);
    sessionStorageMock.getItem.mockReturnValue(token);
    // No cookie set
    const result = initializeCSRFProtection();
    // Should generate new token (returns a 64-char hex string)
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generates new token when tokens mismatch', () => {
    const sessionToken = 'a'.repeat(64);
    const cookieToken = 'b'.repeat(64);
    sessionStorageMock.getItem.mockReturnValue(sessionToken);
    document.cookie = `csrf_token=${cookieToken}; path=/`;
    const result = initializeCSRFProtection();
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('addCSRFTokenToFormData', () => {
  it('appends csrf_token to FormData when token exists', () => {
    const token = 'a'.repeat(64);
    sessionStorageMock.getItem.mockReturnValue(token);
    const formData = new FormData();
    const result = addCSRFTokenToFormData(formData);
    expect(result.get('csrf_token')).toBe(token);
  });

  it('returns the same FormData instance with token appended', () => {
    const token = 'b'.repeat(64);
    sessionStorageMock.getItem.mockReturnValue(token);
    const formData = new FormData();
    const result = addCSRFTokenToFormData(formData);
    expect(result).toBe(formData);
  });

  it('throws when no CSRF token is found', () => {
    sessionStorageMock.getItem.mockReturnValue(null);
    const formData = new FormData();
    expect(() => addCSRFTokenToFormData(formData)).toThrow(
      'CSRF token not found. Please refresh the page.'
    );
  });

  it('preserves existing FormData fields', () => {
    const token = 'c'.repeat(64);
    sessionStorageMock.getItem.mockReturnValue(token);
    const formData = new FormData();
    formData.append('name', 'Alice');
    addCSRFTokenToFormData(formData);
    expect(formData.get('name')).toBe('Alice');
    expect(formData.get('csrf_token')).toBe(token);
  });
});

describe('serverSideCSRFValidation', () => {
  const validToken = 'a'.repeat(64);

  describe('valid inputs', () => {
    it('returns true for matching, valid tokens', () => {
      expect(serverSideCSRFValidation(validToken, validToken)).toBe(true);
    });
  });

  describe('missing tokens', () => {
    it('returns false when formToken is null', () => {
      expect(serverSideCSRFValidation(null, validToken)).toBe(false);
    });

    it('returns false when cookieToken is null', () => {
      expect(serverSideCSRFValidation(validToken, null)).toBe(false);
    });

    it('returns false when both tokens are null', () => {
      expect(serverSideCSRFValidation(null, null)).toBe(false);
    });

    it('returns false when formToken is empty string', () => {
      expect(serverSideCSRFValidation('', validToken)).toBe(false);
    });

    it('returns false when cookieToken is empty string', () => {
      expect(serverSideCSRFValidation(validToken, '')).toBe(false);
    });
  });

  describe('mismatched tokens', () => {
    it('returns false when tokens differ', () => {
      const other = 'b'.repeat(64);
      expect(serverSideCSRFValidation(validToken, other)).toBe(false);
    });
  });

  describe('invalid format', () => {
    it('returns false for token shorter than 64 chars', () => {
      const short = 'a'.repeat(32);
      expect(serverSideCSRFValidation(short, short)).toBe(false);
    });

    it('returns false for token with non-hex characters', () => {
      const nonHex = 'g'.repeat(64);
      expect(serverSideCSRFValidation(nonHex, nonHex)).toBe(false);
    });

    it('returns false for token longer than 64 chars', () => {
      const long = 'a'.repeat(65);
      expect(serverSideCSRFValidation(long, long)).toBe(false);
    });

    it('returns false for uppercase hex (format expects lowercase)', () => {
      const upper = 'A'.repeat(64);
      expect(serverSideCSRFValidation(upper, upper)).toBe(false);
    });
  });

  describe('boundary values', () => {
    it('accepts exactly 64 lowercase hex chars', () => {
      const token = '0123456789abcdef'.repeat(4);
      expect(serverSideCSRFValidation(token, token)).toBe(true);
    });

    it('rejects 63-character token', () => {
      const token = 'a'.repeat(63);
      expect(serverSideCSRFValidation(token, token)).toBe(false);
    });
  });
});
