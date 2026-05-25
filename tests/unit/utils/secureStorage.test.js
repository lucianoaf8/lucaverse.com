/**
 * SecureStorage, SecureCookies, and FallbackStorage Tests
 * Targets the currently 48%-covered secureStorage.js module.
 *
 * jsdom provides window.crypto.subtle — the jest.setup.js polyfills
 * crypto.getRandomValues but NOT crypto.subtle. We need to polyfill it here
 * using Node's built-in webcrypto implementation.
 */

// Polyfill crypto.subtle for jsdom using Node's webcrypto
const { webcrypto } = require('crypto');
if (!global.crypto.subtle) {
  Object.defineProperty(global.crypto, 'subtle', {
    value: webcrypto.subtle,
    writable: true,
    configurable: true
  });
}
// Ensure getRandomValues uses the real webcrypto one so it works with subtle
if (typeof global.crypto.getRandomValues !== 'function' || !global.crypto.subtle) {
  Object.defineProperty(global.crypto, 'getRandomValues', {
    value: (arr) => webcrypto.getRandomValues(arr),
    writable: true,
    configurable: true
  });
}

import { SecureStorage, SecureCookies, FallbackStorage, secureStorage } from '../../../src/utils/secureStorage.js';

// ─── Storage mocks ─────────────────────────────────────────────────────────
// We use a Proxy so that Object.keys() returns the keys in the underlying store.
// This makes secureClear() work correctly since it calls Object.keys(sessionStorage).
let localStore = {};
let sessionStore = {};

function makeStorageMock(storeRef) {
  const methods = {
    getItem: jest.fn((key) => storeRef()[key] ?? null),
    setItem: jest.fn((key, value) => { storeRef()[key] = String(value); }),
    removeItem: jest.fn((key) => { delete storeRef()[key]; }),
    clear: jest.fn(() => {
      const s = storeRef();
      Object.keys(s).forEach(k => delete s[k]);
    }),
    get length() { return Object.keys(storeRef()).length; },
    key: jest.fn((i) => Object.keys(storeRef())[i] ?? null),
  };

  return new Proxy(methods, {
    ownKeys() {
      return Object.keys(storeRef());
    },
    getOwnPropertyDescriptor(target, key) {
      if (key in storeRef()) {
        return { enumerable: true, configurable: true, value: storeRef()[key] };
      }
      return Object.getOwnPropertyDescriptor(target, key);
    },
    get(target, key) {
      if (key in target) return target[key];
      return storeRef()[key];
    }
  });
}

const localStorageMock = makeStorageMock(() => localStore);
const sessionStorageMock = makeStorageMock(() => sessionStore);

beforeAll(() => {
  Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });
  Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock, writable: true });
});

beforeEach(() => {
  localStore = {};
  sessionStore = {};
  // Clear mock call histories manually since Proxy wraps them
  [localStorageMock, sessionStorageMock].forEach(mock => {
    ['getItem', 'setItem', 'removeItem', 'clear', 'key'].forEach(method => {
      if (mock[method] && mock[method].mockClear) mock[method].mockClear();
    });
  });
});

// ─── SecureStorage ─────────────────────────────────────────────────────────

