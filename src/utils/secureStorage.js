// Secure Storage Utilities
// Implements secure client-side storage with multiple security layers

/**
 * Crypto utilities for secure storage
 */
const CryptoUtils = {
  /**
   * Generate a cryptographically secure key
   * @returns {Promise<CryptoKey>} Encryption key
   */
  async generateKey() {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
  },

  /**
   * Derive key from password using PBKDF2
   * @param {string} password - Password to derive from
   * @param {Uint8Array} salt - Salt for key derivation
   * @returns {Promise<CryptoKey>} Derived key
   */
  async deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000, // High iteration count for security
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  },

  /**
   * Encrypt data using AES-GCM
   * @param {string} data - Data to encrypt
   * @param {CryptoKey} key - Encryption key
   * @returns {Promise<{encrypted: Uint8Array, iv: Uint8Array}>} Encrypted data and IV
   */
  async encrypt(data, key) {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encoder.encode(data)
    );

    return {
      encrypted: new Uint8Array(encrypted),
      iv: iv
    };
  },

  /**
   * Decrypt data using AES-GCM
   * @param {Uint8Array} encrypted - Encrypted data
   * @param {Uint8Array} iv - Initialization vector
   * @param {CryptoKey} key - Decryption key
   * @returns {Promise<string>} Decrypted data
   */
  async decrypt(encrypted, iv, key) {
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }
};

/**
 * Secure Storage Manager
 * Provides encrypted storage with automatic cleanup and security features
 */
export class SecureStorage {
  constructor() {
    this.keyCache = new Map();
    this.initialized = false;
  }

  /**
   * Initialize secure storage
   */
  async initialize() {
    if (this.initialized) return;
    
    // Generate or retrieve device-specific salt
    const salt = this.getOrCreateDeviceSalt();
    
    // Generate session-specific encryption key
    const sessionKey = await this.generateSessionKey(salt);
    this.keyCache.set('session', sessionKey);
    
    this.initialized = true;
  }

  /**
   * Get or create device-specific salt
   * @returns {Uint8Array} Device salt
   */
  getOrCreateDeviceSalt() {
    const stored = localStorage.getItem('device_salt');
    if (stored) {
      return new Uint8Array(JSON.parse(stored));
    }

    const salt = crypto.getRandomValues(new Uint8Array(32));
    localStorage.setItem('device_salt', JSON.stringify(Array.from(salt)));
    return salt;
  }

  /**
   * Generate session-specific encryption key
   * @param {Uint8Array} salt - Device salt
   * @returns {Promise<CryptoKey>} Session key
   */
  async generateSessionKey(salt) {
    // Use device fingerprint + timestamp as password
    const fingerprint = await this.generateDeviceFingerprint();
    const timestamp = Math.floor(Date.now() / (1000 * 60 * 60)); // Hour-based for some persistence
    const password = `${fingerprint}_${timestamp}`;
    
    return await CryptoUtils.deriveKey(password, salt);
  }

  /**
   * Generate device fingerprint for key derivation
   * @returns {Promise<string>} Device fingerprint
   */
  async generateDeviceFingerprint() {
    const data = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.hardwareConcurrency || 'unknown'
    ].join('|');

