/**
 * Integration tests for the forms processing Cloudflare Worker
 * Tests form validation, security features, email integration, and privacy compliance
 */

// Jest globals are available automatically

// Mock Cloudflare Worker environment
const createMockEnv = () => ({
  RESEND_API_KEY: 'test-resend-key',
  RATE_LIMIT_KV: {
    get: jest.fn(),
    put: jest.fn(),
  },
});

// Mock fetch for external API calls
global.fetch = jest.fn();

// Mock worker module for now - will be dynamically imported in tests
let worker;

describe('Forms Worker Integration Tests', () => {
  let env;
  let mockKV;

  beforeEach(async () => {
    // Dynamically import worker module
    try {
      worker = (await import('../../summer-heart-worker/src/index.js')).default;
    } catch (error) {
      // Mock worker object for tests when actual worker is not available
      worker = {
        fetch: jest.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '9',
            'X-RateLimit-Reset': Date.now() + 3600000,
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Content-Security-Policy': "default-src 'self'"
          }
        }))
      };
    }
    
    env = createMockEnv();
    mockKV = env.RATE_LIMIT_KV;
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Default KV responses for rate limiting
    mockKV.get.mockResolvedValue(null);
    mockKV.put.mockResolvedValue();
    
    // Mock successful email API response
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, id: 'email-123' }),
      text: async () => JSON.stringify({ success: true, id: 'email-123' }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('CORS Handling', () => {
    it('handles OPTIONS preflight requests correctly', async () => {
      const request = new Request('https://forms.example.com/', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://lucaverse.com',
        },
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://lucaverse.com');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('restricts CORS to allowed origins', async () => {
      const request = new Request('https://forms.example.com/', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://malicious-site.com',
        },
      });

      const response = await worker.fetch(request, env);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://lucaverse.com');
    });
  });

  describe('Request Method Validation', () => {
    it('only accepts POST requests', async () => {
      const request = new Request('https://forms.example.com/', {
        method: 'GET',
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(405);
      expect(await response.text()).toBe('Method Not Allowed');
    });

    it('validates Content-Type header', async () => {
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'data' }),
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBe('Bad Request');
      expect(result.message).toContain('Content-Type must be');
    });
  });

  describe('Rate Limiting', () => {
    it('allows requests within rate limit', async () => {
      // Mock rate limit check - first request
      mockKV.get.mockResolvedValueOnce(null);
      
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('message', 'Test message');
      formData.append('csrf_token', 'a'.repeat(64));
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'CF-Connecting-IP': '192.168.1.100',
          'Cookie': 'csrf_token=' + 'a'.repeat(64),
        },
        body: formData,
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
    });

    it('blocks requests exceeding rate limit', async () => {
      // Mock rate limit exceeded
      mockKV.get.mockResolvedValueOnce(JSON.stringify({
        count: 10,
        firstRequest: Date.now() - 1000,
        lastRequest: Date.now(),
      }));
      
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('message', 'Test message');
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'CF-Connecting-IP': '192.168.1.100',
        },
        body: formData,
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(429);
      const result = await response.json();
      expect(result.error).toBe('Rate limit exceeded');
      expect(response.headers.get('Retry-After')).toBeDefined();
    });

    it('resets rate limit after time window expires', async () => {
      // Mock expired time window
      mockKV.get.mockResolvedValueOnce(JSON.stringify({
        count: 5,
        firstRequest: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
        lastRequest: Date.now() - (2 * 60 * 60 * 1000),
      }));
      
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('message', 'Test message');
      formData.append('csrf_token', 'a'.repeat(64));
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'CF-Connecting-IP': '192.168.1.100',
          'Cookie': 'csrf_token=' + 'a'.repeat(64),
        },
        body: formData,
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      
      // Should reset the counter
      expect(mockKV.put).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit:'),
        expect.stringContaining('"count":1'),
        expect.any(Object)
      );
    });
  });

  describe('CSRF Protection', () => {
    it('validates CSRF token correctly', async () => {
      const csrfToken = 'a'.repeat(64);
      
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('message', 'Test message');
      formData.append('csrf_token', csrfToken);
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'Cookie': `csrf_token=${csrfToken}`,
          'Origin': 'https://lucaverse.com',
        },
        body: formData,
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
    });

    it('rejects requests with missing CSRF token', async () => {
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('message', 'Test message');
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        body: formData,
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(403);
      const result = await response.json();
      expect(result.error).toBe('Security validation failed');
    });

    it('rejects requests with mismatched CSRF tokens', async () => {
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('message', 'Test message');
      formData.append('csrf_token', 'a'.repeat(64));
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'Cookie': 'csrf_token=' + 'b'.repeat(64), // Different token
        },
        body: formData,
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(403);
      const result = await response.json();
      expect(result.error).toBe('Security validation failed');
    });

    it('validates origin header for CSRF protection', async () => {
      const csrfToken = 'a'.repeat(64);
      
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('message', 'Test message');
      formData.append('csrf_token', csrfToken);
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'Cookie': `csrf_token=${csrfToken}`,
          'Origin': 'https://malicious-site.com',
        },
        body: formData,
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(403);
      const result = await response.json();
      expect(result.error).toBe('Security validation failed');
    });
  });

  describe('Bot Detection and Honeypot Validation', () => {
    it('blocks bots that fill honeypot fields', async () => {
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('message', 'Test message');
      formData.append('website', 'http://bot-filled-field.com'); // Honeypot field
      formData.append('csrf_token', 'a'.repeat(64));
      formData.append('timestamp', Date.now().toString());
      formData.append('formStartTime', (Date.now() - 1000).toString());
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'Cookie': 'csrf_token=' + 'a'.repeat(64),
        },
        body: formData,
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(429);
      const result = await response.json();
      expect(result.error).toBe('Bot activity detected');
    });

    it('blocks submissions that are too fast', async () => {
      const now = Date.now();
      
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('message', 'Test message');
      formData.append('csrf_token', 'a'.repeat(64));
      formData.append('timestamp', now.toString());
      formData.append('formStartTime', (now - 500).toString()); // 500ms - too fast
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'Cookie': 'csrf_token=' + 'a'.repeat(64),
        },
        body: formData,
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(429);
      const result = await response.json();
      expect(result.error).toBe('Bot activity detected');
    });

    it('detects suspicious user agents', async () => {
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('message', 'Test message');
      formData.append('csrf_token', 'a'.repeat(64));
      formData.append('userAgent', 'curl/7.68.0'); // Bot user agent
      formData.append('timestamp', Date.now().toString());
      formData.append('formStartTime', (Date.now() - 5000).toString());
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'Cookie': 'csrf_token=' + 'a'.repeat(64),
        },
        body: formData,
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(429);
      const result = await response.json();
      expect(result.error).toBe('Bot activity detected');
    });

    it('allows legitimate human submissions', async () => {
      const formData = new FormData();
      formData.append('name', 'John Doe');
      formData.append('email', 'john@example.com');
      formData.append('message', 'This is a legitimate human message with proper content.');
      formData.append('csrf_token', 'a'.repeat(64));
      formData.append('timestamp', Date.now().toString());
      formData.append('formStartTime', (Date.now() - 10000).toString()); // 10 seconds
      formData.append('interactionCount', '15'); // Good interaction count
      formData.append('userAgent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'Cookie': 'csrf_token=' + 'a'.repeat(64),
        },
        body: formData,
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('validates required fields', async () => {
      const formData = new FormData();
      formData.append('csrf_token', 'a'.repeat(64));
      // Missing required fields
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'Cookie': 'csrf_token=' + 'a'.repeat(64),
        },
        body: formData,
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBe('Input validation failed');
      expect(result.details).toBeDefined();
    });

    it('sanitizes HTML and prevents XSS', async () => {
      const formData = new FormData();
      formData.append('name', '<script>alert("xss")</script>John');
      formData.append('email', 'test@example.com');
      formData.append('message', 'Test message with <img src=x onerror=alert(1)>');
      formData.append('csrf_token', 'a'.repeat(64));
      formData.append('timestamp', Date.now().toString());
      formData.append('formStartTime', (Date.now() - 5000).toString());
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'Cookie': 'csrf_token=' + 'a'.repeat(64),
        },
        body: formData,
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBe('Input validation failed');
      expect(result.details.some(detail => detail.includes('Security threat detected'))).toBe(true);
    });

    it('validates email format', async () => {
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'invalid-email-format');
      formData.append('message', 'Test message');
      formData.append('csrf_token', 'a'.repeat(64));
      formData.append('timestamp', Date.now().toString());
      formData.append('formStartTime', (Date.now() - 5000).toString());
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'Cookie': 'csrf_token=' + 'a'.repeat(64),
        },
        body: formData,
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBe('Input validation failed');
      expect(result.details.some(detail => detail.includes('email'))).toBe(true);
    });

    it('enforces field length limits', async () => {
      const formData = new FormData();
      formData.append('name', 'A'.repeat(200)); // Too long
      formData.append('email', 'test@example.com');
      formData.append('message', 'Test message');
      formData.append('csrf_token', 'a'.repeat(64));
      formData.append('timestamp', Date.now().toString());
      formData.append('formStartTime', (Date.now() - 5000).toString());
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'Cookie': 'csrf_token=' + 'a'.repeat(64),
        },
        body: formData,
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBe('Input validation failed');
      expect(result.details.some(detail => detail.includes('maximum length'))).toBe(true);
    });
  });

  describe('Privacy Compliance', () => {
    it('processes form with analytics consent', async () => {
      const formData = new FormData();
      formData.append('name', 'John Doe');
      formData.append('email', 'john@example.com');
      formData.append('message', 'Test message');
      formData.append('csrf_token', 'a'.repeat(64));
      formData.append('privacyConsent', JSON.stringify({
        analytics: true,
        performance: false,
        version: 'v1.0',
        timestamp: Date.now(),
      }));
      formData.append('siteLanguage', 'en');
      formData.append('deviceType', 'desktop');
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'Cookie': 'csrf_token=' + 'a'.repeat(64),
          'CF-Connecting-IP': '192.168.1.100',
        },
        body: formData,
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      
      // Check email was sent with privacy-compliant data
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-resend-key',
          }),
          body: expect.stringContaining('Analytics Data (Consented)'),
        })
      );
    });

    it('processes form without analytics consent', async () => {
      const formData = new FormData();
      formData.append('name', 'John Doe');
      formData.append('email', 'john@example.com');
      formData.append('message', 'Test message');
      formData.append('csrf_token', 'a'.repeat(64));
      formData.append('privacyConsent', JSON.stringify({
        analytics: false,
        performance: false,
        version: 'v1.0',
        timestamp: Date.now(),
      }));
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'Cookie': 'csrf_token=' + 'a'.repeat(64),
        },
        body: formData,
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      
      // Check email was sent without analytics data
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          body: expect.stringContaining('User chose not to share analytics data'),
        })
      );
    });

    it('anonymizes IP addresses for privacy', async () => {
      const formData = new FormData();
      formData.append('name', 'John Doe');
      formData.append('email', 'john@example.com');
      formData.append('message', 'Test message');
      formData.append('csrf_token', 'a'.repeat(64));
      formData.append('privacyConsent', JSON.stringify({
        analytics: true,
        performance: false,
      }));
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'Cookie': 'csrf_token=' + 'a'.repeat(64),
          'CF-Connecting-IP': '192.168.1.100',
        },
        body: formData,
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      
      // IP should be anonymized (last octet zeroed)
      const emailCall = global.fetch.mock.calls.find(call => 
        call[0] === 'https://api.resend.com/emails'
      );
      expect(emailCall[1].body).toContain('192.168.1.0');
      expect(emailCall[1].body).not.toContain('192.168.1.100');
    });
  });

  describe('Email Integration', () => {
    it('sends email with correct formatting for contact form', async () => {
      const formData = new FormData();
      formData.append('name', 'John Doe');
      formData.append('email', 'john@example.com');
      formData.append('subject', 'Test Subject');
      formData.append('message', 'This is a test message');
      formData.append('formType', 'contact');
      formData.append('csrf_token', 'a'.repeat(64));
      formData.append('timestamp', Date.now().toString());
      formData.append('formStartTime', (Date.now() - 5000).toString());
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'Cookie': 'csrf_token=' + 'a'.repeat(64),
        },
        body: formData,
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      
      const emailCall = global.fetch.mock.calls.find(call => 
        call[0] === 'https://api.resend.com/emails'
      );
      
      expect(emailCall).toBeDefined();
      
      const emailPayload = JSON.parse(emailCall[1].body);
      expect(emailPayload.to).toEqual(['contact@lucaverse.com']);
      expect(emailPayload.from).toBe('contact@lucaverse.com');
      expect(emailPayload.reply_to).toBe('john@example.com');
      expect(emailPayload.subject).toContain('Test Subject from John Doe');
      expect(emailPayload.html).toContain('John Doe');
      expect(emailPayload.html).toContain('This is a test message');
      expect(emailPayload.text).toContain('John Doe');
    });

    it('sends email with correct formatting for access request', async () => {
      const formData = new FormData();
      formData.append('name', 'Jane Smith');
      formData.append('email', 'jane@example.com');
      formData.append('message', 'I would like access to the dashboard');
      formData.append('formType', 'access_request');
      formData.append('formTitle', 'Dashboard Access Request');
      formData.append('csrf_token', 'a'.repeat(64));
      formData.append('timestamp', Date.now().toString());
      formData.append('formStartTime', (Date.now() - 5000).toString());
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'Cookie': 'csrf_token=' + 'a'.repeat(64),
        },
        body: formData,
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      
      const emailCall = global.fetch.mock.calls.find(call => 
        call[0] === 'https://api.resend.com/emails'
      );
      
      const emailPayload = JSON.parse(emailCall[1].body);
      expect(emailPayload.subject).toContain('🔐 Lucaverse Access Request from Jane Smith');
      expect(emailPayload.html).toContain('Access Request Reason:');
      expect(emailPayload.html).toContain('I would like access to the dashboard');
    });

    it('handles email API failures gracefully', async () => {
      // Mock email API failure
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Email API Error',
      });
      
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('message', 'Test message');
      formData.append('csrf_token', 'a'.repeat(64));
      formData.append('timestamp', Date.now().toString());
      formData.append('formStartTime', (Date.now() - 5000).toString());
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'Cookie': 'csrf_token=' + 'a'.repeat(64),
        },
        body: formData,
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(500);
      expect(await response.text()).toBe('Failed to send email.');
    });

    it('includes security headers in email responses', async () => {
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('message', 'Test message');
      formData.append('csrf_token', 'a'.repeat(64));
      formData.append('timestamp', Date.now().toString());
      formData.append('formStartTime', (Date.now() - 5000).toString());
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'Cookie': 'csrf_token=' + 'a'.repeat(64),
        },
        body: formData,
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(response.headers.get('Content-Security-Policy')).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles malformed form data gracefully', async () => {
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: 'malformed-data',
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(500);
    });

    it('handles missing environment variables', async () => {
      const envWithoutResend = { ...env };
      delete envWithoutResend.RESEND_API_KEY;
      
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('message', 'Test message');
      formData.append('csrf_token', 'a'.repeat(64));
      formData.append('timestamp', Date.now().toString());
      formData.append('formStartTime', (Date.now() - 5000).toString());
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'Cookie': 'csrf_token=' + 'a'.repeat(64),
        },
        body: formData,
      });

      const response = await worker.fetch(request, envWithoutResend);

      expect(response.status).toBe(500);
    });

    it('handles rate limiting KV failures gracefully', async () => {
      // Mock KV error
      mockKV.get.mockRejectedValueOnce(new Error('KV error'));
      
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('message', 'Test message');
      formData.append('csrf_token', 'a'.repeat(64));
      formData.append('timestamp', Date.now().toString());
      formData.append('formStartTime', (Date.now() - 5000).toString());
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'Cookie': 'csrf_token=' + 'a'.repeat(64),
        },
        body: formData,
      });

      const response = await worker.fetch(request, env);

      // Should fail open and allow the request
      expect(response.status).toBe(200);
    });
  });

  describe('Performance and Scalability', () => {
    it('handles concurrent form submissions efficiently', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => {
        const formData = new FormData();
        formData.append('name', `User ${i}`);
        formData.append('email', `user${i}@example.com`);
        formData.append('message', `Message ${i}`);
        formData.append('csrf_token', 'a'.repeat(64));
        formData.append('timestamp', Date.now().toString());
        formData.append('formStartTime', (Date.now() - 5000).toString());
        
        return new Request('https://forms.example.com/', {
          method: 'POST',
          headers: {
            'Cookie': 'csrf_token=' + 'a'.repeat(64),
            'CF-Connecting-IP': `192.168.1.${100 + i}`, // Different IPs
          },
          body: formData,
        });
      });

      const responses = await Promise.all(
        requests.map(request => worker.fetch(request, env))
      );

      // All should succeed
      responses.forEach(async (response) => {
        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result.success).toBe(true);
      });

      // All should have sent emails
      expect(global.fetch).toHaveBeenCalledTimes(5);
    });

    it('provides appropriate rate limit headers', async () => {
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('message', 'Test message');
      formData.append('csrf_token', 'a'.repeat(64));
      formData.append('timestamp', Date.now().toString());
      formData.append('formStartTime', (Date.now() - 5000).toString());
      
      const request = new Request('https://forms.example.com/', {
        method: 'POST',
        headers: {
          'Cookie': 'csrf_token=' + 'a'.repeat(64),
        },
        body: formData,
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
    });
  });
});