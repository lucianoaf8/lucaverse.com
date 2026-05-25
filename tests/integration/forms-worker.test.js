/**
 * Integration tests for the forms processing Cloudflare Worker
 * (summer-heart-worker/index.js).
 *
 * Every test drives real worker code via worker.fetch(request, env).
 * The only external boundary mock is the Resend API — the worker calls
 * fetch('https://api.resend.com/emails', ...) which we intercept via
 * global.fetch so no real network traffic is generated.
 *
 * Running in the Node environment (not jsdom) gives us the real Node 26
 * built-in Web API globals (Request, Response, FormData, Headers) that
 * the worker requires.  The jsdom environment does not expose these.
 *
 * jest.setup.js (setupFilesAfterEnv) overwrites global.Request / global.Response
 * with toy mock classes.  We restore the native Node 26 globals — captured in
 * setup/save-web-apis.js BEFORE setupFilesAfterEnv runs — at module scope and
 * in beforeEach so every test uses standards-compliant objects.
 *
 * @jest-environment node
 */

const {
  nativeRequest,
  nativeResponse,
  nativeFormData,
  nativeHeaders,
} = require('../setup/save-web-apis');

// Restore native globals at module scope so buildValidRequest() and other
// module-level helpers use the real Request/Response/FormData constructors.
global.Request  = nativeRequest;
global.Response = nativeResponse;
global.FormData = nativeFormData;
global.Headers  = nativeHeaders;

// Worker is loaded once for the whole suite.
let worker;