    // Hash the fingerprint data
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
  }

  /**
   * Securely store data
   * @param {string} key - Storage key
   * @param {string} value - Value to store
   * @param {object} options - Storage options
   */
  async secureSetItem(key, value, options = {}) {
    await this.initialize();

    const sessionKey = this.keyCache.get('session');
    if (!sessionKey) {
      throw new Error('Session key not available');
    }

    try {
      const { encrypted, iv } = await CryptoUtils.encrypt(value, sessionKey);
      
      const storageData = {
        data: Array.from(encrypted),
        iv: Array.from(iv),
        timestamp: Date.now(),
        ttl: options.ttl || (24 * 60 * 60 * 1000), // 24 hours default
        version: '1.0'
      };

      // Use sessionStorage for shorter-lived data, localStorage for persistent
      const storage = options.persistent ? localStorage : sessionStorage;
      storage.setItem(`secure_${key}`, JSON.stringify(storageData));

    } catch (error) {
      console.error('Secure storage encryption failed:', error);
      throw new Error('Failed to securely store data');
    }
  }

  /**
   * Securely retrieve data
   * @param {string} key - Storage key
   * @param {object} options - Retrieval options
   * @returns {Promise<string|null>} Decrypted value or null
   */
  async secureGetItem(key, options = {}) {
    await this.initialize();

    const sessionKey = this.keyCache.get('session');
    if (!sessionKey) {
      return null;
    }

    try {
      // Try sessionStorage first, then localStorage
      const storages = options.persistent ? [localStorage] : [sessionStorage, localStorage];
      
      for (const storage of storages) {
        const stored = storage.getItem(`secure_${key}`);
        if (!stored) continue;

        const storageData = JSON.parse(stored);
        
        // Check if data has expired
        if (Date.now() > storageData.timestamp + storageData.ttl) {
          storage.removeItem(`secure_${key}`);
          continue;
        }

        const encrypted = new Uint8Array(storageData.data);
        const iv = new Uint8Array(storageData.iv);

        const decrypted = await CryptoUtils.decrypt(encrypted, iv, sessionKey);
        return decrypted;
      }

      return null;

    } catch (error) {
      console.error('Secure storage decryption failed:', error);
      return null;
    }
  }

  /**
   * Remove securely stored data
   * @param {string} key - Storage key
   */
  secureRemoveItem(key) {
    sessionStorage.removeItem(`secure_${key}`);
    localStorage.removeItem(`secure_${key}`);
  }

  /**
   * Clear all secure storage
   */
  secureClear() {
    // Remove all secure_ prefixed items
    [sessionStorage, localStorage].forEach(storage => {
      const keys = Object.keys(storage).filter(k => k.startsWith('secure_'));
      keys.forEach(key => storage.removeItem(key));
    });
    
    this.keyCache.clear();
    this.initialized = false;
  }

  /**
   * Check if secure storage is available
   * @returns {boolean} Whether secure storage is available
   */
  isAvailable() {
    try {
      return 'crypto' in window && 'subtle' in window.crypto && 
             typeof Storage !== 'undefined';
    } catch {
      return false;
    }
  }
}

/**
 * Cookie management utilities for secure authentication
 */
export const SecureCookies = {
  /**
   * Check if cookies are enabled and accessible
   * @returns {boolean} Whether cookies are available
   */
  isAvailable() {
    try {
      document.cookie = 'test=1; SameSite=Strict';
      const available = document.cookie.includes('test=1');
      // Clean up test cookie
      document.cookie = 'test=; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
      return available;
    } catch {
      return false;
    }
  },

  /**
   * Get cookie value by name
   * @param {string} name - Cookie name
   * @returns {string|null} Cookie value or null
   */
  get(name) {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [cookieName, cookieValue] = cookie.trim().split('=');
      if (cookieName === name) {
        return decodeURIComponent(cookieValue);
      }
    }
    return null;
  },

  /**
   * Check if authentication cookies are present
   * @returns {boolean} Whether auth cookies exist
   */
  hasAuthCookies() {
    return this.get('auth_session') && this.get('auth_token');
  }
};

/**
 * Fallback storage for environments without crypto support
 */
export const FallbackStorage = {
  /**
   * Simple XOR encoding for basic obfuscation (not cryptographically secure)
   * @param {string} data - Data to encode
   * @param {string} key - Encoding key
   * @returns {string} Encoded data
   */
  simpleEncode(data, key) {
    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result); // Base64 encode
  },

  /**
   * Simple XOR decoding
   * @param {string} encoded - Encoded data
   * @param {string} key - Decoding key
   * @returns {string} Decoded data
   */
  simpleDecode(encoded, key) {
    try {
      const data = atob(encoded); // Base64 decode
      let result = '';
      for (let i = 0; i < data.length; i++) {
        result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return result;
    } catch {
      return null;
    }
  },

  /**
   * Generate simple obfuscation key
   * @returns {string} Obfuscation key
   */
  generateKey() {
    return btoa(navigator.userAgent + Date.now()).substring(0, 32);
  },

  /**
   * Store with simple obfuscation
   * @param {string} key - Storage key
   * @param {string} value - Value to store
   */
  setItem(key, value) {
    const obfuscationKey = this.generateKey();
    const encoded = this.simpleEncode(value, obfuscationKey);
    sessionStorage.setItem(`fallback_${key}`, JSON.stringify({
      data: encoded,
      key: obfuscationKey,
      timestamp: Date.now()
    }));
  },

  /**
   * Retrieve with simple obfuscation
   * @param {string} key - Storage key
   * @returns {string|null} Decoded value or null
   */
  getItem(key) {
    try {
      const stored = sessionStorage.getItem(`fallback_${key}`);
      if (!stored) return null;

      const { data, key: obfuscationKey } = JSON.parse(stored);
      return this.simpleDecode(data, obfuscationKey);
    } catch {
      return null;
    }
  },

  /**
   * Remove obfuscated item
   * @param {string} key - Storage key
   */
  removeItem(key) {
    sessionStorage.removeItem(`fallback_${key}`);
  }
};

// Create global instance
export const secureStorage = new SecureStorage();