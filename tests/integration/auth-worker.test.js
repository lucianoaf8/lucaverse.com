/**
 * Integration tests for the authentication Cloudflare Worker
 * Tests the real worker code (lucaverse-auth/src/index.js) using in-memory mocks
 * that mirror the Cloudflare KV / Fetch contract.
 *
 * Key contract (current source):
 *  - /auth/google        — accepts ?origin=, stores state as JSON {createdAt, frontendOrigin}
 *  - /auth/google/callback — parses JSON state, redirects ?code=<uuid>&api=<workerUrl>
 *  - /auth/exchange      — single-use, 60s TTL, returns {sessionId, token}
 *  - /auth/verify        — 4 branches: missing params, not found, expired, invalid token
 *  - /auth/logout        — deletes session from KV
 *  - /auth/test          — health check endpoint
 *  - OPTIONS preflight   — returns 200 with CORS headers
 *  - Unknown routes      — 404
 *  - Error messages      — generic only (no error.message leakage)
 */

// ---------------------------------------------------------------------------
// Infrastructure — polyfill globals the worker needs in the jsdom/Node env
// ---------------------------------------------------------------------------

// Node 26 ships native Request/Response/Headers; expose them to global scope
// so the worker's `new Response(...)` and `Response.redirect(...)` calls work.
// The jest.setup.js installs MockRequest/MockResponse which are inadequate for
// the worker (uses Map for headers, missing Response.redirect static, etc.).

// Restore the native Web API globals before the worker is imported.
const nativeResponse = globalThis.Response || Response;
const nativeRequest  = globalThis.Request  || Request;
const nativeHeaders  = globalThis.Headers  || Headers;

// Ensure the worker-facing globals are the real platform objects.
// (jest.setup.js may have overwritten them with mocks.)
global.Response = nativeResponse;
global.Request  = nativeRequest;
global.Headers  = nativeHeaders;

// Provide crypto.randomUUID — the worker calls it directly; Node 26 has it on
// globalThis.crypto but jest.setup.js replaces crypto with a partial mock.
const nodeCrypto = require('crypto');
global.crypto = {
  randomUUID: () => nodeCrypto.randomUUID(),
  getRandomValues: (arr) => {
    const bytes = nodeCrypto.randomBytes(arr.length);
    for (let i = 0; i < arr.length; i++) arr[i] = bytes[i];
    return arr;
  },
};

// ---------------------------------------------------------------------------
// Mock Cloudflare Worker environment factory
// ---------------------------------------------------------------------------

/**
 * In-memory KV store that behaves like a real Cloudflare KV namespace.
 * Supports expirationTtl — entries are simply stored; expiry is not enforced
 * here (worker logic handles expiry checks separately for sessions).
 */
function createInMemoryKV() {
  const store = new Map();
  return {
    _store: store,
    put: jest.fn(async (key, value, _opts) => { store.set(key, value); }),
    get: jest.fn(async (key) => store.get(key) ?? null),
    delete: jest.fn(async (key) => { store.delete(key); }),
    /** Test-only helper: pre-seed the store without going through the mock */
    _seed(key, value) { store.set(key, value); },
  };
}

const createMockEnv = () => {
  const kvSessions = createInMemoryKV();
  const kvWhitelist = createInMemoryKV();

  // Seed a default whitelist so happy-path callback tests work out of the box.
  kvWhitelist._seed('users', JSON.stringify({ emails: ['test@example.com', 'allowed@example.com'] }));

  return {
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    WORKER_URL: 'https://auth-worker.example.com',
    FRONTEND_URL: 'https://example.com',
    NODE_ENV: 'test',
    OAUTH_SESSIONS: kvSessions,
    USER_WHITELIST: kvWhitelist,
  };
};

// ---------------------------------------------------------------------------
// Mock external fetch (Google OAuth APIs)
// ---------------------------------------------------------------------------

