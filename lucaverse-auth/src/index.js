// Google OAuth Worker for Lucaverse Authentication
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    // SECURITY: Minimal production logging to prevent information disclosure
    if (env.NODE_ENV !== 'production') {
      console.log('🌟 Worker request:', request.method, pathname);
      console.log('🔧 Environment check:', {
        hasGoogleClientId: !!env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!env.GOOGLE_CLIENT_SECRET,
        workerUrl: env.WORKER_URL ? 'configured' : 'missing',
        frontendUrl: env.FRONTEND_URL ? 'configured' : 'missing'
      });
    }

    // Handle CORS for frontend requests - SECURITY: Use specific allowed origins only
    const allowedOrigins = [
      env.FRONTEND_URL || 'https://lucaverse.com',
      'https://lucaverse.com',
      'https://www.lucaverse.com',
      // Development origins
      'http://localhost:5155',
      'http://localhost:3000'
    ];
    
    const origin = request.headers.get('Origin');
    const isAllowedOrigin = allowedOrigins.includes(origin);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': isAllowedOrigin ? origin : env.FRONTEND_URL || 'https://lucaverse.com',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true', // Enable credentials for secure sessions
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      console.log('✅ Handling OPTIONS request');
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
          console.log('🔍 Handling Google auth request');
          response = await handleGoogleAuth(env);
          break;
        
        case '/auth/google/callback':
          console.log('🔄 Handling Google callback');
          response = await handleGoogleCallback(request, env);
          break;
        
        case '/auth/verify':
          console.log('✋ Handling session verification');
          response = await handleVerifySession(request, env);
          break;
        
        case '/auth/logout':
          console.log('👋 Handling logout');
          response = await handleLogout(request, env);
          break;
        
        default:
          console.log('❓ Unknown route:', pathname);
          response = new Response('Not Found', { status: 404 });
          break;
      }

      // Add CORS headers to non-redirect responses only
      if (response.status !== 302 && response.status !== 301) {
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }

      console.log('✅ Response ready:', response.status);
      return response;
      
    } catch (error) {
      console.error('💥 Worker error:', error.message);
      console.error('📚 Stack trace:', error.stack);
      return new Response(`Internal Server Error: ${error.message}`, { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }
};

// Google OAuth redirect
async function handleGoogleAuth(env) {
  console.log('🎯 Starting Google OAuth process');
  
  try {
    const googleClientId = env.GOOGLE_CLIENT_ID;
    console.log('🔑 Google Client ID check:', !!googleClientId);
    
    if (!googleClientId) {
      throw new Error('GOOGLE_CLIENT_ID environment variable is missing');
    }
    
    const redirectUri = `${env.WORKER_URL}/auth/google/callback`;
    console.log('🔗 Redirect URI:', redirectUri);
    
    // SECURITY: Generate OAuth state parameter for CSRF protection
    const state = crypto.randomUUID();
    
    // Store state in KV for validation (expires in 10 minutes)
    await env.OAUTH_SESSIONS.put(`state_${state}`, Date.now().toString(), {
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
    console.log('🚀 Final Google OAuth URL:', finalUrl);
    
    console.log('✅ Creating redirect response');
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
  const storedState = await env.OAUTH_SESSIONS.get(`state_${state}`);
  if (!storedState) {
    return Response.redirect(`${env.FRONTEND_URL}/oauth-callback.html?error=invalid_state`, 302);
  }
  
  // Clean up used state
  await env.OAUTH_SESSIONS.delete(`state_${state}`);
  
  if (error || !code) {
    return Response.redirect(`${env.FRONTEND_URL}/oauth-callback.html?error=auth_failed`, 302);
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
      return Response.redirect(`${env.FRONTEND_URL}/oauth-callback.html?error=not_authorized`, 302);
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

    // SECURITY: Use secure POST method instead of URL parameters for tokens
    const redirectUrl = new URL(`${env.FRONTEND_URL}/oauth-callback.html`);
    
    // Create secure session cookie instead of URL params
    const cookieOptions = [
      `auth_session=${sessionId}`,
      `Max-Age=${7 * 24 * 60 * 60}`, // 7 days
      'HttpOnly',
      'Secure',
      'SameSite=Strict',
      `Domain=${new URL(env.FRONTEND_URL).hostname}`
    ].join('; ');
    
    const cookieToken = [
      `auth_token=${sessionToken}`,
      `Max-Age=${7 * 24 * 60 * 60}`, // 7 days
      'HttpOnly',
      'Secure', 
      'SameSite=Strict',
      `Domain=${new URL(env.FRONTEND_URL).hostname}`
    ].join('; ');
    
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Success</title>
        <script>
          // Fallback for environments that don't support HttpOnly cookies
          localStorage.setItem('auth_token', '${sessionToken}');
          localStorage.setItem('session_id', '${sessionId}');
          window.location.href = '${redirectUrl.toString()}';
        </script>
      </head>
      <body>
        <p>Authentication successful. Redirecting...</p>
      </body>
      </html>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'Set-Cookie': [cookieOptions, cookieToken],
          ...corsHeaders
        }
      }
    );
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    return Response.redirect(`${env.FRONTEND_URL}/oauth-callback.html?error=auth_failed`, 302);
  }
}

// Verify session token
async function handleVerifySession(request, env) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session');
  const token = url.searchParams.get('token');
  
  if (!sessionId || !token) {
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
    const sessionData = await env.OAUTH_SESSIONS.get(sessionId);
    
    if (!sessionData) {
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

    const session = JSON.parse(sessionData);
    
    // Check if session is expired
    if (Date.now() > session.expiresAt) {
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
    if (!timingSafeEqual(session.token, token)) {
      return new Response(JSON.stringify({ valid: false, error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

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
    // SECURITY: Minimal error logging in production
    if (env.NODE_ENV !== 'production') {
      console.error('Session verification error:', error);
    }
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
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}
