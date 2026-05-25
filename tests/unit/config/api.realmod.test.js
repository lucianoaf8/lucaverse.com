/**
 * API config real-module tests.
 * Imports src/config/api.js directly (no mocking) so source coverage is counted.
 * import.meta.env is handled by the importMetaEnvPlugin in jest.config.js which
 * sets DEV=true and leaves VITE_* vars as undefined.
 */

// Do NOT mock api.js — we want to execute the real source code.

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

describe('api.js real source — API_CONFIG', () => {
  it('has authApi, formsApi, newsletter, app, isDevelopment', () => {
    expect(typeof API_CONFIG.authApi).toBe('string');
    expect(typeof API_CONFIG.formsApi).toBe('string');
    expect(typeof API_CONFIG.newsletter).toBe('string');
    expect(typeof API_CONFIG.app).toBe('string');
    expect(typeof API_CONFIG.isDevelopment).toBe('boolean');
  });

  it('isDevelopment is true (DEV=true from importMetaEnvPlugin)', () => {
    // importMetaEnvPlugin sets DEV=true, so isDevelopment should be true
    expect(API_CONFIG.isDevelopment).toBe(true);
  });

  it('uses development fallback URLs when VITE_* env vars are undefined', () => {
    // VITE_AUTH_API_URL is undefined → uses dev default
    expect(API_CONFIG.authApi).toBe('http://localhost:8787');
    expect(API_CONFIG.formsApi).toBe('http://localhost:8788');
    expect(API_CONFIG.newsletter).toBe('https://newsletter.lucaverse.com');
    expect(API_CONFIG.app).toBe('http://localhost:5155');
  });
});

describe('api.js real source — endpoint helpers', () => {
  it('getAuthEndpoint() returns base auth URL', () => {
    const url = getAuthEndpoint();
    expect(url).toBe('http://localhost:8787');
  });

  it('getAuthEndpoint("/callback") appends path', () => {
    expect(getAuthEndpoint('/callback')).toBe('http://localhost:8787/callback');
  });

  it('getFormsEndpoint() returns base forms URL', () => {
    expect(getFormsEndpoint()).toBe('http://localhost:8788');
  });

  it('getFormsEndpoint("/submit") appends path', () => {
    expect(getFormsEndpoint('/submit')).toBe('http://localhost:8788/submit');
  });

  it('getNewsletterUrl() returns newsletter URL', () => {
    expect(getNewsletterUrl()).toBe('https://newsletter.lucaverse.com');
  });

  it('getAppUrl() returns app URL', () => {
    expect(getAppUrl()).toBe('http://localhost:5155');
  });
});

describe('api.js real source — validateEndpoint', () => {
  it('returns true for localhost (dev)', () => {
    expect(validateEndpoint('http://localhost:8787')).toBe(true);
  });

  it('returns true for lucaverse-auth worker', () => {
    expect(validateEndpoint('https://lucaverse-auth.lucianoaf8.workers.dev')).toBe(true);
  });

  it('returns true for summer-heart worker', () => {
    expect(validateEndpoint('https://summer-heart.lucianoaf8.workers.dev')).toBe(true);
  });

  it('returns true for newsletter.lucaverse.com', () => {
    expect(validateEndpoint('https://newsletter.lucaverse.com')).toBe(true);
  });

  it('returns true for lucaverse.com', () => {
    expect(validateEndpoint('https://lucaverse.com')).toBe(true);
  });

  it('returns false for evil.com', () => {
    expect(validateEndpoint('https://evil.com')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(validateEndpoint('')).toBe(false);
  });

  it('returns false for null', () => {
    expect(validateEndpoint(null)).toBe(false);
  });

  it('returns false for invalid URL', () => {
    expect(validateEndpoint('not a url')).toBe(false);
  });

  it('returns false for subdomain attack', () => {
    expect(validateEndpoint('https://evil.lucaverse.com')).toBe(false);
  });
});

describe('api.js real source — logConfig and testEnvVars', () => {
  it('logConfig() runs without throwing (logs in DEV mode)', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => logConfig()).not.toThrow();
    spy.mockRestore();
  });

  it('logConfig() calls console.log when isDevelopment is true', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logConfig();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('testEnvVars() runs without throwing', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => testEnvVars()).not.toThrow();
    spy.mockRestore();
  });
});