const makeGoogleFetchMock = (overrides = {}) => (url) => {
  if (url.includes('oauth2.googleapis.com/token')) {
    return Promise.resolve({
      json: () => Promise.resolve(overrides.tokenResponse ?? { access_token: 'test-access-token' }),
    });
  }
  if (url.includes('googleapis.com/oauth2/v2/userinfo')) {
    return Promise.resolve({
      json: () => Promise.resolve(overrides.userInfo ?? {
        id: 'google-user-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
      }),
    });
  }
  return Promise.reject(new Error(`Unmocked fetch call: ${url}`));
};

global.fetch = jest.fn(makeGoogleFetchMock());

// ---------------------------------------------------------------------------
// Import worker
// ---------------------------------------------------------------------------

let worker;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Perform a full happy-path Google auth initiation.
 * Returns {response, state} where state is the UUID stored in KV.
 */
async function initiateGoogleAuth(env, originParam = null) {
  const url = originParam
    ? `https://auth-worker.example.com/auth/google?origin=${encodeURIComponent(originParam)}`
    : 'https://auth-worker.example.com/auth/google';
  const request = new Request(url);
  const response = await worker.fetch(request, env);
  // Extract state from KV: the only key starting with "state_"
  const stateKey = [...env.OAUTH_SESSIONS._store.keys()].find(k => k.startsWith('state_'));
  const state = stateKey ? stateKey.replace('state_', '') : null;
  return { response, state };
}

/**
 * Perform a full happy-path callback. Pre-seeds valid state JSON in KV.
 * Returns the redirect response from the callback.
 */
async function performCallback(env, { state, userEmail = 'test@example.com', userInfo } = {}) {
  // Seed KV state if not already present
  if (state && !env.OAUTH_SESSIONS._store.has(`state_${state}`)) {
    env.OAUTH_SESSIONS._seed(`state_${state}`, JSON.stringify({
      createdAt: Date.now(),
      frontendOrigin: env.FRONTEND_URL,
    }));
  }

  if (userInfo) {
    global.fetch.mockImplementation(makeGoogleFetchMock({ userInfo }));
  }

  const request = new Request(
    `https://auth-worker.example.com/auth/google/callback?code=google-auth-code&state=${state}`
  );
  return worker.fetch(request, env);
}

// ===========================================================================
// Tests
// ===========================================================================