describe('SecureStorage', () => {
  let storage;

  beforeEach(() => {
    storage = new SecureStorage();
  });

  describe('constructor', () => {
    it('creates instance with initialized=false', () => {
      expect(storage.initialized).toBe(false);
    });

    it('creates instance with empty keyCache', () => {
      expect(storage.keyCache.size).toBe(0);
    });
  });

  describe('isAvailable', () => {
    it('returns true in jsdom environment with crypto.subtle polyfilled', () => {
      expect(storage.isAvailable()).toBe(true);
    });
  });

  describe('getOrCreateDeviceSalt', () => {
    it('creates a new salt when none exists', () => {
      const salt = storage.getOrCreateDeviceSalt();
      expect(salt).toBeInstanceOf(Uint8Array);
      expect(salt.length).toBe(32);
    });

    it('stores salt in localStorage', () => {
      storage.getOrCreateDeviceSalt();
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'device_salt',
        expect.any(String)
      );
    });

    it('returns same salt on subsequent calls', () => {
      const salt1 = storage.getOrCreateDeviceSalt();
      const salt2 = storage.getOrCreateDeviceSalt();
      expect(Array.from(salt1)).toEqual(Array.from(salt2));
    });
  });

  describe('initialize', () => {
    it('sets initialized=true after first call', async () => {
      await storage.initialize();
      expect(storage.initialized).toBe(true);
    });

    it('sets session key in keyCache', async () => {
      await storage.initialize();
      expect(storage.keyCache.has('session')).toBe(true);
    });

    it('does not re-initialize when already initialized', async () => {
      await storage.initialize();
      const key1 = storage.keyCache.get('session');
      await storage.initialize();
      const key2 = storage.keyCache.get('session');
      expect(key1).toBe(key2); // Same object reference
    });
  });

  describe('secureSetItem / secureGetItem round trip', () => {
    it('stores and retrieves a string value', async () => {
      await storage.secureSetItem('test_key', 'hello world');
      const value = await storage.secureGetItem('test_key');
      expect(value).toBe('hello world');
    });

    it('returns null for a key that was never set', async () => {
      const value = await storage.secureGetItem('nonexistent');
      expect(value).toBeNull();
    });

    it('stores JSON-serializable data', async () => {
      const data = JSON.stringify({ user: 'Alice', role: 'admin' });
      await storage.secureSetItem('user_data', data);
      const retrieved = await storage.secureGetItem('user_data');
      expect(JSON.parse(retrieved)).toEqual({ user: 'Alice', role: 'admin' });
    });

    it('stores under secure_ prefixed key in sessionStorage', async () => {
      await storage.secureSetItem('mykey', 'myvalue');
      const storedKey = Object.keys(sessionStore).find(k => k.startsWith('secure_mykey'));
      expect(storedKey).toBeTruthy();
    });

    it('stores under localStorage with persistent option', async () => {
      await storage.secureSetItem('persist_key', 'persist_value', { persistent: true });
      const storedKey = Object.keys(localStore).find(k => k.startsWith('secure_persist_key'));
      expect(storedKey).toBeTruthy();
    });

    it('retrieves from localStorage with persistent option', async () => {
      await storage.secureSetItem('pers', 'val', { persistent: true });
      const value = await storage.secureGetItem('pers', { persistent: true });
      expect(value).toBe('val');
    });

    it('returns null for expired data', async () => {
      await storage.secureSetItem('expired', 'old', { ttl: 1 }); // 1ms TTL
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 50));
      const value = await storage.secureGetItem('expired');
      expect(value).toBeNull();
    });

    it('stores strings with special characters correctly', async () => {
      const special = 'Hello World! <script>alert(1)</script> "quoted" & ampersand';
      await storage.secureSetItem('special', special);
      const retrieved = await storage.secureGetItem('special');
      expect(retrieved).toBe(special);
    });
  });

  describe('secureRemoveItem', () => {
    it('removes item from sessionStorage', async () => {
      await storage.secureSetItem('remove_me', 'value');
      storage.secureRemoveItem('remove_me');
      const value = await storage.secureGetItem('remove_me');
      expect(value).toBeNull();
    });
  });

  describe('secureClear', () => {
    it('clears keyCache and resets initialized', async () => {
      await storage.initialize();
      storage.secureClear();
      expect(storage.keyCache.size).toBe(0);
      expect(storage.initialized).toBe(false);
    });

    it('removes secure_ prefixed keys from session storage store', async () => {
      await storage.secureSetItem('key1', 'v1');
      // After setting, a secure_ key should exist in sessionStore
      const hadKey = Object.keys(sessionStore).some(k => k.startsWith('secure_key1'));
      expect(hadKey).toBe(true);
      // After clear, the key should be gone from the underlying store
      storage.secureClear();
      const keyGone = !Object.keys(sessionStore).some(k => k.startsWith('secure_key1'));
      expect(keyGone).toBe(true);
    });
  });

  describe('generateDeviceFingerprint', () => {
    it('returns a 32-character hex string', async () => {
      const fp = await storage.generateDeviceFingerprint();
      expect(fp).toMatch(/^[a-f0-9]{32}$/);
    });

    it('is deterministic for same environment', async () => {
      const fp1 = await storage.generateDeviceFingerprint();
      const fp2 = await storage.generateDeviceFingerprint();
      expect(fp1).toBe(fp2);
    });
  });
});

// ─── SecureCookies ─────────────────────────────────────────────────────────