beforeAll(async () => {
  // Ensure globals are still correct when the module is imported
  // (jest may re-apply setup between beforeAll and the first test).
  global.Request  = nativeRequest;
  global.Response = nativeResponse;
  global.FormData = nativeFormData;
  global.Headers  = nativeHeaders;

  // babel-jest transforms `export default { ... }` to CommonJS interop;
  // .default gives us the actual exported object.
  const mod = await import('../../summer-heart-worker/index.js');
  worker = mod.default;
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * 64 lower-hex characters — satisfies the worker's CSRF token regex.
 */
const VALID_CSRF_TOKEN = 'a'.repeat(64);

/**
 * Build a multipart POST request that passes every security gate the worker
 * applies (Content-Type, rate limit, CSRF, honeypot, field validation).
 * Pass `overrides` to selectively break individual gates for negative tests.
 */
function buildValidRequest(overrides = {}) {
  const csrfToken = overrides.csrf_token ?? VALID_CSRF_TOKEN;

  const fd = new FormData();
  fd.append('name',    overrides.name    ?? 'John Doe');
  fd.append('email',   overrides.email   ?? 'john@example.com');
  fd.append('message', overrides.message ?? 'This is a valid test message.');

  if (overrides.subject    !== undefined) fd.append('subject',    overrides.subject);
  if (overrides.formType   !== undefined) fd.append('formType',   overrides.formType);
  if (overrides.formTitle  !== undefined) fd.append('formTitle',  overrides.formTitle);

  // Always include the CSRF token in the form body
  fd.append('csrf_token', csrfToken);

  // Optional bot-detection fields — only appended when the caller provides them
  const optionalBotFields = [
    'timestamp', 'formStartTime', 'interactionCount',
    'userAgent', 'website', 'submissionCount',
  ];
  for (const key of optionalBotFields) {
    if (overrides[key] !== undefined) fd.append(key, overrides[key]);
  }

  if (overrides.privacyConsent !== undefined) {
    fd.append('privacyConsent', JSON.stringify(overrides.privacyConsent));
  }

  // Merge caller-supplied headers; always include CSRF cookie
  const mergedHeaders = {
    'Cookie': `csrf_token=${csrfToken}`,
    ...(overrides.headers ?? {}),
  };

  return new Request('https://forms.lucaverse.com/', {
    method:  'POST',
    headers: mergedHeaders,
    body:    fd,
  });
}

/**
 * Minimal in-memory KV namespace (Cloudflare Workers KV interface).
 * Storage is a plain Map so tests can pre-seed it with env.RATE_LIMIT_KV._store.
 */
function createKVNamespace() {
  const store = new Map();
  return {
    _store: store,
    get: jest.fn(async (key, format) => {
      const raw = store.get(key) ?? null;
      if (raw === null) return null;
      return format === 'json' ? JSON.parse(raw) : raw;
    }),
    put: jest.fn(async (key, value) => { store.set(key, value); }),
  };
}

/** Env object matching what the worker reads from its bindings. */
function createEnv(overrides = {}) {
  return {
    RESEND_API_KEY: 'test-resend-key',
    RATE_LIMIT_KV:  createKVNamespace(),
    ...overrides,
  };
}

/** Stub a successful Resend API call. */
function mockResendSuccess() {
  global.fetch = jest.fn().mockResolvedValue(
    new Response(JSON.stringify({ id: 'email-123' }), {
      status:  200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

/** Stub a failed Resend API call. */
function mockResendFailure() {
  global.fetch = jest.fn().mockResolvedValue(
    new Response('Internal Server Error', { status: 500 })
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Forms Worker Integration Tests', () => {
  beforeEach(() => {
    // Re-apply native globals each test in case jest or afterEach restored mocks
    global.Request  = nativeRequest;
    global.Response = nativeResponse;
    global.FormData = nativeFormData;
    global.Headers  = nativeHeaders;

    mockResendSuccess();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  describe('CORS Handling', () => {
    it('returns 204 for OPTIONS preflight with an allowed origin', async () => {
      const request = new Request('https://forms.lucaverse.com/', {
        method:  'OPTIONS',
        headers: { 'Origin': 'https://lucaverse.com' },
      });

      const response = await worker.fetch(request, createEnv());

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://lucaverse.com');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
    });

    it('echoes localhost:5155 origin in CORS headers for development requests', async () => {
      const request = new Request('https://forms.lucaverse.com/', {
        method:  'OPTIONS',
        headers: { 'Origin': 'http://localhost:5155' },
      });

      const response = await worker.fetch(request, createEnv());

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5155');
    });

    it('falls back to lucaverse.com when origin is not in the allowed list', async () => {
      const request = new Request('https://forms.lucaverse.com/', {
        method:  'OPTIONS',
        headers: { 'Origin': 'https://attacker.example.com' },
      });

      const response = await worker.fetch(request, createEnv());

      // Worker returns the fallback, not the caller's disallowed origin
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://lucaverse.com');
    });
  });

  // -------------------------------------------------------------------------
  describe('HTTP Method Validation', () => {
    it('rejects GET requests with 405 Method Not Allowed', async () => {
      const request = new Request('https://forms.lucaverse.com/', { method: 'GET' });

      const response = await worker.fetch(request, createEnv());

      expect(response.status).toBe(405);
      expect(await response.text()).toBe('Method Not Allowed');
    });

    it('rejects PUT requests with 405', async () => {
      const request = new Request('https://forms.lucaverse.com/', {
        method: 'PUT',
        body:   'anything',
      });

      const response = await worker.fetch(request, createEnv());

      expect(response.status).toBe(405);
    });

    it('rejects POST with application/json Content-Type with 400', async () => {
      const request = new Request('https://forms.lucaverse.com/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: 'Test' }),
      });

      const response = await worker.fetch(request, createEnv());

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Bad Request');
      expect(body.message).toContain('Content-Type must be');
    });

    it('passes the content-type check for application/x-www-form-urlencoded', async () => {
      // Verify the worker does NOT return 400 for this content-type.
      // The request will still fail at CSRF (403), but not at the content-type gate (400).
      const request = new Request('https://forms.lucaverse.com/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    'name=Test',
      });

      const response = await worker.fetch(request, createEnv());

      expect(response.status).not.toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  describe('Rate Limiting (RATE_LIMIT_KV bound)', () => {
    it('allows first request and stores count=1 in KV', async () => {
      const env     = createEnv();
      const request = buildValidRequest();

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      expect(env.RATE_LIMIT_KV.put).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit:'),
        expect.stringContaining('"count":1'),
        expect.any(Object)
      );
    });

    it('blocks with 429 when count >= maxRequests (10) within the time window', async () => {
      const env = createEnv();
      const now = Date.now();

      // Pre-seed KV: window is active and limit is already reached
      env.RATE_LIMIT_KV._store.set(
        'rate_limit:unknown',
        JSON.stringify({ count: 10, firstRequest: now - 1000, lastRequest: now })
      );

      // A minimal POST — CSRF would fail, but rate limit check comes first
      const request = new Request('https://forms.lucaverse.com/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    'name=Test',
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.error).toBe('Rate limit exceeded');
      expect(body.message).toContain('Too many requests');
      expect(response.headers.get('Retry-After')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    });

    it('resets counter to 1 when the time window has expired', async () => {
      const env = createEnv();
      const TWO_HOURS_AGO = Date.now() - (2 * 60 * 60 * 1000);

      // Stale window (count 9, window elapsed — should reset)
      env.RATE_LIMIT_KV._store.set(
        'rate_limit:unknown',
        JSON.stringify({ count: 9, firstRequest: TWO_HOURS_AGO, lastRequest: TWO_HOURS_AGO })
      );

      const request = buildValidRequest();
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      expect(env.RATE_LIMIT_KV.put).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit:'),
        expect.stringContaining('"count":1'),
        expect.any(Object)
      );
    });

    it('fails open (allows request) when KV.get throws an error', async () => {
      const env = createEnv();
      env.RATE_LIMIT_KV.get = jest.fn().mockRejectedValue(new Error('KV unavailable'));

      const response = await worker.fetch(buildValidRequest(), env);

      // Fail-open: rate limiting error does not block the request
      expect(response.status).toBe(200);
    });

    it('skips rate limiting entirely when RATE_LIMIT_KV is not bound', async () => {
      const env = createEnv({ RATE_LIMIT_KV: undefined });

      const response = await worker.fetch(buildValidRequest(), env);

      expect(response.status).toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  describe('CSRF Protection', () => {
    it('accepts a valid request with matching form token and cookie (64 hex chars)', async () => {
      const response = await worker.fetch(buildValidRequest(), createEnv());

      expect(response.status).toBe(200);
    });

    it('returns 403 when csrf_token is absent from both form body and cookie', async () => {
      const fd = new FormData();
      fd.append('name',    'Test User');
      fd.append('email',   'test@example.com');
      fd.append('message', 'Hello world');
      // No csrf_token in body, no Cookie header

      const request = new Request('https://forms.lucaverse.com/', {
        method: 'POST',
        body:   fd,
      });

      const response = await worker.fetch(request, createEnv());

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Security validation failed');
    });

    it('returns 403 when form token does not match cookie token', async () => {
      const fd = new FormData();
      fd.append('name',       'Test User');
      fd.append('email',      'test@example.com');
      fd.append('message',    'Hello world');
      fd.append('csrf_token', 'a'.repeat(64)); // form token

      const request = new Request('https://forms.lucaverse.com/', {
        method:  'POST',
        headers: { 'Cookie': `csrf_token=${'b'.repeat(64)}` }, // different cookie
        body:    fd,
      });

      const response = await worker.fetch(request, createEnv());

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Security validation failed');
      expect(body.message).toContain('Invalid CSRF token');
    });

    it('returns 403 when CSRF token does not match 64-hex-char format', async () => {
      const badToken = 'not-hex-and-too-short';
      const fd       = new FormData();
      fd.append('name',       'Test User');
      fd.append('email',      'test@example.com');
      fd.append('message',    'Hello world');
      fd.append('csrf_token', badToken);

      const request = new Request('https://forms.lucaverse.com/', {
        method:  'POST',
        headers: { 'Cookie': `csrf_token=${badToken}` },
        body:    fd,
      });

      const response = await worker.fetch(request, createEnv());

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toContain('Malformed CSRF token');
    });

    it('returns 403 when Origin header is not in the allowed-origins list', async () => {
      const token = 'a'.repeat(64);
      const fd    = new FormData();
      fd.append('name',       'Test User');
      fd.append('email',      'test@example.com');
      fd.append('message',    'Hello world');
      fd.append('csrf_token', token);

      const request = new Request('https://forms.lucaverse.com/', {
        method:  'POST',
        headers: {
          'Cookie': `csrf_token=${token}`,
          'Origin': 'https://evil.example.com',
        },
        body: fd,
      });

      const response = await worker.fetch(request, createEnv());

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toContain('Invalid origin');
    });
  });

  // -------------------------------------------------------------------------
  describe('Bot Detection (honeypot + suspicion scoring)', () => {
    /**
     * Scoring rules (from source — validateHoneypotFields):
     *
     *  Honeypot field filled (pattern match) → score +10
     *  Submission time < 3000ms             → score +8
     *  else if < 1000ms (unreachable when < 3000) → +15  [dead branch]
     *  submissionCount > 3                  → score +5
     *  Missing > 1 required field           → score +(missingCount × 3)
     *  Suspicious userAgent keyword         → score +7
     *  interactionCount < 5                 → score +3
     *
     * Block threshold: score >= 10 OR indicators.length >= 2
     */

    it('blocks when honeypot field "website" is filled (score = 10)', async () => {
      const request = buildValidRequest({ website: 'http://bot-spam.example.com' });

      const response = await worker.fetch(request, createEnv());

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.error).toBe('Bot activity detected');
    });

    it('blocks when two indicators are present even if individual scores < 10', async () => {
      // curl UA → score +7, indicator 1
      // interactionCount 2 (< 5) → score +3, indicator 2
      // Total: score 10, indicators 2 → blocked (both conditions met)
      const request = buildValidRequest({
        userAgent:        'curl/7.68.0',
        interactionCount: '2',
      });

      const response = await worker.fetch(request, createEnv());

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.error).toBe('Bot activity detected');
    });

    it('does not block when only one indicator is present and score < 10', async () => {
      // Only indicator: curl UA → score 7, indicators 1
      // isBot = (7 >= 10 || 1 >= 2) = false → allowed
      const request = buildValidRequest({ userAgent: 'curl/7.68.0' });

      const response = await worker.fetch(request, createEnv());

      expect(response.status).toBe(200);
    });

    it('allows a fully legitimate submission with no bot signals', async () => {
      const request = buildValidRequest({
        timestamp:        Date.now().toString(),
        formStartTime:    (Date.now() - 15000).toString(), // 15 s — above 3000ms threshold
        interactionCount: '20',
        userAgent:        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      });

      const response = await worker.fetch(request, createEnv());

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe('Input Validation and Sanitization', () => {
    it('returns 400 when the required email field is absent', async () => {
      const fd = new FormData();
      // email intentionally omitted
      fd.append('message',    'Hello there');
      fd.append('csrf_token', VALID_CSRF_TOKEN);

      const request = new Request('https://forms.lucaverse.com/', {
        method:  'POST',
        headers: { 'Cookie': `csrf_token=${VALID_CSRF_TOKEN}` },
        body:    fd,
      });

      const response = await worker.fetch(request, createEnv());

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Input validation failed');
      expect(body.details).toBeDefined();
      expect(body.details.some(d => d.includes('email'))).toBe(true);
    });

    it('returns 400 when the required message field is absent', async () => {
      const fd = new FormData();
      fd.append('email',      'user@example.com');
      // message intentionally omitted
      fd.append('csrf_token', VALID_CSRF_TOKEN);

      const request = new Request('https://forms.lucaverse.com/', {
        method:  'POST',
        headers: { 'Cookie': `csrf_token=${VALID_CSRF_TOKEN}` },
        body:    fd,
      });

      const response = await worker.fetch(request, createEnv());

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Input validation failed');
    });

    it('returns 400 and flags security threat when name contains a <script> tag', async () => {
      const request = buildValidRequest({ name: '<script>alert("xss")</script>' });

      const response = await worker.fetch(request, createEnv());

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Input validation failed');
      expect(body.details.some(d => d.toLowerCase().includes('security threat'))).toBe(true);
    });

    it('returns 400 when the email value is not a valid address', async () => {
      const request = buildValidRequest({ email: 'not-an-email-at-all' });

      const response = await worker.fetch(request, createEnv());

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Input validation failed');
      expect(body.details.some(d => d.includes('email'))).toBe(true);
    });

    it('returns 400 when name exceeds the 100-character maximum', async () => {
      const request = buildValidRequest({ name: 'A'.repeat(101) });

      const response = await worker.fetch(request, createEnv());

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Input validation failed');
      expect(body.details.some(d => d.includes('maximum length'))).toBe(true);
    });

    it('returns 400 when message exceeds the 10000-character maximum', async () => {
      const request = buildValidRequest({ message: 'x'.repeat(10001) });

      const response = await worker.fetch(request, createEnv());

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Input validation failed');
      expect(body.details.some(d => d.includes('maximum length'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe('Email Integration (Resend API boundary)', () => {
    it('returns 200 with success:true and correct message for a contact form', async () => {
      const response = await worker.fetch(
        buildValidRequest({ formType: 'contact' }),
        createEnv()
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe('Message sent successfully!');
    });

    it('sends correctly shaped payload to Resend for a contact form', async () => {
      await worker.fetch(
        buildValidRequest({
          name:     'John Doe',
          email:    'john@example.com',
          subject:  'Test Subject',
          message:  'This is a test message',
          formType: 'contact',
        }),
        createEnv()
      );

      const resendCall = global.fetch.mock.calls.find(
        ([url]) => url === 'https://api.resend.com/emails'
      );
      expect(resendCall).toBeDefined();

      const payload = JSON.parse(resendCall[1].body);
      expect(payload.to).toEqual(['contact@lucaverse.com']);
      expect(payload.from).toBe('contact@lucaverse.com');
      expect(payload.reply_to).toBe('john@example.com');
      expect(payload.subject).toContain('John Doe');
      expect(payload.html).toContain('This is a test message');
      expect(payload.text).toContain('PORTFOLIO CONTACT MESSAGE');
      expect(resendCall[1].headers['Authorization']).toBe('Bearer test-resend-key');
    });

    it('returns 200 with access-request success message for formType=access_request', async () => {
      const response = await worker.fetch(
        buildValidRequest({ formType: 'access_request' }),
        createEnv()
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe('Access request submitted successfully!');
    });

    it('sends correctly shaped payload to Resend for an access_request form', async () => {
      await worker.fetch(
        buildValidRequest({
          name:      'Jane Smith',
          email:     'jane@example.com',
          message:   'I would like access to the dashboard.',
          formType:  'access_request',
          formTitle: 'Dashboard Access',
        }),
        createEnv()
      );

      const resendCall = global.fetch.mock.calls.find(
        ([url]) => url === 'https://api.resend.com/emails'
      );
      const payload = JSON.parse(resendCall[1].body);
      expect(payload.subject).toContain('Lucaverse Access Request from Jane Smith');
      expect(payload.html).toContain('Access Request Reason:');
      expect(payload.text).toContain('LUCAVERSE ACCESS REQUEST');
    });

    it('returns 500 with "Failed to send email." when Resend responds non-ok', async () => {
      mockResendFailure();

      const response = await worker.fetch(buildValidRequest(), createEnv());

      expect(response.status).toBe(500);
      expect(await response.text()).toBe('Failed to send email.');
    });

    it('includes security headers in the 200 success response', async () => {
      const response = await worker.fetch(buildValidRequest(), createEnv());

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(response.headers.get('Content-Security-Policy')).toBeDefined();
    });

    it('includes X-RateLimit-* headers in the 200 success response', async () => {
      const response = await worker.fetch(buildValidRequest(), createEnv());

      expect(response.status).toBe(200);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  describe('Privacy Compliance (consent-gated analytics)', () => {
    it('includes analytics section in email body when analytics consent = true', async () => {
      const request = buildValidRequest({
        privacyConsent: { analytics: true, performance: false, version: 'v1.0', timestamp: Date.now() },
        headers: {
          'Cookie':           `csrf_token=${VALID_CSRF_TOKEN}`,
          'CF-Connecting-IP': '10.0.0.1',
        },
      });

      await worker.fetch(request, createEnv());

      const resendCall = global.fetch.mock.calls.find(
        ([url]) => url === 'https://api.resend.com/emails'
      );
      const payload = JSON.parse(resendCall[1].body);
      expect(payload.text).toContain('ANALYTICS DATA (CONSENTED)');
    });

    it('omits analytics data in email body when analytics consent = false', async () => {
      const request = buildValidRequest({
        privacyConsent: { analytics: false, performance: false, version: 'v1.0', timestamp: Date.now() },
      });

      await worker.fetch(request, createEnv());

      const resendCall = global.fetch.mock.calls.find(
        ([url]) => url === 'https://api.resend.com/emails'
      );
      const payload = JSON.parse(resendCall[1].body);
      expect(payload.text).toContain('User chose not to share analytics data');
      expect(payload.text).not.toContain('ANALYTICS DATA (CONSENTED)');
    });

    it('anonymizes IPv4 (zeroes last octet) in email body when analytics consent = true', async () => {
      const request = buildValidRequest({
        privacyConsent: { analytics: true, performance: false },
        headers: {
          'Cookie':           `csrf_token=${VALID_CSRF_TOKEN}`,
          'CF-Connecting-IP': '192.168.1.100',
        },
      });

      await worker.fetch(request, createEnv());

      const resendCall = global.fetch.mock.calls.find(
        ([url]) => url === 'https://api.resend.com/emails'
      );
      const payload = JSON.parse(resendCall[1].body);
      expect(payload.text).toContain('192.168.1.0');
      expect(payload.text).not.toContain('192.168.1.100');
    });
  });
});
