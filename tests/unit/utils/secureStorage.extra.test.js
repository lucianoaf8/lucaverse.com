/**
 * Extra SecureStorage Tests
 * Covers uncovered lines:
 * - Lines 13-20: CryptoUtils.generateKey() (tested via generateSessionKey which uses it indirectly)
 * - Lines 186-187: secureSetItem when sessionKey is not available
 * - Lines 205-207: secureSetItem encryption error
 * - Lines 221-222: secureGetItem when sessionKey is not available
 * - Lines 250-252: secureGetItem decryption error catch
 * - Lines 287-288: isAvailable error catch branch
 * - Lines 308-309: SecureCookies.isAvailable error catch
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
if (typeof global.crypto.getRandomValues !== 'function') {
  Object.defineProperty(global.crypto, 'getRandomValues', {
    value: (arr) => webcrypto.getRandomValues(arr),
    writable: true,
    configurable: true
  });
}

import { SecureStorage, SecureCookies } from '../../../src/utils/secureStorage.js';

// Storage mocks
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
    ownKeys() { return Object.keys(storeRef()); },
    getOwnPropertyDescriptor(target, key) {
      if (key in storeRef()) return { enumerable: true, configurable: true, value: storeRef()[key] };
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
  [localStorageMock, sessionStorageMock].forEach(mock => {
    ['getItem', 'setItem', 'removeItem', 'clear', 'key'].forEach(method => {
      if (mock[method] && mock[method].mockClear) mock[method].mockClear();
    });
  });
});

describe('SecureStorage — extra coverage', () => {
  describe('secureSetItem — no session key (lines 186-187)', () => {
    it('throws Error when session key is not in keyCache after initialization', async () => {
      const storage = new SecureStorage();
      // Initialize normally to set initialized=true
      await storage.initialize();
      // Manually remove session key from cache
      storage.keyCache.delete('session');

      // Now secureSetItem should throw "Session key not available"
      await expect(storage.secureSetItem('k', 'v')).rejects.toThrow('Session key not available');
    });
  });

  describe('secureSetItem — encryption error (lines 205-207)', () => {
    it('throws an error when encryption fails', async () => {
      const storage = new SecureStorage();
      await storage.initialize();

      // Stub crypto.subtle.encrypt to throw
      const origEncrypt = global.crypto.subtle.encrypt;
      global.crypto.subtle.encrypt = jest.fn().mockRejectedValue(new Error('Encryption failed'));

      await expect(storage.secureSetItem('errkey', 'errval')).rejects.toThrow('Failed to securely store data');

      global.crypto.subtle.encrypt = origEncrypt;
    });
  });

  describe('secureGetItem — no session key (lines 221-222)', () => {
    it('returns null when session key is not in keyCache', async () => {
      const storage = new SecureStorage();
      await storage.initialize();
      storage.keyCache.delete('session');

      const result = await storage.secureGetItem('anykey');
      expect(result).toBeNull();
    });
  });

  describe('secureGetItem — decryption error (lines 250-252)', () => {
    it('returns null when decryption throws', async () => {
      const storage = new SecureStorage();
      await storage.initialize();

      // Store a value first (with real encryption)
      await storage.secureSetItem('deckey', 'decvalue');

      // Now stub decrypt to throw
      const origDecrypt = global.crypto.subtle.decrypt;
      global.crypto.subtle.decrypt = jest.fn().mockRejectedValue(new Error('Decryption failed'));

      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await storage.secureGetItem('deckey');
      expect(result).toBeNull();
      errSpy.mockRestore();

      global.crypto.subtle.decrypt = origDecrypt;
    });
  });

  describe('isAvailable — error catch branch (lines 287-288)', () => {
    it('returns false when window.crypto check throws', () => {
      const storage = new SecureStorage();

      // Temporarily override the 'crypto' property to be a getter that throws
      const origCrypto = global.crypto;
      Object.defineProperty(global, 'crypto', {
        get() { throw new Error('crypto unavailable'); },
        configurable: true
      });

      const result = storage.isAvailable();
      expect(result).toBe(false);

      // Restore
      Object.defineProperty(global, 'crypto', {
        value: origCrypto,
        writable: true,
        configurable: true
      });
    });
  });

  describe('CryptoUtils.generateKey — covered via initialization (lines 13-20)', () => {
    it('generateSessionKey completes and returns a CryptoKey object', async () => {
      const storage = new SecureStorage();
      const salt = webcrypto.getRandomValues(new Uint8Array(32));
      const key = await storage.generateSessionKey(salt);
      // CryptoKey objects don't have a predictable structure in jsdom, but we can verify
      // the key is a non-null object (CryptoKey or similar)
      expect(key).toBeTruthy();
      expect(typeof key).toBe('object');
    });

    it('initialize sets up session key via generateKey path', async () => {
      const storage = new SecureStorage();
      await storage.initialize();
      // The session key should be a CryptoKey - verify it has expected properties
      const sessionKey = storage.keyCache.get('session');
      expect(sessionKey).toBeTruthy();
    });
  });
});

describe('SecureStorage — generateDeviceFingerprint — hardwareConcurrency fallback (line 167)', () => {
  it('uses "unknown" when navigator.hardwareConcurrency is 0', async () => {
    const origHC = navigator.hardwareConcurrency;
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      value: 0,
      configurable: true,
      writable: true
    });

    const storage = new SecureStorage();
    const fp = await storage.generateDeviceFingerprint();
    expect(typeof fp).toBe('string');
    expect(fp.length).toBeGreaterThan(0);

    Object.defineProperty(navigator, 'hardwareConcurrency', {
      value: origHC,
      configurable: true,
      writable: true
    });
  });

  it('uses actual hardwareConcurrency when available (truthy branch)', async () => {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      value: 4,
      configurable: true,
      writable: true
    });

    const storage = new SecureStorage();
    const fp = await storage.generateDeviceFingerprint();
    expect(typeof fp).toBe('string');
    expect(fp.length).toBeGreaterThan(0);
  });
});

describe('SecureCookies — isAvailable error catch (lines 308-309)', () => {
  it('returns false when document.cookie access throws', () => {
    // Override document.cookie to throw on set
    const origDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie');
    Object.defineProperty(document, 'cookie', {
      get() { return ''; },
      set() { throw new Error('cookie access denied'); },
      configurable: true
    });

    const result = SecureCookies.isAvailable();
    expect(result).toBe(false);

    // Restore original descriptor
    if (origDescriptor) {
      Object.defineProperty(document, 'cookie', origDescriptor);
    } else {
      delete document.cookie;
    }
  });
});
