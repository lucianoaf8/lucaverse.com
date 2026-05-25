/**
 * Extra SecurityUtils Tests
 * Covers gaps in: urlEncode, sanitizeInput (minLength branch, url type),
 * sanitizeOAuthUserData (lines 247-292).
 */

jest.mock('../../../src/utils/logger.js', () => ({
  securityLogger: {
    security: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  },
  logger: {
    security: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  },
  authLogger: {
    security: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  },
  createLogger: jest.fn(() => ({
    security: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  })),
}));

jest.mock('../../../src/config/api.js', () => ({
  validateEndpoint: jest.fn(() => true),
  API_CONFIG: { isDevelopment: false },
  logConfig: jest.fn(),
  testEnvVars: jest.fn()
}));

import {
  urlEncode,
  sanitizeInput,
  sanitizeOAuthUserData
} from '../../../src/utils/securityUtils.js';

// ─── urlEncode ─────────────────────────────────────────────────────────────

describe('urlEncode', () => {
  it('returns empty string for non-string input', () => {
    expect(urlEncode(null)).toBe('');
    expect(urlEncode(undefined)).toBe('');
    expect(urlEncode(42)).toBe('');
    expect(urlEncode({})).toBe('');
  });

  it('encodes a plain string with no special chars', () => {
    expect(urlEncode('hello')).toBe('hello');
  });

  it('encodes spaces to %20', () => {
    expect(urlEncode('hello world')).toBe('hello%20world');
  });

  it('encodes special URL characters', () => {
    const result = urlEncode('a=1&b=2');
    expect(result).toContain('%');
  });

  it('encodes @ symbol', () => {
    expect(urlEncode('user@example.com')).toBe('user%40example.com');
  });

  it('encodes slash', () => {
    expect(urlEncode('path/to/file')).toBe('path%2Fto%2Ffile');
  });

  it('encodes Unicode characters', () => {
    const result = urlEncode('café');
    expect(result).toContain('%');
  });

  it('encodes empty string to empty string', () => {
    expect(urlEncode('')).toBe('');
  });
});

// ─── sanitizeInput — minLength branch ──────────────────────────────────────

describe('sanitizeInput — minLength branch (lines 199-200)', () => {
  it('adds error when input is shorter than minLength', () => {
    const result = sanitizeInput('hi', { minLength: 5 });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('at least 5 characters'))).toBe(true);
  });

  it('passes when input equals minLength exactly', () => {
    const result = sanitizeInput('hello', { minLength: 5 });
    // "hello" passes minLength and maxLength, no other issues
    expect(result.errors.some(e => e.includes('at least'))).toBe(false);
  });

  it('combines minLength error with other errors', () => {
    // Short AND type=email fails both email format AND minLength
    const result = sanitizeInput('x', { minLength: 5, type: 'email' });
    expect(result.isValid).toBe(false);
    // Has minLength error
    expect(result.errors.some(e => e.includes('at least'))).toBe(true);
    // Has email error too
    expect(result.errors.some(e => e.toLowerCase().includes('email'))).toBe(true);
  });

  it('minLength=0 with empty optional field returns valid', () => {
    const result = sanitizeInput('', { minLength: 0, required: false });
    expect(result.isValid).toBe(true);
  });
});

// ─── sanitizeInput — name type branch (lines 212-213) ──────────────────────

