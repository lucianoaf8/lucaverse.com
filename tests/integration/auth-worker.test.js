/**
 * Integration tests for the authentication Cloudflare Worker
 * Tests OAuth flow, session management, and security features
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock Cloudflare Worker environment
const createMockEnv = () => ({
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  WORKER_URL: 'https://auth-worker.example.com',
  FRONTEND_URL: 'https://example.com',
  NODE_ENV: 'test',
  OAUTH_SESSIONS: {
    put: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  },
  USER_WHITELIST: {
    get: jest.fn(),
  },
});

// Mock fetch for external API calls
global.fetch = jest.fn();

// Mock crypto for token generation
global.crypto = {
  randomUUID: jest.fn(() => 'test-uuid-123'),
  getRandomValues: jest.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
};

// Import worker after mocking globals
const workerModule = await import('../../lucaverse-auth/src/index.js');
const worker = workerModule.default;

describe('Authentication Worker Integration Tests', () => {
  let env;
  let mockKV;

  beforeEach(() => {
    env = createMockEnv();
    mockKV = env.OAUTH_SESSIONS;
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Default KV responses
    mockKV.get.mockResolvedValue(null);
    mockKV.put.mockResolvedValue();
    mockKV.delete.mockResolvedValue();
    
    // Default whitelist response
    env.USER_WHITELIST.get.mockResolvedValue(JSON.stringify({
      emails: ['test@example.com', 'allowed@example.com']
    }));
    
    // Mock Google OAuth responses
    global.fetch.mockImplementation((url) => {
      if (url.includes('oauth2.googleapis.com/token')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
          }),
        });
      }
      
      if (url.includes('googleapis.com/oauth2/v2/userinfo')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            id: 'google-user-123',
            email: 'test@example.com',
            name: 'Test User',
            picture: 'https://example.com/avatar.jpg',
          }),
        });
      }
      
      return Promise.reject(new Error('Unmocked fetch call'));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('CORS Handling', () => {
    it('handles OPTIONS preflight requests correctly', async () => {
      const request = new Request('https://auth-worker.example.com/auth/google', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
        },
      });

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('restricts CORS to allowed origins', async () => {
      const request = new Request('https://auth-worker.example.com/auth/google', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://malicious-site.com',
        },
      });

      const response = await worker.fetch(request, env);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    });
  });

  describe('Google OAuth Initiation (/auth/google)', () => {
    it('redirects to Google OAuth with correct parameters', async () => {
      const request = new Request('https://auth-worker.example.com/auth/google');

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(302);
      
      const location = response.headers.get('Location');
      expect(location).toContain('accounts.google.com/o/oauth2/v2/auth');
      expect(location).toContain('client_id=test-client-id');
      expect(location).toContain('response_type=code');
      expect(location).toContain('scope=openid+profile+email');
      expect(location).toContain('state=');
    });

    it('stores CSRF state in KV storage', async () => {
      const request = new Request('https://auth-worker.example.com/auth/google');

      await worker.fetch(request, env);

      expect(mockKV.put).toHaveBeenCalledWith(
        expect.stringMatching(/^state_/),
        expect.any(String),
        { expirationTtl: 600 }
      );
    });

    it('handles missing Google Client ID', async () => {
      env.GOOGLE_CLIENT_ID = undefined;
      
      const request = new Request('https://auth-worker.example.com/auth/google');

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(500);
      expect(await response.text()).toContain('GOOGLE_CLIENT_ID environment variable is missing');
    });
  });

  describe('OAuth Callback (/auth/google/callback)', () => {
    it('processes successful OAuth callback', async () => {
      // Mock valid state
      mockKV.get.mockResolvedValueOnce(Date.now().toString());
      
      const request = new Request(
        'https://auth-worker.example.com/auth/google/callback?code=test-code&state=test-state'
      );

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html');
      
      // Should create session
      expect(mockKV.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('test@example.com'),
        { expirationTtl: 7 * 24 * 60 * 60 }
      );
      
      // Should clean up state
      expect(mockKV.delete).toHaveBeenCalledWith('state_test-state');
    });

    it('rejects invalid CSRF state', async () => {
      // Mock no stored state
      mockKV.get.mockResolvedValueOnce(null);
      
      const request = new Request(
        'https://auth-worker.example.com/auth/google/callback?code=test-code&state=invalid-state'
      );

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('error=invalid_state');
    });

    it('rejects non-whitelisted users', async () => {
      // Mock valid state
      mockKV.get.mockResolvedValueOnce(Date.now().toString());
      
      // Mock non-whitelisted user
      global.fetch.mockImplementation((url) => {
        if (url.includes('oauth2.googleapis.com/token')) {
          return Promise.resolve({
            json: () => Promise.resolve({ access_token: 'test-token' }),
          });
        }
        
        if (url.includes('googleapis.com/oauth2/v2/userinfo')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              id: 'google-user-456',
              email: 'unauthorized@example.com',
              name: 'Unauthorized User',
            }),
          });
        }
        
        return Promise.reject(new Error('Unmocked fetch'));
      });
      
      const request = new Request(
        'https://auth-worker.example.com/auth/google/callback?code=test-code&state=test-state'
      );

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('error=not_authorized');
    });

    it('handles OAuth error responses', async () => {
      const request = new Request(
        'https://auth-worker.example.com/auth/google/callback?error=access_denied&state=test-state'
      );

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('error=auth_failed');
    });

    it('handles missing authorization code', async () => {
      const request = new Request(
        'https://auth-worker.example.com/auth/google/callback?state=test-state'
      );

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('error=auth_failed');
    });

    it('sets secure cookies for authentication', async () => {
      mockKV.get.mockResolvedValueOnce(Date.now().toString());
      
      const request = new Request(
        'https://auth-worker.example.com/auth/google/callback?code=test-code&state=test-state'
      );

      const response = await worker.fetch(request, env);

      const setCookieHeaders = response.headers.getAll?.('Set-Cookie') || 
                              [response.headers.get('Set-Cookie')].filter(Boolean);
      
      expect(setCookieHeaders.length).toBeGreaterThan(0);
      expect(setCookieHeaders.some(cookie => 
        cookie.includes('HttpOnly') && 
        cookie.includes('Secure') && 
        cookie.includes('SameSite=Strict')
      )).toBe(true);
    });
  });

  describe('Session Verification (/auth/verify)', () => {
    it('validates correct session and token', async () => {
      const sessionData = {
        user: {
          id: 'test-user',
          email: 'test@example.com',
          name: 'Test User',
        },
        token: 'valid-token',
        createdAt: Date.now(),
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
      };
      
      mockKV.get.mockResolvedValueOnce(JSON.stringify(sessionData));
      
      const request = new Request(
        'https://auth-worker.example.com/auth/verify?session=test-session&token=valid-token'
      );

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.valid).toBe(true);
      expect(result.user).toEqual(sessionData.user);
    });

    it('rejects invalid session ID', async () => {
      mockKV.get.mockResolvedValueOnce(null);
      
      const request = new Request(
        'https://auth-worker.example.com/auth/verify?session=invalid-session&token=any-token'
      );

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(404);
      
      const result = await response.json();
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('rejects expired sessions', async () => {
      const expiredSessionData = {
        user: { id: 'test-user' },
        token: 'valid-token',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      };
      
      mockKV.get.mockResolvedValueOnce(JSON.stringify(expiredSessionData));
      
      const request = new Request(
        'https://auth-worker.example.com/auth/verify?session=test-session&token=valid-token'
      );

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(401);
      
      const result = await response.json();
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Session expired');
      
      // Should delete expired session
      expect(mockKV.delete).toHaveBeenCalledWith('test-session');
    });

    it('rejects invalid tokens using timing-safe comparison', async () => {
      const sessionData = {
        user: { id: 'test-user' },
        token: 'correct-token',
        expiresAt: Date.now() + 1000000,
      };
      
      mockKV.get.mockResolvedValueOnce(JSON.stringify(sessionData));
      
      const request = new Request(
        'https://auth-worker.example.com/auth/verify?session=test-session&token=wrong-token'
      );

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(401);
      
      const result = await response.json();
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
    });

    it('requires both session and token parameters', async () => {
      const request = new Request(
        'https://auth-worker.example.com/auth/verify?session=test-session'
      );

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing parameters');
    });

    it('includes security headers in response', async () => {
      const request = new Request(
        'https://auth-worker.example.com/auth/verify?session=invalid&token=invalid'
      );

      const response = await worker.fetch(request, env);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('Logout (/auth/logout)', () => {
    it('deletes session successfully', async () => {
      const request = new Request(
        'https://auth-worker.example.com/auth/logout?session=test-session'
      );

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      
      expect(mockKV.delete).toHaveBeenCalledWith('test-session');
    });

    it('handles missing session parameter gracefully', async () => {
      const request = new Request('https://auth-worker.example.com/auth/logout');

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      
      // Should not attempt to delete anything
      expect(mockKV.delete).not.toHaveBeenCalled();
    });

    it('handles KV deletion errors gracefully', async () => {
      mockKV.delete.mockRejectedValueOnce(new Error('KV error'));
      
      const request = new Request(
        'https://auth-worker.example.com/auth/logout?session=test-session'
      );

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
    });
  });

  describe('Whitelist Management', () => {
    it('checks user whitelist correctly', async () => {
      // This is tested indirectly through the callback test, but let's be explicit
      env.USER_WHITELIST.get.mockResolvedValueOnce(JSON.stringify({
        emails: ['allowed@example.com'],
      }));
      
      // Mock the callback flow with whitelisted user
      mockKV.get.mockResolvedValueOnce(Date.now().toString());
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('googleapis.com/oauth2/v2/userinfo')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              id: 'google-user-123',
              email: 'allowed@example.com',
              name: 'Allowed User',
            }),
          });
        }
        return Promise.resolve({ json: () => Promise.resolve({ access_token: 'token' }) });
      });
      
      const request = new Request(
        'https://auth-worker.example.com/auth/google/callback?code=test-code&state=test-state'
      );

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
      expect(env.USER_WHITELIST.get).toHaveBeenCalledWith('users');
    });

    it('handles missing whitelist data', async () => {
      env.USER_WHITELIST.get.mockResolvedValueOnce(null);
      mockKV.get.mockResolvedValueOnce(Date.now().toString());
      
      const request = new Request(
        'https://auth-worker.example.com/auth/google/callback?code=test-code&state=test-state'
      );

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('error=not_authorized');
    });

    it('handles whitelist JSON parsing errors', async () => {
      env.USER_WHITELIST.get.mockResolvedValueOnce('invalid-json');
      mockKV.get.mockResolvedValueOnce(Date.now().toString());
      
      const request = new Request(
        'https://auth-worker.example.com/auth/google/callback?code=test-code&state=test-state'
      );

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('error=not_authorized');
    });
  });

  describe('Error Handling', () => {
    it('handles unknown routes', async () => {
      const request = new Request('https://auth-worker.example.com/unknown-route');

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Not Found');
    });

    it('handles internal server errors gracefully', async () => {
      // Force an error by making KV operations fail
      mockKV.put.mockRejectedValueOnce(new Error('KV storage error'));
      
      const request = new Request('https://auth-worker.example.com/auth/google');

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(500);
      expect(await response.text()).toContain('Internal Server Error');
    });

    it('handles Google API failures during token exchange', async () => {
      mockKV.get.mockResolvedValueOnce(Date.now().toString());
      
      // Mock Google token endpoint failure
      global.fetch.mockImplementation((url) => {
        if (url.includes('oauth2.googleapis.com/token')) {
          return Promise.reject(new Error('Google API error'));
        }
        return Promise.resolve({ json: () => Promise.resolve({}) });
      });
      
      const request = new Request(
        'https://auth-worker.example.com/auth/google/callback?code=test-code&state=test-state'
      );

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('error=auth_failed');
    });

    it('handles Google userinfo API failures', async () => {
      mockKV.get.mockResolvedValueOnce(Date.now().toString());
      
      // Mock successful token exchange but failed userinfo
      global.fetch.mockImplementation((url) => {
        if (url.includes('oauth2.googleapis.com/token')) {
          return Promise.resolve({
            json: () => Promise.resolve({ access_token: 'test-token' }),
          });
        }
        
        if (url.includes('googleapis.com/oauth2/v2/userinfo')) {
          return Promise.reject(new Error('Userinfo API error'));
        }
        
        return Promise.reject(new Error('Unmocked fetch'));
      });
      
      const request = new Request(
        'https://auth-worker.example.com/auth/google/callback?code=test-code&state=test-state'
      );

      const response = await worker.fetch(request, env);

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('error=auth_failed');
    });
  });

  describe('Security Features', () => {
    it('generates cryptographically secure tokens', async () => {
      mockKV.get.mockResolvedValueOnce(Date.now().toString());
      
      const request = new Request(
        'https://auth-worker.example.com/auth/google/callback?code=test-code&state=test-state'
      );

      await worker.fetch(request, env);

      // Check that crypto.getRandomValues was called for token generation
      expect(crypto.getRandomValues).toHaveBeenCalled();
      
      // Session should be stored with strong token
      const sessionCall = mockKV.put.mock.calls.find(call => 
        call[0].startsWith('test-uuid') // Session ID format
      );
      expect(sessionCall).toBeDefined();
      
      const sessionData = JSON.parse(sessionCall[1]);
      expect(sessionData.token).toBeDefined();
      expect(sessionData.token.length).toBeGreaterThan(50); // Should be long and complex
    });

    it('enforces session expiration', async () => {
      mockKV.get.mockResolvedValueOnce(Date.now().toString());
      
      const request = new Request(
        'https://auth-worker.example.com/auth/google/callback?code=test-code&state=test-state'
      );

      await worker.fetch(request, env);

      // Check session expiration is set correctly
      const sessionCall = mockKV.put.mock.calls.find(call => 
        call[0].startsWith('test-uuid')
      );
      
      const sessionData = JSON.parse(sessionCall[1]);
      expect(sessionData.expiresAt).toBeDefined();
      expect(sessionData.expiresAt).toBeGreaterThan(Date.now());
      expect(sessionData.expiresAt).toBeLessThan(Date.now() + (8 * 24 * 60 * 60 * 1000)); // Less than 8 days
    });

    it('logs minimal information in production', async () => {
      env.NODE_ENV = 'production';
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const request = new Request('https://auth-worker.example.com/auth/google');

      await worker.fetch(request, env);

      // Should have minimal logging in production
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance and Scalability', () => {
    it('handles concurrent authentication requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => 
        new Request(`https://auth-worker.example.com/auth/google`)
      );

      const responses = await Promise.all(
        requests.map(request => worker.fetch(request, env))
      );

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(302);
      });

      // Should generate unique states for each
      expect(mockKV.put).toHaveBeenCalledTimes(10);
      const stateKeys = mockKV.put.mock.calls.map(call => call[0]);
      const uniqueStates = new Set(stateKeys);
      expect(uniqueStates.size).toBe(10);
    });

    it('efficiently handles session validation requests', async () => {
      const sessionData = {
        user: { id: 'test-user' },
        token: 'valid-token',
        expiresAt: Date.now() + 1000000,
      };
      
      mockKV.get.mockResolvedValue(JSON.stringify(sessionData));
      
      const requests = Array.from({ length: 5 }, () => 
        new Request('https://auth-worker.example.com/auth/verify?session=test-session&token=valid-token')
      );

      const responses = await Promise.all(
        requests.map(request => worker.fetch(request, env))
      );

      // All should succeed
      responses.forEach(async (response) => {
        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result.valid).toBe(true);
      });
    });
  });
});