describe('SecureCookies', () => {
  beforeEach(() => {
    // Clear cookies
    document.cookie.split(';').forEach(c => {
      const name = c.split('=')[0].trim();
      if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
  });

  describe('isAvailable', () => {
    it('returns a boolean', () => {
      expect(typeof SecureCookies.isAvailable()).toBe('boolean');
    });
  });

  describe('get', () => {
    it('returns null when cookie does not exist', () => {
      expect(SecureCookies.get('nonexistent_cookie')).toBeNull();
    });

    it('returns cookie value when set', () => {
      document.cookie = 'test_cookie=hello_world; path=/';
      expect(SecureCookies.get('test_cookie')).toBe('hello_world');
    });

    it('handles multiple cookies', () => {
      document.cookie = 'cookieA=alpha; path=/';
      document.cookie = 'cookieB=beta; path=/';
      expect(SecureCookies.get('cookieA')).toBe('alpha');
      expect(SecureCookies.get('cookieB')).toBe('beta');
    });
  });

  describe('hasAuthCookies', () => {
    it('returns falsy when auth cookies are not set', () => {
      expect(SecureCookies.hasAuthCookies()).toBeFalsy();
    });

    it('returns truthy when both auth cookies are set', () => {
      document.cookie = 'auth_session=sess123; path=/';
      document.cookie = 'auth_token=tok456; path=/';
      expect(SecureCookies.hasAuthCookies()).toBeTruthy();
    });

    it('returns falsy when only auth_session is set', () => {
      document.cookie = 'auth_session=sess123; path=/';
      // auth_token is missing
      const result = SecureCookies.hasAuthCookies();
      // null && null → falsy
      expect(result).toBeFalsy();
    });
  });
});

// ─── FallbackStorage ───────────────────────────────────────────────────────

describe('FallbackStorage', () => {
  describe('simpleEncode / simpleDecode round trip', () => {
    it('round-trips a simple string', () => {
      const data = 'hello world';
      const key = 'secretkey123';
      const encoded = FallbackStorage.simpleEncode(data, key);
      const decoded = FallbackStorage.simpleDecode(encoded, key);
      expect(decoded).toBe(data);
    });

    it('round-trips an empty string', () => {
      const encoded = FallbackStorage.simpleEncode('', 'key');
      const decoded = FallbackStorage.simpleDecode(encoded, 'key');
      expect(decoded).toBe('');
    });

    it('round-trips ascii-only string with special chars', () => {
      // btoa/atob only supports Latin-1 (code points 0-255).
      // Use a Latin-1 safe string with special chars in that range.
      const data = 'Hello! Caf\xe9 & Clich\xe9';
      const key = 'mykey';
      const encoded = FallbackStorage.simpleEncode(data, key);
      const decoded = FallbackStorage.simpleDecode(encoded, key);
      expect(decoded).toBe(data);
    });

    it('encoded output is base64 (different from input)', () => {
      const data = 'test data';
      const key = 'k';
      const encoded = FallbackStorage.simpleEncode(data, key);
      expect(encoded).not.toBe(data);
      // Base64 characters only
      expect(encoded).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('simpleDecode returns null for invalid base64', () => {
      const result = FallbackStorage.simpleDecode('!!!not-base64!!!', 'key');
      expect(result).toBeNull();
    });

    it('different keys produce different encodings', () => {
      const data = 'same data';
      const enc1 = FallbackStorage.simpleEncode(data, 'key1');
      const enc2 = FallbackStorage.simpleEncode(data, 'key2');
      expect(enc1).not.toBe(enc2);
    });
  });

  describe('generateKey', () => {
    it('returns a string of length <= 32', () => {
      const key = FallbackStorage.generateKey();
      expect(typeof key).toBe('string');
      expect(key.length).toBeLessThanOrEqual(32);
    });
  });

  describe('setItem / getItem round trip', () => {
    it('stores and retrieves a value', () => {
      FallbackStorage.setItem('mykey', 'myvalue');
      const result = FallbackStorage.getItem('mykey');
      expect(result).toBe('myvalue');
    });

    it('returns null for unknown key', () => {
      const result = FallbackStorage.getItem('nonexistent');
      expect(result).toBeNull();
    });

    it('stores under fallback_ prefixed key', () => {
      FallbackStorage.setItem('mykey', 'val');
      expect(sessionStore['fallback_mykey']).toBeTruthy();
    });

    it('round-trips complex string data', () => {
      const data = JSON.stringify({ name: 'Alice', roles: ['admin', 'user'] });
      FallbackStorage.setItem('complex', data);
      const result = FallbackStorage.getItem('complex');
      expect(JSON.parse(result)).toEqual({ name: 'Alice', roles: ['admin', 'user'] });
    });
  });

  describe('removeItem', () => {
    it('removes a stored item', () => {
      FallbackStorage.setItem('toremove', 'val');
      FallbackStorage.removeItem('toremove');
      expect(FallbackStorage.getItem('toremove')).toBeNull();
    });

    it('does not throw for non-existent key', () => {
      expect(() => FallbackStorage.removeItem('ghost')).not.toThrow();
    });
  });

  describe('error handling for getItem', () => {
    it('returns null on malformed stored JSON', () => {
      sessionStore['fallback_corrupt'] = 'not-json{';
      const result = FallbackStorage.getItem('corrupt');
      expect(result).toBeNull();
    });
  });
});

// ─── secureStorage singleton ───────────────────────────────────────────────

describe('secureStorage singleton', () => {
  it('is an instance of SecureStorage', () => {
    expect(secureStorage).toBeInstanceOf(SecureStorage);
  });

  it('has expected methods', () => {
    expect(typeof secureStorage.secureSetItem).toBe('function');
    expect(typeof secureStorage.secureGetItem).toBe('function');
    expect(typeof secureStorage.secureRemoveItem).toBe('function');
    expect(typeof secureStorage.secureClear).toBe('function');
    expect(typeof secureStorage.isAvailable).toBe('function');
  });
});