describe('Authentication Worker Integration Tests', () => {
  let env;

  beforeAll(async () => {
    worker = (await import('../../lucaverse-auth/src/index.js')).default;
  });

  beforeEach(() => {
    env = createMockEnv();
    global.fetch = jest.fn(makeGoogleFetchMock());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // CORS preflight
  // =========================================================================

  describe('CORS Preflight (OPTIONS)', () => {
    it('returns 200 for OPTIONS from an allowed origin', async () => {
      const request = new Request('https://auth-worker.example.com/auth/google', {
        method: 'OPTIONS',
        headers: { Origin: 'https://example.com' },
      });
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('returns 200 for OPTIONS from an unknown origin (falls back to FRONTEND_URL)', async () => {
      const request = new Request('https://auth-worker.example.com/auth/google', {
        method: 'OPTIONS',
        headers: { Origin: 'https://malicious-site.com' },
      });
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      // CORS origin falls back to FRONTEND_URL for disallowed origins
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    });

    it('blocks localhost origins in production mode', async () => {
      env.NODE_ENV = 'production';
      const request = new Request('https://auth-worker.example.com/auth/google', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:5155' },
      });
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      // localhost is not in the production allowed list → falls back to FRONTEND_URL
      expect(response.headers.get('Access-Control-Allow-Origin')).not.toBe('http://localhost:5155');
    });

    it('allows localhost origins in non-production mode', async () => {
      const request = new Request('https://auth-worker.example.com/auth/google', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:5155' },
      });
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5155');
    });
  });

  // =========================================================================
  // /auth/google — OAuth initiation
  // =========================================================================

  describe('/auth/google — OAuth initiation', () => {
    it('redirects to Google OAuth with correct query parameters', async () => {
      const { response } = await initiateGoogleAuth(env);

      expect(response.status).toBe(302);
      const location = response.headers.get('Location');
      expect(location).toContain('accounts.google.com/o/oauth2/v2/auth');
      expect(location).toContain('client_id=test-client-id');
      expect(location).toContain('response_type=code');
      expect(location).toContain('scope=openid+profile+email');
      expect(location).toContain('state=');
    });

    it('stores CSRF state as JSON with createdAt and frontendOrigin in KV', async () => {
      const { state } = await initiateGoogleAuth(env);

      expect(state).toBeTruthy();
      expect(env.OAUTH_SESSIONS.put).toHaveBeenCalledWith(
        `state_${state}`,
        expect.any(String),
        { expirationTtl: 600 }
      );

      // Stored value must be valid JSON with the expected shape
      const stored = env.OAUTH_SESSIONS._store.get(`state_${state}`);
      const parsed = JSON.parse(stored);
      expect(parsed).toHaveProperty('createdAt');
      expect(parsed).toHaveProperty('frontendOrigin');
      expect(typeof parsed.createdAt).toBe('number');
    });

    it('uses env.FRONTEND_URL as frontendOrigin when no ?origin param is provided', async () => {
      const { state } = await initiateGoogleAuth(env);
      const parsed = JSON.parse(env.OAUTH_SESSIONS._store.get(`state_${state}`));
      expect(parsed.frontendOrigin).toBe('https://example.com');
    });

    it('uses a valid ?origin param as frontendOrigin', async () => {
      // lucaverse.com is in ALLOWED_ORIGINS
      const { state } = await initiateGoogleAuth(env, 'https://lucaverse.com');
      const parsed = JSON.parse(env.OAUTH_SESSIONS._store.get(`state_${state}`));
      expect(parsed.frontendOrigin).toBe('https://lucaverse.com');
    });

    it('ignores an invalid ?origin param and falls back to FRONTEND_URL', async () => {
      const { state } = await initiateGoogleAuth(env, 'https://evil.com');
      const parsed = JSON.parse(env.OAUTH_SESSIONS._store.get(`state_${state}`));
      expect(parsed.frontendOrigin).toBe('https://example.com');
    });

    it('generates unique state values across concurrent requests', async () => {
      const requests = Array.from({ length: 6 }, () =>
        worker.fetch(new Request('https://auth-worker.example.com/auth/google'), env)
      );
      await Promise.all(requests);

      const stateKeys = [...env.OAUTH_SESSIONS._store.keys()].filter(k => k.startsWith('state_'));
      const uniqueKeys = new Set(stateKeys);
      expect(uniqueKeys.size).toBe(6);
    });

    it('returns 500 when GOOGLE_CLIENT_ID is missing', async () => {
      env.GOOGLE_CLIENT_ID = undefined;
      const request = new Request('https://auth-worker.example.com/auth/google');
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(500);
      // SECURITY: generic message only — must NOT leak error.message details
      const body = await response.text();
      expect(body).toBe('Internal Server Error');
    });

    it('returns 500 that does not leak internal error details', async () => {
      env.GOOGLE_CLIENT_ID = undefined;
      const request = new Request('https://auth-worker.example.com/auth/google');
      const response = await worker.fetch(request, env);

      const body = await response.text();
      expect(body).not.toContain('GOOGLE_CLIENT_ID');
      expect(body).not.toContain('environment variable');
    });
  });

  // =========================================================================
  // /auth/google/callback — OAuth callback
  // =========================================================================

  describe('/auth/google/callback — OAuth callback', () => {
    it('redirects with ?code=<uuid>&api=<workerUrl> on successful authentication', async () => {
      const { state } = await initiateGoogleAuth(env);
      const response = await performCallback(env, { state });

      expect(response.status).toBe(302);
      const location = response.headers.get('Location');
      expect(location).toContain('/oauth-callback.html');
      expect(location).toContain('code=');
      expect(location).toContain('api=');
      // Must NOT use the old ?token= or ?session= format
      expect(location).not.toContain('token=');
      expect(location).not.toContain('session=');
    });

    it('stores session data in KV with correct shape', async () => {
      const { state } = await initiateGoogleAuth(env);
      await performCallback(env, { state });

      // A session key (not a state_ or exchange_ key) should exist
      const sessionKey = [...env.OAUTH_SESSIONS._store.keys()].find(
        k => !k.startsWith('state_') && !k.startsWith('exchange_')
      );
      expect(sessionKey).toBeTruthy();

      const sessionData = JSON.parse(env.OAUTH_SESSIONS._store.get(sessionKey));
      expect(sessionData).toHaveProperty('user');
      expect(sessionData).toHaveProperty('token');
      expect(sessionData).toHaveProperty('createdAt');
      expect(sessionData).toHaveProperty('expiresAt');
      expect(sessionData.user.email).toBe('test@example.com');
    });

    it('session expiresAt is within 7 days from now', async () => {
      const { state } = await initiateGoogleAuth(env);
      await performCallback(env, { state });

      const sessionKey = [...env.OAUTH_SESSIONS._store.keys()].find(
        k => !k.startsWith('state_') && !k.startsWith('exchange_')
      );
      const sessionData = JSON.parse(env.OAUTH_SESSIONS._store.get(sessionKey));
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(sessionData.expiresAt).toBeGreaterThan(Date.now());
      expect(sessionData.expiresAt).toBeLessThan(Date.now() + sevenDaysMs + 5000);
    });

    it('stores an exchange_ code in KV with the session credentials', async () => {
      const { state } = await initiateGoogleAuth(env);
      const response = await performCallback(env, { state });

      const location = response.headers.get('Location');
      const codeMatch = location.match(/code=([^&]+)/);
      expect(codeMatch).toBeTruthy();
      const exchangeCode = codeMatch[1];

      const exchangeStored = env.OAUTH_SESSIONS._store.get(`exchange_${exchangeCode}`);
      expect(exchangeStored).toBeTruthy();
      const exchangeData = JSON.parse(exchangeStored);
      expect(exchangeData).toHaveProperty('sessionId');
      expect(exchangeData).toHaveProperty('sessionToken');
    });

    it('deletes the state key after use', async () => {
      const { state } = await initiateGoogleAuth(env);
      await performCallback(env, { state });

      expect(env.OAUTH_SESSIONS._store.has(`state_${state}`)).toBe(false);
    });

    it('redirects with error=invalid_state when state param is missing', async () => {
      const request = new Request(
        'https://auth-worker.example.com/auth/google/callback?code=some-code'
      );
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('error=invalid_state');
    });

    it('redirects with error=invalid_state when state is not found in KV', async () => {
      const request = new Request(
        'https://auth-worker.example.com/auth/google/callback?code=some-code&state=nonexistent-state'
      );
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('error=invalid_state');
    });

    it('redirects with error=auth_failed when Google returns an OAuth error', async () => {
      const { state } = await initiateGoogleAuth(env);
      // Re-seed state since initiateGoogleAuth already consumed it via a GET
      env.OAUTH_SESSIONS._seed(`state_${state}`, JSON.stringify({
        createdAt: Date.now(),
        frontendOrigin: env.FRONTEND_URL,
      }));

      const request = new Request(
        `https://auth-worker.example.com/auth/google/callback?error=access_denied&state=${state}`
      );
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('error=auth_failed');
    });

    it('redirects with error=auth_failed when authorization code is missing', async () => {
      const { state } = await initiateGoogleAuth(env);
      env.OAUTH_SESSIONS._seed(`state_${state}`, JSON.stringify({
        createdAt: Date.now(),
        frontendOrigin: env.FRONTEND_URL,
      }));

      const request = new Request(
        `https://auth-worker.example.com/auth/google/callback?state=${state}`
      );
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('error=auth_failed');
    });

    it('redirects with error=not_authorized for non-whitelisted users', async () => {
      const { state } = await initiateGoogleAuth(env);
      global.fetch.mockImplementation(makeGoogleFetchMock({
        userInfo: {
          id: 'google-user-456',
          email: 'unauthorized@example.com',
          name: 'Unauthorized User',
        },
      }));

      const response = await performCallback(env, { state });

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('error=not_authorized');
    });

    it('redirects with error=not_authorized when whitelist is empty (null)', async () => {
      env.USER_WHITELIST._store.delete('users'); // remove default seed
      const { state } = await initiateGoogleAuth(env);
      const response = await performCallback(env, { state });

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('error=not_authorized');
    });

    it('redirects with error=not_authorized when whitelist JSON is malformed', async () => {
      env.USER_WHITELIST._store.set('users', 'not-valid-json');
      const { state } = await initiateGoogleAuth(env);
      const response = await performCallback(env, { state });

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('error=not_authorized');
    });

    it('redirects with error=auth_failed when Google token exchange fails', async () => {
      global.fetch.mockImplementation((url) => {
        if (url.includes('oauth2.googleapis.com/token')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ json: () => Promise.resolve({}) });
      });

      const { state } = await initiateGoogleAuth(env);
      const response = await performCallback(env, { state });

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('error=auth_failed');
    });

    it('redirects with error=auth_failed when Google userinfo fails', async () => {
      global.fetch.mockImplementation((url) => {
        if (url.includes('oauth2.googleapis.com/token')) {
          return Promise.resolve({ json: () => Promise.resolve({ access_token: 'tok' }) });
        }
        if (url.includes('googleapis.com/oauth2/v2/userinfo')) {
          return Promise.reject(new Error('Userinfo failed'));
        }
        return Promise.reject(new Error('Unmocked'));
      });

      const { state } = await initiateGoogleAuth(env);
      const response = await performCallback(env, { state });

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('error=auth_failed');
    });

    it('uses FRONTEND_URL as fallback when stored state is legacy format (plain string)', async () => {
      // Simulate legacy/corrupt state (not valid JSON) — must fall back gracefully
      const legacyState = 'legacy-state-uuid';
      env.OAUTH_SESSIONS._seed(`state_${legacyState}`, Date.now().toString());

      const request = new Request(
        `https://auth-worker.example.com/auth/google/callback?code=google-auth-code&state=${legacyState}`
      );
      const response = await worker.fetch(request, env);

      // Should still succeed and redirect with FRONTEND_URL as base
      const location = response.headers.get('Location');
      expect(location).toContain(env.FRONTEND_URL);
    });
  });

  // =========================================================================
  // /auth/exchange — single-use code exchange
  // =========================================================================

  describe('/auth/exchange — code exchange', () => {
    /**
     * Helper: run through full OAuth flow and extract the exchange code from
     * the callback redirect URL.
     */
    async function getExchangeCode() {
      const { state } = await initiateGoogleAuth(env);
      const response = await performCallback(env, { state });
      const location = response.headers.get('Location');
      const match = location.match(/code=([^&]+)/);
      return match ? match[1] : null;
    }

    it('returns {sessionId, token} for a valid exchange code', async () => {
      const code = await getExchangeCode();
      expect(code).toBeTruthy();

      const request = new Request(
        `https://auth-worker.example.com/auth/exchange?code=${code}`
      );
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('sessionId');
      expect(body).toHaveProperty('token');
    });

    it('deletes the exchange code after first use (single-use)', async () => {
      const code = await getExchangeCode();

      const request = new Request(
        `https://auth-worker.example.com/auth/exchange?code=${code}`
      );
      await worker.fetch(request, env);

      // KV entry should be gone
      expect(env.OAUTH_SESSIONS._store.has(`exchange_${code}`)).toBe(false);
    });

    it('returns 401 on replay attack (second use of same code)', async () => {
      const code = await getExchangeCode();

      const req = () => new Request(`https://auth-worker.example.com/auth/exchange?code=${code}`);
      // First use
      await worker.fetch(req(), env);
      // Second use — must be rejected
      const response = await worker.fetch(req(), env);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it('returns 401 for an unknown/expired exchange code', async () => {
      const request = new Request(
        'https://auth-worker.example.com/auth/exchange?code=totally-fake-code'
      );
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it('returns 400 when the code query param is missing', async () => {
      const request = new Request('https://auth-worker.example.com/auth/exchange');
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it('includes Cache-Control: no-store to prevent credential caching', async () => {
      const code = await getExchangeCode();
      const request = new Request(
        `https://auth-worker.example.com/auth/exchange?code=${code}`
      );
      const response = await worker.fetch(request, env);

      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });

    it('includes X-Content-Type-Options: nosniff', async () => {
      const code = await getExchangeCode();
      const request = new Request(
        `https://auth-worker.example.com/auth/exchange?code=${code}`
      );
      const response = await worker.fetch(request, env);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
  });

  // =========================================================================
  // /auth/verify — session verification (4 branches)
  // =========================================================================

  describe('/auth/verify — session verification', () => {
    it('returns {valid: true, user} for a valid session + token', async () => {
      const sessionData = {
        user: { id: 'u1', email: 'test@example.com', name: 'Test User' },
        token: 'correct-token',
        createdAt: Date.now(),
        expiresAt: Date.now() + 60_000,
      };
      env.OAUTH_SESSIONS._seed('sess-valid', JSON.stringify(sessionData));

      const request = new Request(
        'https://auth-worker.example.com/auth/verify?session=sess-valid&token=correct-token'
      );
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.valid).toBe(true);
      expect(body.user).toMatchObject({ email: 'test@example.com' });
    });

    it('returns 400 {valid: false, error: "Missing parameters"} when session is absent', async () => {
      const request = new Request(
        'https://auth-worker.example.com/auth/verify?token=some-token'
      );
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.valid).toBe(false);
      expect(body.error).toBe('Missing parameters');
    });

    it('returns 400 when token is absent', async () => {
      const request = new Request(
        'https://auth-worker.example.com/auth/verify?session=some-session'
      );
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.valid).toBe(false);
      expect(body.error).toBe('Missing parameters');
    });

    it('returns 404 {valid: false, error: "Session not found"} for unknown session', async () => {
      const request = new Request(
        'https://auth-worker.example.com/auth/verify?session=does-not-exist&token=any'
      );
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.valid).toBe(false);
      expect(body.error).toBe('Session not found');
    });

    it('returns 401 {valid: false, error: "Session expired"} and deletes the session', async () => {
      const expiredData = {
        user: { id: 'u2' },
        token: 'tok',
        expiresAt: Date.now() - 1000,
      };
      env.OAUTH_SESSIONS._seed('sess-expired', JSON.stringify(expiredData));

      const request = new Request(
        'https://auth-worker.example.com/auth/verify?session=sess-expired&token=tok'
      );
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.valid).toBe(false);
      expect(body.error).toBe('Session expired');
      // Session must be purged from KV
      expect(env.OAUTH_SESSIONS._store.has('sess-expired')).toBe(false);
    });

    it('returns 401 {valid: false, error: "Invalid token"} for a wrong token', async () => {
      const sessionData = {
        user: { id: 'u3' },
        token: 'correct-token',
        expiresAt: Date.now() + 60_000,
      };
      env.OAUTH_SESSIONS._seed('sess-badtoken', JSON.stringify(sessionData));

      const request = new Request(
        'https://auth-worker.example.com/auth/verify?session=sess-badtoken&token=wrong-token'
      );
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.valid).toBe(false);
      expect(body.error).toBe('Invalid token');
    });

    it('includes security headers on missing-params 400 response', async () => {
      const request = new Request(
        'https://auth-worker.example.com/auth/verify?session=x'
      );
      const response = await worker.fetch(request, env);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });

    it('includes security headers on valid 200 response', async () => {
      const sessionData = {
        user: { id: 'u4' },
        token: 'tok',
        expiresAt: Date.now() + 60_000,
      };
      env.OAUTH_SESSIONS._seed('sess-ok', JSON.stringify(sessionData));

      const request = new Request(
        'https://auth-worker.example.com/auth/verify?session=sess-ok&token=tok'
      );
      const response = await worker.fetch(request, env);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    });

    it('handles concurrent verify requests independently', async () => {
      const sessionData = {
        user: { id: 'u5', email: 'test@example.com' },
        token: 'shared-token',
        expiresAt: Date.now() + 60_000,
      };
      env.OAUTH_SESSIONS._seed('sess-concurrent', JSON.stringify(sessionData));

      const requests = Array.from({ length: 5 }, () =>
        worker.fetch(
          new Request('https://auth-worker.example.com/auth/verify?session=sess-concurrent&token=shared-token'),
          env
        )
      );
      const responses = await Promise.all(requests);

      for (const r of responses) {
        expect(r.status).toBe(200);
        const body = await r.json();
        expect(body.valid).toBe(true);
      }
    });
  });

  // =========================================================================
  // /auth/logout
  // =========================================================================

  describe('/auth/logout', () => {
    it('returns {success: true} and deletes the session', async () => {
      env.OAUTH_SESSIONS._seed('sess-to-delete', '{"user":{}}');

      const request = new Request(
        'https://auth-worker.example.com/auth/logout?session=sess-to-delete'
      );
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(env.OAUTH_SESSIONS._store.has('sess-to-delete')).toBe(false);
    });

    it('returns {success: true} even when no session param is provided', async () => {
      const request = new Request('https://auth-worker.example.com/auth/logout');
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      // KV delete should NOT have been called for a non-existent key
      expect(env.OAUTH_SESSIONS.delete).not.toHaveBeenCalled();
    });

    it('returns {success: true} even when KV delete throws', async () => {
      env.OAUTH_SESSIONS.delete.mockRejectedValueOnce(new Error('KV error'));

      const request = new Request(
        'https://auth-worker.example.com/auth/logout?session=any-session'
      );
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });

  // =========================================================================
  // /auth/test — health check
  // =========================================================================

  describe('/auth/test — health check', () => {
    it('returns 200 with {status: "OK"}', async () => {
      const request = new Request('https://auth-worker.example.com/auth/test');
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('OK');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('kvTest');
    });
  });

  // =========================================================================
  // Unknown routes — 404
  // =========================================================================

  describe('Unknown routes', () => {
    it('returns 404 "Not Found" for an unknown route', async () => {
      const request = new Request('https://auth-worker.example.com/unknown-route');
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Not Found');
    });

    it('returns 404 for /auth/unknown sub-path', async () => {
      const request = new Request('https://auth-worker.example.com/auth/unknown');
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(404);
    });
  });

  // =========================================================================
  // Error message non-disclosure (security)
  // =========================================================================

  describe('Error message non-disclosure', () => {
    it('does not expose internal error messages in 500 responses', async () => {
      env.GOOGLE_CLIENT_ID = undefined;
      const request = new Request('https://auth-worker.example.com/auth/google');
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(500);
      const body = await response.text();
      // Must be exactly "Internal Server Error" — no stack trace, no error.message
      expect(body).toBe('Internal Server Error');
    });

    it('does not expose error details in /auth/exchange 500 response', async () => {
      // Seed a corrupt exchange entry to trigger a JSON.parse error
      env.OAUTH_SESSIONS._seed('exchange_bad', 'not-valid-json');

      const request = new Request(
        'https://auth-worker.example.com/auth/exchange?code=bad'
      );
      const response = await worker.fetch(request, env);

      // Either 500 (parse error) or 401 (entry deleted before parse) —
      // the key requirement is no internal details leak.
      const body = await response.text();
      expect(body).not.toContain('SyntaxError');
      expect(body).not.toContain('at ');
    });

    it('does not expose error details in /auth/verify 500 response', async () => {
      // Seed corrupt JSON to trigger a parse error in handleVerifySession
      env.OAUTH_SESSIONS._seed('sess-corrupt', 'not-valid-json');

      const request = new Request(
        'https://auth-worker.example.com/auth/verify?session=sess-corrupt&token=any'
      );
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.valid).toBe(false);
      // error field should be a generic string — not a raw Error.message
      expect(body.error).toBe('Verification failed');
      // Must not contain JS engine noise
      expect(JSON.stringify(body)).not.toContain('SyntaxError');
    });
  });

  // =========================================================================
  // Production logging — minimal output (no console.log in production)
  // =========================================================================

  describe('Production mode logging', () => {
    it('does not call console.log in production mode', async () => {
      env.NODE_ENV = 'production';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const request = new Request('https://auth-worker.example.com/auth/google');
      await worker.fetch(request, env);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
