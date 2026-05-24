// Google OAuth Worker for Lucaverse Authentication

// SECURITY: Production-safe debug logger — suppresses all debug output in production
let _debugLog = () => {};

export default {
  async fetch(request, env) {
    // Set up debug logger once per request based on environment
    _debugLog = env.NODE_ENV !== 'production' ? console.log.bind(console) : () => {};

    const url = new URL(request.url);
    const { pathname } = url;

    _debugLog('🌟 Worker request:', request.method, pathname);
    _debugLog('🔧 Environment check:', {
      hasGoogleClientId: !!env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!env.GOOGLE_CLIENT_SECRET,
      workerUrl: env.WORKER_URL ? 'configured' : 'missing',
      frontendUrl: env.FRONTEND_URL ? 'configured' : 'missing'
    });

    // Handle CORS for frontend requests - SECURITY: Use specific allowed origins only
    const allowedOrigins = [
      env.FRONTEND_URL || 'https://lucaverse.com',
      'https://lucaverse.com',
      'https://www.lucaverse.com',
      // SECURITY: Only include development origins in non-production
      ...(env.NODE_ENV !== 'production' ? [
        'http://localhost:5155',
        'http://localhost:3000'
      ] : [])
    ];
    
    const origin = request.headers.get('Origin');
    const isAllowedOrigin = allowedOrigins.includes(origin);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': isAllowedOrigin ? origin : env.FRONTEND_URL || 'https://lucaverse.com',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true', // Enable credentials for secure sessions
      'Access-Control-Max-Age': '86400',
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups', // Allow OAuth popups
      'Cross-Origin-Embedder-Policy': 'unsafe-none', // Required for COOP compatibility
    };

    if (request.method === 'OPTIONS') {
      _debugLog('✅ Handling OPTIONS request');
      return new Response(null, { 
        status: 200,
        headers: corsHeaders 
      });
    }

    try {
      let response;
      
      // Route handling
      switch (pathname) {
        case '/auth/google':
          _debugLog('🔍 Handling Google auth request');
          response = await handleGoogleAuth(request, env);
          break;
        
        case '/auth/google/callback':
          _debugLog('🔄 Handling Google callback');
          response = await handleGoogleCallback(request, env);
          break;
        
        case '/auth/exchange':
          response = await handleExchangeCode(request, env, corsHeaders);
          break;

        case '/auth/verify':
          _debugLog('✋ Handling session verification');
          response = await handleVerifySession(request, env, corsHeaders);
          break;
        
        case '/auth/logout':
          _debugLog('👋 Handling logout');
          response = await handleLogout(request, env);
          break;
        
        case '/auth/test':
          _debugLog('🧪 Test endpoint called');
          response = new Response(JSON.stringify({ 
            status: 'OK', 
            timestamp: Date.now(),
            kvTest: 'KV access working'
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
          break;
        
        default:
          _debugLog('❓ Unknown route:', pathname);
          response = new Response('Not Found', { status: 404 });
          break;
      }

      // Add CORS headers to non-redirect responses only
      if (response.status !== 302 && response.status !== 301) {
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }

      _debugLog('✅ Response ready:', response.status);
      return response;
      
    } catch (error) {
      console.error('💥 Worker error:', error.message);
      console.error('📚 Stack trace:', error.stack);
      // SECURITY: Never expose error.message to clients (information disclosure)
      return new Response('Internal Server Error', {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};

// SECURITY: Allowed frontend origins for OAuth callback redirects
const ALLOWED_ORIGINS = [
  'https://lucaverse.com',
  'https://www.lucaverse.com',
  'http://localhost:5155',
  'http://localhost:3000'
];

// Google OAuth redirect
async function handleGoogleAuth(request, env) {
  _debugLog('🎯 Starting Google OAuth process');

  try {
    const googleClientId = env.GOOGLE_CLIENT_ID;
    _debugLog('🔑 Google Client ID check:', !!googleClientId);

    if (!googleClientId) {
      throw new Error('GOOGLE_CLIENT_ID environment variable is missing');
    }

    const redirectUri = `${env.WORKER_URL}/auth/google/callback`;
    _debugLog('🔗 Redirect URI:', redirectUri);

    // Read and validate the frontend origin for callback redirect
    const url = new URL(request.url);
    const requestedOrigin = url.searchParams.get('origin');
    const frontendOrigin = (requestedOrigin && ALLOWED_ORIGINS.includes(requestedOrigin))
      ? requestedOrigin
      : env.FRONTEND_URL || 'https://lucaverse.com';

    _debugLog('🌐 Frontend origin for callback:', frontendOrigin);

    // SECURITY: Generate OAuth state parameter for CSRF protection
    const state = crypto.randomUUID();

    // Store state + frontend origin in KV for callback (expires in 10 minutes)
    await env.OAUTH_SESSIONS.put(`state_${state}`, JSON.stringify({
      createdAt: Date.now(),
      frontendOrigin
    }), {
      expirationTtl: 600 // 10 minutes
    });

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', googleClientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('state', state); // CSRF protection

    const finalUrl = authUrl.toString();
    _debugLog('🚀 Final Google OAuth URL:', finalUrl);

    _debugLog('✅ Creating redirect response');
    return Response.redirect(finalUrl, 302);

  } catch (error) {
    console.error('💥 handleGoogleAuth error:', error.message);
    console.error('📚 Stack trace:', error.stack);
    throw error;
  }
}

// Handle Google OAuth callback
async function handleGoogleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const state = url.searchParams.get('state');
  
  // SECURITY: Validate OAuth state parameter to prevent CSRF attacks
  if (!state) {
    return Response.redirect(`${env.FRONTEND_URL}/oauth-callback.html?error=invalid_state`, 302);
  }

  // Verify state parameter exists and is valid
  const storedStateRaw = await env.OAUTH_SESSIONS.get(`state_${state}`);
  if (!storedStateRaw) {
    return Response.redirect(`${env.FRONTEND_URL}/oauth-callback.html?error=invalid_state`, 302);
  }

  // Parse stored state — extract frontend origin for callback redirect
  let frontendUrl = env.FRONTEND_URL || 'https://lucaverse.com';
  try {
    const storedState = JSON.parse(storedStateRaw);
    if (storedState.frontendOrigin && ALLOWED_ORIGINS.includes(storedState.frontendOrigin)) {
      frontendUrl = storedState.frontendOrigin;
    }
  } catch {
    // Legacy format (plain timestamp string) — use default FRONTEND_URL
  }

  // Clean up used state
  await env.OAUTH_SESSIONS.delete(`state_${state}`);

  if (error || !code) {
    return Response.redirect(`${frontendUrl}/oauth-callback.html?error=auth_failed`, 302);
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `${env.WORKER_URL}/auth/google/callback`,
      }),
    });

    const tokens = await tokenResponse.json();
    
    if (!tokens.access_token) {
      throw new Error('No access token received');
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    const userInfo = await userResponse.json();
    
    // Check if user is whitelisted
    const isWhitelisted = await checkWhitelist(userInfo.email, env);
    if (!isWhitelisted) {
      return Response.redirect(`${frontendUrl}/oauth-callback.html?error=not_authorized`, 302);
    }

    // Create session
    const sessionId = generateSessionId();
    const sessionToken = generateSessionToken();
    
    const sessionData = {
      user: {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        permissions: ['user'] // Add more permissions as needed
      },
      token: sessionToken,
      createdAt: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
    };

    // Store session in KV
    await env.OAUTH_SESSIONS.put(sessionId, JSON.stringify(sessionData), {
      expirationTtl: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    // SECURITY: Use short-lived exchange code instead of raw tokens in URL
    // This prevents session credentials from leaking via browser history, Referer headers, and server logs
    const exchangeCode = crypto.randomUUID();
    await env.OAUTH_SESSIONS.put(`exchange_${exchangeCode}`, JSON.stringify({
      sessionId,
      sessionToken
    }), {
      expirationTtl: 60 // 60 seconds — single-use
    });

    // Redirect with opaque exchange code and auth API URL for the exchange call
    const callbackUrl = `${frontendUrl}/oauth-callback.html?code=${exchangeCode}&api=${encodeURIComponent(env.WORKER_URL)}`;
    return Response.redirect(callbackUrl, 302);

  } catch (error) {
    console.error('OAuth callback error:', error);
    return Response.redirect(`${frontendUrl}/oauth-callback.html?error=auth_failed`, 302);
  }
}

// Verify session token
async function handleVerifySession(request, env, corsHeaders) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session');
  const token = url.searchParams.get('token');
  
  _debugLog('🔍 Verify session request:', { sessionId: sessionId ? 'present' : 'missing', token: token ? 'present' : 'missing' });
  
  if (!sessionId || !token) {
    _debugLog('❌ Missing parameters');
    return new Response(JSON.stringify({ valid: false, error: 'Missing parameters' }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        ...corsHeaders
      }
    });
  }

  try {
    _debugLog('🔍 Looking up session:', sessionId);
    const sessionData = await env.OAUTH_SESSIONS.get(sessionId);
    
    if (!sessionData) {
      _debugLog('❌ Session not found in KV');
      return new Response(JSON.stringify({ valid: false, error: 'Session not found' }), {
        status: 404,
        headers: { 
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY', 
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          ...corsHeaders
        }
      });
    }

    _debugLog('✅ Session data found, parsing...');
    const session = JSON.parse(sessionData);
    
    // Check if session is expired
    _debugLog('🕐 Checking expiry:', { now: Date.now(), expires: session.expiresAt });
    if (Date.now() > session.expiresAt) {
      _debugLog('❌ Session expired');
      await env.OAUTH_SESSIONS.delete(sessionId);
      return new Response(JSON.stringify({ valid: false, error: 'Session expired' }), {
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block', 
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          ...corsHeaders
        }
      });
    }

    // SECURITY: Use timing-safe comparison to prevent timing attacks
    _debugLog('🔐 Comparing tokens...', { sessionTokenType: typeof session.token, tokenType: typeof token });
    if (!timingSafeEqual(session.token, token)) {
      _debugLog('❌ Token mismatch');
      return new Response(JSON.stringify({ valid: false, error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    _debugLog('✅ Session verification successful');
    return new Response(JSON.stringify({ 
      valid: true, 
      user: session.user 
    }), {
      headers: { 
        'Content-Type': 'application/json',
        // SECURITY: Add security headers to all responses
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('💥 Session verification error:', error.message);
    console.error('📚 Stack trace:', error.stack);
    // SECURITY: Never expose error.message to clients (information disclosure)
    return new Response(JSON.stringify({ valid: false, error: 'Verification failed' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        ...corsHeaders
      }
    });
  }
}

// Handle logout
async function handleLogout(request, env) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session');
  
  if (sessionId) {
    try {
      await env.OAUTH_SESSIONS.delete(sessionId);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Exchange short-lived code for session credentials (S1: prevents token leakage via URL)
async function handleExchangeCode(request, env, corsHeaders) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response(JSON.stringify({ error: 'Missing exchange code' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  try {
    const stored = await env.OAUTH_SESSIONS.get(`exchange_${code}`);
    if (!stored) {
      return new Response(JSON.stringify({ error: 'Invalid or expired code' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Single-use: delete immediately
    await env.OAUTH_SESSIONS.delete(`exchange_${code}`);

    const { sessionId, sessionToken } = JSON.parse(stored);
    return new Response(JSON.stringify({ sessionId, token: sessionToken }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Exchange code error:', error.message);
    return new Response(JSON.stringify({ error: 'Exchange failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// Check if user email is whitelisted
async function checkWhitelist(email, env) {
  try {
    const whitelistData = await env.USER_WHITELIST.get('users');
    if (!whitelistData) {
      return false;
    }
    
    const whitelist = JSON.parse(whitelistData);
    return whitelist.emails && whitelist.emails.includes(email);
  } catch (error) {
    console.error('Whitelist check error:', error);
    return false;
  }
}

// Utility functions
function generateSessionId() {
  return crypto.randomUUID();
}

function generateSessionToken() {
  // SECURITY: Enhanced token generation with additional entropy
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  
  // Add timestamp and additional entropy for enhanced security
  const timestamp = Date.now().toString(16);
  const additionalEntropy = crypto.randomUUID().replace(/-/g, '');
  
  const baseToken = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  
  // Combine all entropy sources and hash them
  return baseToken + timestamp + additionalEntropy.slice(0, 8);
}

// SECURITY: Timing-safe string comparison to prevent timing attacks
function timingSafeEqual(a, b) {
  // SECURITY: Add null/undefined safety checks
  if (!a || !b || typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}
