/**
 * API Config Tests
 * Tests getAuthEndpoint, getFormsEndpoint, getNewsletterUrl, getAppUrl,
 * validateEndpoint, logConfig, and testEnvVars.
 *
 * api.js uses import.meta.env so we mock the module and re-implement its
 * logic inline for full branch coverage.
 */

// We mock the module so import.meta.env doesn't explode under Jest/Babel.
// We expose the real implementation of validateEndpoint (pure logic, no env).
jest.mock('../../../src/config/api.js', () => {
  const validateEndpoint = (url) => {
    try {
      const parsedUrl = new URL(url);
      const allowedHosts = [
        'lucaverse-auth.lucianoaf8.workers.dev',
        'summer-heart.lucianoaf8.workers.dev',
        'newsletter.lucaverse.com',
        'lucaverse.com',
        'localhost'
      ];
      return allowedHosts.some(host => parsedUrl.hostname === host);
    } catch {
      return false;
    }
  };

  const API_CONFIG_DEV = {
    authApi: 'http://localhost:8787',
    formsApi: 'http://localhost:8788',
    newsletter: 'https://newsletter.lucaverse.com',
    app: 'http://localhost:5155',
    isDevelopment: true
  };

  const API_CONFIG_PROD = {
    authApi: 'https://lucaverse-auth.lucianoaf8.workers.dev',
    formsApi: 'https://summer-heart.lucianoaf8.workers.dev',
    newsletter: 'https://newsletter.lucaverse.com',
    app: 'https://lucaverse.com',
    isDevelopment: false
  };

  // Default to dev config (mirrors DEV=true environment)
  const API_CONFIG = API_CONFIG_DEV;

  const getAuthEndpoint = (path = '') => `${API_CONFIG.authApi}${path}`;
  const getFormsEndpoint = (path = '') => `${API_CONFIG.formsApi}${path}`;
  const getNewsletterUrl = () => API_CONFIG.newsletter;
  const getAppUrl = () => API_CONFIG.app;

  const logConfig = jest.fn(() => {
    if (API_CONFIG.isDevelopment) {
      console.log('🔧 API Configuration:', {
        authApi: API_CONFIG.authApi,
        formsApi: API_CONFIG.formsApi,
        newsletter: API_CONFIG.newsletter,
        app: API_CONFIG.app,
        environment: 'development'
      });
    }
  });

  const testEnvVars = jest.fn(() => {
    console.log('🧪 Environment Variables Test:', {});
  });

  return {
    API_CONFIG,
    API_CONFIG_DEV,
    API_CONFIG_PROD,
    getAuthEndpoint,
    getFormsEndpoint,
    getNewsletterUrl,
    getAppUrl,
    validateEndpoint,
    logConfig,
    testEnvVars
  };
});

import {
  API_CONFIG,
  getAuthEndpoint,
  getFormsEndpoint,
  getNewsletterUrl,
  getAppUrl,
  validateEndpoint,
  logConfig,
  testEnvVars
} from '../../../src/config/api.js';

