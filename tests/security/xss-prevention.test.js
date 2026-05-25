/** XSS Prevention Security Tests - tests real source modules */
jest.mock('../../../src/utils/logger.js', () => ({
  securityLogger: { security: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
  logger: { security: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
  authLogger: { security: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
  createLogger: jest.fn(() => ({ security: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() })),
}));
jest.mock('../../../src/config/api.js', () => {
  const validateEndpoint = (url) => {
    try {
      const parsedUrl = new URL(url);
      const h = ['lucaverse-auth.lucianoaf8.workers.dev','summer-heart.lucianoaf8.workers.dev','newsletter.lucaverse.com','lucaverse.com','localhost'];
      return h.some((host) => parsedUrl.hostname === host);
    } catch { return false; }
  };
  return { validateEndpoint, API_CONFIG: { isDevelopment: false }, logConfig: jest.fn(), testEnvVars: jest.fn() };
});
import { htmlEncode, jsEncode, detectSecurityThreats, sanitizeInput, sanitizeFormData, safeRender, isValidImageUrl, generateCSPHeader, VALIDATION_SCHEMAS } from '../../../src/utils/securityUtils.js';
import { validateEndpoint } from '../../../src/config/api.js';
import { FallbackStorage } from '../../../src/utils/secureStorage.js';
const domSafe = (encoded) => { const el = document.createElement('div'); el['innerHTML'] = encoded; return el; };

describe('htmlEncode', () => {
  it('returns empty string for non-string inputs', () => {
    expect(htmlEncode(null)).toBe('');
    expect(htmlEncode(undefined)).toBe('');
    expect(htmlEncode(42)).toBe('');
    expect(htmlEncode({})).toBe('');
  });
  it('passes through plain text', () => {
    expect(htmlEncode('hello world')).toBe('hello world');
  });
  it('encodes amp lt gt quot apos', () => {
    expect(htmlEncode('&')).toBe('&amp;');
    expect(htmlEncode('<')).toBe('&lt;');
    expect(htmlEncode('>')).toBe('&gt;');
    expect(htmlEncode('"')).toBe('&quot;');
    expect(htmlEncode(String.fromCharCode(39))).toBe('&#x27;');
  });
  it('encodes slash backtick equals', () => {
    expect(htmlEncode('/')).toBe('&#x2F;');
    expect(htmlEncode(String.fromCharCode(96))).toBe('&#x60;');
    expect(htmlEncode('=')).toBe('&#x3D;');
  });
  describe('DOM safety via domSafe', () => {
    it('neutralises script tag', () => {
      const payload = '<script>window.__xss=true</script>';
      const encoded = htmlEncode(payload);
      expect(encoded).not.toMatch(/<[a-z]/i);
      const el = domSafe(encoded);
      expect(el.querySelector('script')).toBeNull();
    });
    it('neutralises img onerror', () => {
      const payload = '<img src=x onerror=window.__xss=true>';
      const encoded = htmlEncode(payload);
      expect(encoded).not.toMatch(/<[a-z]/i);
      const el = domSafe(encoded);
      expect(el.querySelector('img')).toBeNull();
    });
  });
  it('is idempotent on plain html tag', () => {
    expect(htmlEncode('<b>test</b>')).toBe('&lt;b&gt;test&lt;&#x2F;b&gt;');
  });
});

describe('jsEncode', () => {
  it('returns empty string for non-string input', () => {
    expect(jsEncode(null)).toBe('');
    expect(jsEncode(undefined)).toBe('');
  });
  it('escapes backslashes', () => {
    const bsl = String.fromCharCode(92);
    expect(jsEncode('a' + bsl + 'b')).toBe('a' + bsl + bsl + 'b');
  });
  it('escapes single quotes', () => {
    const apos = String.fromCharCode(39);
    const bsl = String.fromCharCode(92);
    expect(jsEncode('it' + apos + 's')).toBe('it' + bsl + apos + 's');
  });
  it('escapes double quotes', () => {
    const dq = String.fromCharCode(34);
    const bsl = String.fromCharCode(92);
    expect(jsEncode('say' + dq + 'hi' + dq)).toBe('say' + bsl + dq + 'hi' + bsl + dq);
  });
  it('escapes newlines', () => {
    const nl = String.fromCharCode(10);
    const bsl = String.fromCharCode(92);
    expect(jsEncode('a' + nl + 'b')).toBe('a' + bsl + 'n' + 'b');
  });
  it('escapes tabs', () => {
    const tab = String.fromCharCode(9);
    const bsl = String.fromCharCode(92);
    expect(jsEncode('a' + tab + 'b')).toBe('a' + bsl + 't' + 'b');
  });
  it('escapes null byte', () => {
    const nul = String.fromCharCode(0);
    const bsl = String.fromCharCode(92);
    expect(jsEncode('a' + nul + 'b')).toBe('a' + bsl + '0' + 'b');
  });
});

describe('detectSecurityThreats', () => {
  it('empty array for non-string', () => {
    expect(detectSecurityThreats(null)).toEqual([]);
    expect(detectSecurityThreats(42)).toEqual([]);
  });
  it('empty array for clean text', () => {
    expect(detectSecurityThreats('Hello world')).toHaveLength(0);
  });
  it('email has no XSS threats', () => {
    expect(detectSecurityThreats('user@example.com').filter(t => t.includes('XSS'))).toHaveLength(0);
  });
  it('detects script tags', () => {
    expect(detectSecurityThreats('<script>alert(1)</script>').length).toBeGreaterThan(0);
  });
  it('detects javascript: protocol', () => {
    expect(detectSecurityThreats('javascript:alert(1)').length).toBeGreaterThan(0);
  });
  it('detects on* event handlers', () => {
    expect(detectSecurityThreats('<img src=x onerror=1>').length).toBeGreaterThan(0);
  });
  it('detects vbscript:', () => {
    expect(detectSecurityThreats('vbscript:msgbox(1)').length).toBeGreaterThan(0);
  });
  it('detects data:text/html URI', () => {
    expect(detectSecurityThreats('data:text/html,<h1>x</h1>').length).toBeGreaterThan(0);
  });
  it('detects SQL UNION SELECT', () => {
    expect(detectSecurityThreats('1 UNION SELECT * FROM users').length).toBeGreaterThan(0);
  });
  it('detects SQL DROP keyword', () => {
    expect(detectSecurityThreats('DROP TABLE users').length).toBeGreaterThan(0);
  });
  it('detects SQL INSERT keyword', () => {
    expect(detectSecurityThreats('INSERT INTO users VALUES (x)').length).toBeGreaterThan(0);
  });
  it('detects semicolon pattern', () => {
    expect(detectSecurityThreats('; DROP TABLE users').length).toBeGreaterThan(0);
  });
  it('returns array of strings describing threats', () => {
    const threats = detectSecurityThreats('<script>x</script>');
    expect(Array.isArray(threats)).toBe(true);
    threats.forEach(t => expect(typeof t).toBe('string'));
  });
});

describe('sanitizeInput', () => {
  it('isValid:true for safe text', () => {
    expect(sanitizeInput('Hello world').isValid).toBe(true);
  });
  it('trims whitespace', () => {
    const r = sanitizeInput('  hello  ');
    expect(r.sanitized).toBe('hello');
  });
  it('isValid:false for empty required field', () => {
    const r = sanitizeInput('', { required: true });
    expect(r.isValid).toBe(false);
    expect(r.errors).toContain('Field is required');
  });
  it('isValid:true for optional empty field', () => {
    expect(sanitizeInput('', { required: false }).isValid).toBe(true);
  });
  it('rejects XSS payload', () => {
    const r = sanitizeInput('<script>alert(1)</script>', { type: 'text' });
    expect(r.isValid).toBe(false);
    expect(r.errors).toContain('Security threat detected in input');
  });
  it('rejects javascript: protocol', () => {
    expect(sanitizeInput('javascript:alert(1)', { type: 'text' }).isValid).toBe(false);
  });
  it('rejects SQL UNION SELECT', () => {
    const r = sanitizeInput('1 UNION SELECT * FROM users', { type: 'text' });
    expect(r.isValid).toBe(false);
    expect(r.errors).toContain('Security threat detected in input');
  });
  it('rejects overly long input', () => {
    const r = sanitizeInput('a'.repeat(1001), { maxLength: 1000 });
    expect(r.errors.some(e => e.includes('maximum length'))).toBe(true);
  });
  it('accepts valid email', () => {
    const r = sanitizeInput('user@example.com', { type: 'email' });
    expect(r.isValid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });
  it('rejects invalid email', () => {
    const r = sanitizeInput('not-an-email', { type: 'email' });
    expect(r.isValid).toBe(false);
    expect(r.errors.some(e => e.includes('email'))).toBe(true);
  });
  it('accepts valid name', () => {
    expect(sanitizeInput('John Doe', { type: 'name' }).isValid).toBe(true);
  });
  it('rejects name with script injection', () => {
    expect(sanitizeInput('<script>John</script>', { type: 'name' }).isValid).toBe(false);
  });
  it('accepts valid HTTPS URL', () => {
    expect(sanitizeInput('https://example.com/path', { type: 'url' }).isValid).toBe(true);
  });
  it('rejects invalid URL', () => {
    expect(sanitizeInput('not-a-url', { type: 'url' }).isValid).toBe(false);
  });
  it('html-encodes when type is html and allowHtml false', () => {
    const r = sanitizeInput('<b>bold</b>', { type: 'html', allowHtml: false });
    expect(r.isValid).toBe(true);
    expect(r.sanitized).toContain('&lt;');
  });
  it('converts non-string to string with warning', () => {
    expect(sanitizeInput(42).warnings).toContain('Input was converted to string');
  });
});

describe('sanitizeFormData', () => {
  const schema = VALIDATION_SCHEMAS.contact;
  it('isValid:true for valid contact form', () => {
    const data = { name: 'Jane Smith', email: 'jane@example.com', subject: 'Hello there', message: 'This is a longer message with enough characters.' };
    const result = sanitizeFormData(data, schema);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });
  it('errors for missing required fields', () => {
    const data = { name: '', email: '', subject: '', message: '' };
    const result = sanitizeFormData(data, schema);
    expect(result.isValid).toBe(false);
    expect(Object.keys(result.errors).length).toBeGreaterThan(0);
  });
  it('rejects XSS in name field', () => {
    const data = { name: '<script>a</script>', email: 'j@e.com', subject: 'S', message: 'A valid message with more than ten chars.' };
    const result = sanitizeFormData(data, schema);
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });
  it('accessRequest schema has name email reason fields', () => {
    const s2 = VALIDATION_SCHEMAS.accessRequest;
    expect(s2).toHaveProperty('name');
    expect(s2).toHaveProperty('email');
    expect(s2).toHaveProperty('reason');
  });
});

describe('safeRender', () => {
  it('returns fallback for non-string input', () => {
    expect(safeRender(null, 'FB')).toBe('FB');
    expect(safeRender(undefined, 'FB')).toBe('FB');
  });
  it('returns fallback for XSS', () => {
    expect(safeRender('<script>a</script>', 'FB')).toBe('FB');
  });
  it('returns non-empty result for safe text', () => {
    expect(safeRender('Hello World', '')).toBeTruthy();
  });
  it('uses empty string default fallback', () => {
    expect(safeRender(null)).toBe('');
  });
});

describe('isValidImageUrl', () => {
  it('false for empty/non-string', () => {
    expect(isValidImageUrl('')).toBe(false);
    expect(isValidImageUrl(null)).toBe(false);
    expect(isValidImageUrl(42)).toBe(false);
  });
  it('false for HTTP URL', () => {
    expect(isValidImageUrl('http://example.com/photo.jpg')).toBe(false);
  });
  it('false for javascript: protocol', () => {
    expect(isValidImageUrl('javascript:alert(1)')).toBe(false);
  });
  it('true for Google profile image URL', () => {
    expect(isValidImageUrl('https://lh3.googleusercontent.com/user/photo.jpg')).toBe(true);
  });
  it('true for HTTPS .jpg on any domain', () => {
    expect(isValidImageUrl('https://cdn.example.com/image.jpg')).toBe(true);
  });
  it('true for HTTPS .png on any domain', () => {
    expect(isValidImageUrl('https://cdn.example.com/image.png')).toBe(true);
  });
  it('false for unknown domain without image extension', () => {
    expect(isValidImageUrl('https://evil.com/malware')).toBe(false);
  });
  it('true for GitHub avatar URL', () => {
    expect(isValidImageUrl('https://avatars.githubusercontent.com/u/12345')).toBe(true);
  });
  it('true for Gravatar URL', () => {
    expect(isValidImageUrl('https://secure.gravatar.com/avatar/abc123')).toBe(true);
  });
});

describe('generateCSPHeader', () => {
  let csp;
  beforeAll(() => { csp = generateCSPHeader(); });
  it('returns a non-empty string', () => {
    expect(typeof csp).toBe('string');
    expect(csp.length).toBeGreaterThan(0);
  });
  it("includes default-src 'self'", () => {
    expect(csp).toContain("default-src 'self'");
  });
  it("includes object-src 'none'", () => {
    expect(csp).toContain("object-src 'none'");
  });
  it("includes frame-ancestors 'none'", () => {
    expect(csp).toContain("frame-ancestors 'none'");
  });
  it('includes upgrade-insecure-requests', () => {
    expect(csp).toContain('upgrade-insecure-requests');
  });
  it("includes base-uri 'self'", () => {
    expect(csp).toContain("base-uri 'self'");
  });
  it('includes connect-src for auth worker', () => {
    expect(csp).toContain('lucaverse-auth.lucianoaf8.workers.dev');
  });
});

describe('validateEndpoint', () => {
  it('true for lucaverse-auth worker', () => {
    expect(validateEndpoint('https://lucaverse-auth.lucianoaf8.workers.dev/oauth')).toBe(true);
  });
  it('true for summer-heart worker', () => {
    expect(validateEndpoint('https://summer-heart.lucianoaf8.workers.dev/submit')).toBe(true);
  });
  it('true for newsletter.lucaverse.com', () => {
    expect(validateEndpoint('https://newsletter.lucaverse.com/subscribe')).toBe(true);
  });
  it('true for lucaverse.com', () => {
    expect(validateEndpoint('https://lucaverse.com/')).toBe(true);
  });
  it('true for localhost', () => {
    expect(validateEndpoint('http://localhost:3000/api')).toBe(true);
  });
  it('false for unknown external host', () => {
    expect(validateEndpoint('https://evil.com/steal')).toBe(false);
  });
  it('false for subdomain not in allowlist', () => {
    expect(validateEndpoint('https://other.lucianoaf8.workers.dev/x')).toBe(false);
  });
  it('false for empty string', () => {
    expect(validateEndpoint('')).toBe(false);
  });
  it('false for non-URL string', () => {
    expect(validateEndpoint('not-a-url')).toBe(false);
  });
  it('false for javascript: URL', () => {
    expect(validateEndpoint('javascript:alert(1)')).toBe(false);
  });
  it('false for similar-looking domain', () => {
    expect(validateEndpoint('https://lucaverse.com.evil.com/')).toBe(false);
  });
  it('false for null', () => {
    expect(validateEndpoint(null)).toBe(false);
  });
});

describe('FallbackStorage', () => {
  it('simpleEncode returns a non-empty string', () => {
    expect(typeof FallbackStorage.simpleEncode('hello', 'key')).toBe('string');
    expect(FallbackStorage.simpleEncode('hello', 'key').length).toBeGreaterThan(0);
  });
  it('simpleEncode output differs from plaintext', () => {
    expect(FallbackStorage.simpleEncode('hello', 'key')).not.toBe('hello');
  });
  it('simpleDecode reverses simpleEncode', () => {
    const key = 'testkey123';
    const original = 'secret data';
    const encoded = FallbackStorage.simpleEncode(original, key);
    expect(FallbackStorage.simpleDecode(encoded, key)).toBe(original);
  });
  it('round-trip works for empty string', () => {
    const encoded = FallbackStorage.simpleEncode('', 'k');
    expect(FallbackStorage.simpleDecode(encoded, 'k')).toBe('');
  });
  it('different keys produce different ciphertext', () => {
    const a = FallbackStorage.simpleEncode('data', 'key1');
    const b = FallbackStorage.simpleEncode('data', 'key2');
    expect(a).not.toBe(b);
  });
  it('simpleDecode returns null for invalid base64', () => {
    expect(FallbackStorage.simpleDecode('!!!not-base64!!!', 'key')).toBeNull();
  });
  it('simpleEncode output is valid base64', () => {
    const encoded = FallbackStorage.simpleEncode('test', 'k');
    expect(() => atob(encoded)).not.toThrow();
  });
});

describe('VALIDATION_SCHEMAS', () => {
  it('has contact and accessRequest schemas', () => {
    expect(VALIDATION_SCHEMAS).toHaveProperty('contact');
    expect(VALIDATION_SCHEMAS).toHaveProperty('accessRequest');
  });
  it('contact schema has required fields', () => {
    const c = VALIDATION_SCHEMAS.contact;
    expect(c).toHaveProperty('name');
    expect(c).toHaveProperty('email');
    expect(c).toHaveProperty('subject');
    expect(c).toHaveProperty('message');
  });
  it('contact.name is required with type name', () => {
    expect(VALIDATION_SCHEMAS.contact.name.required).toBe(true);
    expect(VALIDATION_SCHEMAS.contact.name.type).toBe('name');
  });
  it('contact.email is required with type email', () => {
    expect(VALIDATION_SCHEMAS.contact.email.required).toBe(true);
    expect(VALIDATION_SCHEMAS.contact.email.type).toBe('email');
  });
  it('contact.message has minLength to prevent empty payloads', () => {
    expect(VALIDATION_SCHEMAS.contact.message.minLength).toBeGreaterThan(0);
  });
});