describe('sanitizeInput — name type (lines 212-213)', () => {
  it('adds error when name contains invalid characters (digits)', () => {
    // NAME_REGEX = /^[a-zA-ZÀ-ÿ...]{1,100}/u — pure digits fail it
    // Use a name with digits only — won't trigger XSS/SQL threat detection
    const result = sanitizeInput('John123', { type: 'name' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('invalid characters'))).toBe(true);
  });

  it('passes for a valid name with allowed chars', () => {
    const result = sanitizeInput('Alice Smith', { type: 'name' });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('passes for name with accented chars', () => {
    const result = sanitizeInput('André García', { type: 'name' });
    expect(result.isValid).toBe(true);
  });

  it('passes empty name when not required (skips NAME_REGEX check)', () => {
    const result = sanitizeInput('', { type: 'name', required: false });
    expect(result.isValid).toBe(true);
  });
});

// ─── sanitizeInput — url type branches ─────────────────────────────────────

describe('sanitizeInput — url type (lines 216-220)', () => {
  it('passes valid HTTPS URL without error', () => {
    const result = sanitizeInput('https://example.com/path?q=1', { type: 'url' });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects invalid URL format', () => {
    const result = sanitizeInput('not-a-url', { type: 'url' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('url'))).toBe(true);
  });

  it('rejects HTTP URL (URL_REGEX requires https?:// but http is also allowed by regex)', () => {
    // The URL_REGEX is /^https?:\/\// so http: is also technically allowed
    const result = sanitizeInput('http://example.com', { type: 'url' });
    // http is valid by URL_REGEX — test that it doesn't produce URL format error
    expect(result.errors.some(e => e.includes('Invalid URL format'))).toBe(false);
  });

  it('rejects empty string URL (optional, so returns valid empty)', () => {
    // empty string with type: url and not required passes as valid empty
    const result = sanitizeInput('', { type: 'url', required: false });
    expect(result.isValid).toBe(true);
  });

  it('empty URL with required=true fails required check, not URL check', () => {
    const result = sanitizeInput('', { type: 'url', required: true });
    expect(result.errors).toContain('Field is required');
  });
});

// ─── sanitizeOAuthUserData ─────────────────────────────────────────────────

describe('sanitizeOAuthUserData (lines 247-292)', () => {
  describe('null/invalid input handling', () => {
    it('returns default object for null input', () => {
      const result = sanitizeOAuthUserData(null);
      expect(result).toEqual({
        id: '',
        name: 'Unknown User',
        email: '',
        picture: '',
        permissions: []
      });
    });

    it('returns default object for undefined input', () => {
      const result = sanitizeOAuthUserData(undefined);
      expect(result.name).toBe('Unknown User');
      expect(result.permissions).toEqual([]);
    });

    it('returns default object for non-object primitive', () => {
      const result = sanitizeOAuthUserData('string-input');
      expect(result.name).toBe('Unknown User');
    });

    it('returns default object for number input', () => {
      const result = sanitizeOAuthUserData(42);
      expect(result.id).toBe('');
      expect(result.email).toBe('');
    });
  });

  describe('valid user data', () => {
    it('sanitizes a complete valid user object', () => {
      const userData = {
        id: 'user-123',
        name: 'John Smith',
        email: 'john@example.com',
        picture: 'https://lh3.googleusercontent.com/photo.jpg',
        permissions: ['user', 'read']
      };
      const result = sanitizeOAuthUserData(userData);
      expect(result.id).toBe('user-123');
      expect(result.name).toBe('John Smith');
      expect(result.email).toBe('john@example.com');
      expect(result.picture).toBe('https://lh3.googleusercontent.com/photo.jpg');
      expect(result.permissions).toEqual(['user', 'read']);
    });

    it('uses "Unknown User" when name is missing', () => {
      const userData = { id: '1', email: 'a@b.com', picture: '', permissions: [] };
      const result = sanitizeOAuthUserData(userData);
      expect(result.name).toBe('Unknown User');
    });

    it('handles missing email gracefully', () => {
      const userData = { id: '1', name: 'Alice', picture: '', permissions: [] };
      const result = sanitizeOAuthUserData(userData);
      expect(result.email).toBe('');
    });

    it('handles missing picture gracefully', () => {
      const userData = { id: '1', name: 'Alice', email: 'a@b.com', permissions: [] };
      const result = sanitizeOAuthUserData(userData);
      expect(result.picture).toBe('');
    });
  });

  describe('permissions filtering', () => {
    it('filters out non-string permissions', () => {
      const userData = {
        id: '1',
        name: 'Bob',
        email: 'bob@example.com',
        picture: '',
        permissions: ['read', 42, null, 'write', {}, 'admin']
      };
      const result = sanitizeOAuthUserData(userData);
      expect(result.permissions).toEqual(['read', 'write', 'admin']);
    });

    it('handles empty permissions array', () => {
      const userData = { id: '1', name: 'Alice', email: 'a@b.com', picture: '', permissions: [] };
      const result = sanitizeOAuthUserData(userData);
      expect(result.permissions).toEqual([]);
    });

    it('handles non-array permissions (defaults to [])', () => {
      const userData = { id: '1', name: 'Alice', email: 'a@b.com', picture: '', permissions: 'admin' };
      const result = sanitizeOAuthUserData(userData);
      expect(result.permissions).toEqual([]);
    });

    it('filters out empty-string permissions after sanitization', () => {
      const userData = {
        id: '1',
        name: 'Test',
        email: 'test@test.com',
        picture: '',
        permissions: ['  ', 'read', '   ']
      };
      const result = sanitizeOAuthUserData(userData);
      // Whitespace-only strings become empty after trim, then filtered
      expect(result.permissions.filter(p => p.length === 0)).toHaveLength(0);
    });
  });

  describe('picture URL validation', () => {
    it('clears picture when URL is completely invalid (not a URL at all)', () => {
      const userData = {
        id: '1',
        name: 'Alice',
        email: 'a@b.com',
        picture: 'not-a-valid-url-at-all',
        permissions: []
      };
      const result = sanitizeOAuthUserData(userData);
      // sanitizeInput type:'url' with URL_REGEX fails → isValid=false → picture=''
      expect(result.picture).toBe('');
    });

    it('keeps picture when URL is from Google user content', () => {
      const userData = {
        id: '1',
        name: 'Alice',
        email: 'a@b.com',
        picture: 'https://lh3.googleusercontent.com/user/photo.jpg',
        permissions: []
      };
      const result = sanitizeOAuthUserData(userData);
      expect(result.picture).toBe('https://lh3.googleusercontent.com/user/photo.jpg');
    });

    it('keeps picture when URL has valid image extension', () => {
      const userData = {
        id: '1',
        name: 'Alice',
        email: 'a@b.com',
        picture: 'https://cdn.example.com/avatar.png',
        permissions: []
      };
      const result = sanitizeOAuthUserData(userData);
      expect(result.picture).toBe('https://cdn.example.com/avatar.png');
    });

    it('clears picture when URL is missing entirely', () => {
      const userData = { id: '1', name: 'Alice', email: 'a@b.com', permissions: [] };
      const result = sanitizeOAuthUserData(userData);
      expect(result.picture).toBe('');
    });
  });

  describe('XSS in userData fields', () => {
    it('sanitizes XSS in name field — sets to Unknown User due to failed name validation', () => {
      const userData = {
        id: '1',
        name: '<script>alert(1)</script>',
        email: 'a@b.com',
        picture: '',
        permissions: []
      };
      const result = sanitizeOAuthUserData(userData);
      // XSS name fails sanitizeInput threat detection → sanitized='', fallback to 'Unknown User'
      expect(result.name).toBe('Unknown User');
    });

    it('rejects XSS in email field', () => {
      const userData = {
        id: '1',
        name: 'Alice',
        email: 'javascript:alert(1)',
        picture: '',
        permissions: []
      };
      const result = sanitizeOAuthUserData(userData);
      // javascript: is a security threat → email sanitized to ''
      expect(result.email).toBe('');
    });
  });

  describe('id field sanitization', () => {
    it('sanitizes id field', () => {
      const userData = {
        id: 'user-abc-123',
        name: 'Alice',
        email: 'a@b.com',
        picture: '',
        permissions: []
      };
      const result = sanitizeOAuthUserData(userData);
      expect(result.id).toBe('user-abc-123');
    });

    it('handles missing id', () => {
      const userData = { name: 'Alice', email: 'a@b.com', picture: '', permissions: [] };
      const result = sanitizeOAuthUserData(userData);
      expect(result.id).toBe('');
    });
  });
});