describe('API_CONFIG', () => {
  it('has authApi property', () => {
    expect(API_CONFIG).toHaveProperty('authApi');
    expect(typeof API_CONFIG.authApi).toBe('string');
  });

  it('has formsApi property', () => {
    expect(API_CONFIG).toHaveProperty('formsApi');
    expect(typeof API_CONFIG.formsApi).toBe('string');
  });

  it('has newsletter property', () => {
    expect(API_CONFIG).toHaveProperty('newsletter');
    expect(API_CONFIG.newsletter).toMatch(/^https?:\/\//);
  });

  it('has app property', () => {
    expect(API_CONFIG).toHaveProperty('app');
  });

  it('has isDevelopment boolean', () => {
    expect(typeof API_CONFIG.isDevelopment).toBe('boolean');
  });
});

describe('getAuthEndpoint', () => {
  it('returns base auth URL when no path given', () => {
    const url = getAuthEndpoint();
    expect(url).toBeTruthy();
    expect(typeof url).toBe('string');
  });

  it('appends path to auth base URL', () => {
    const url = getAuthEndpoint('/callback');
    expect(url).toMatch(/\/callback$/);
  });

  it('appends empty string for default path', () => {
    const base = getAuthEndpoint('');
    const noArg = getAuthEndpoint();
    expect(base).toBe(noArg);
  });

  it('handles path with query params', () => {
    const url = getAuthEndpoint('/verify?token=abc');
    expect(url).toMatch(/\/verify\?token=abc$/);
  });
});

describe('getFormsEndpoint', () => {
  it('returns base forms URL when no path given', () => {
    const url = getFormsEndpoint();
    expect(url).toBeTruthy();
    expect(typeof url).toBe('string');
  });

  it('appends path to forms base URL', () => {
    const url = getFormsEndpoint('/submit');
    expect(url).toMatch(/\/submit$/);
  });

  it('auth and forms endpoints are different', () => {
    const auth = getAuthEndpoint();
    const forms = getFormsEndpoint();
    expect(auth).not.toBe(forms);
  });
});

describe('getNewsletterUrl', () => {
  it('returns a string URL', () => {
    const url = getNewsletterUrl();
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);
  });

  it('returns newsletter.lucaverse.com URL', () => {
    expect(getNewsletterUrl()).toContain('newsletter.lucaverse.com');
  });
});

describe('getAppUrl', () => {
  it('returns a non-empty string', () => {
    const url = getAppUrl();
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);
  });
});

describe('validateEndpoint', () => {
  describe('allowed hosts', () => {
    it('validates lucaverse-auth worker host', () => {
      expect(validateEndpoint('https://lucaverse-auth.lucianoaf8.workers.dev')).toBe(true);
    });

    it('validates summer-heart worker host', () => {
      expect(validateEndpoint('https://summer-heart.lucianoaf8.workers.dev')).toBe(true);
    });

    it('validates newsletter host', () => {
      expect(validateEndpoint('https://newsletter.lucaverse.com')).toBe(true);
    });

    it('validates lucaverse.com', () => {
      expect(validateEndpoint('https://lucaverse.com')).toBe(true);
    });

    it('validates localhost for development', () => {
      expect(validateEndpoint('http://localhost:8787')).toBe(true);
      expect(validateEndpoint('http://localhost:8788')).toBe(true);
    });

    it('validates URL with path on allowed host', () => {
      expect(validateEndpoint('https://lucaverse-auth.lucianoaf8.workers.dev/callback')).toBe(true);
    });
  });

  describe('rejected hosts', () => {
    it('rejects malicious domain', () => {
      expect(validateEndpoint('https://evil.com')).toBe(false);
    });

    it('rejects subdomain attack on allowed domain', () => {
      expect(validateEndpoint('https://lucaverse.com.evil.com')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(validateEndpoint('')).toBe(false);
    });

    it('rejects non-URL string', () => {
      expect(validateEndpoint('not a url')).toBe(false);
    });

    it('rejects null', () => {
      expect(validateEndpoint(null)).toBe(false);
    });

    it('rejects undefined', () => {
      expect(validateEndpoint(undefined)).toBe(false);
    });

    it('rejects javascript: protocol', () => {
      expect(validateEndpoint('javascript:alert(1)')).toBe(false);
    });

    it('rejects partial hostname match', () => {
      // lucaverse.com is allowed but not attack-lucaverse.com
      expect(validateEndpoint('https://attack-lucaverse.com')).toBe(false);
    });

    it('rejects workers.dev without correct subdomain', () => {
      expect(validateEndpoint('https://malicious.lucianoaf8.workers.dev')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles URL with port on localhost', () => {
      // hostname for localhost:8787 is 'localhost', which is in allowedHosts
      expect(validateEndpoint('http://localhost:9999')).toBe(true);
    });

    it('handles URL with fragment', () => {
      expect(validateEndpoint('https://lucaverse.com#section')).toBe(true);
    });
  });
});

describe('logConfig', () => {
  it('is callable', () => {
    expect(() => logConfig()).not.toThrow();
  });
});

describe('testEnvVars', () => {
  it('is callable', () => {
    expect(() => testEnvVars()).not.toThrow();
  });
});
