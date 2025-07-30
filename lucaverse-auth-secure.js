// Secure Authentication Worker with httpOnly Cookies
// This replaces localStorage with secure, httpOnly cookies

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    
    console.log('🌟 Worker request:', request.method, pathname);
    
    // CORS headers with credentials support
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.FRONTEND_URL || 'https://lucaverse.com',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true', // Important for cookies
      'Access-Control-Max-Age': '86400'
    };
    
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }
    
    try {
      let response;
      
      switch (pathname) {
        case '/auth/google':
          response = await handleGoogleAuth(env);
          break;
          
        case '/auth/google/callback':
          response = await handleGoogleCallback(request, env);
          break;
          
        case '/auth/verify':
          response = await handleVerifySession(request, env);
          break;
          
        case '/auth/logout':
          response = await handleLogout(request, env);
          break;
          
        case '/auth/refresh':
          response = await handleRefreshToken(request, env);
          break;
          
        case '/auth/set-cookies':
          response = await handleSetCookies(request, env);
          break;
          
        default:
          response = new Response('Not Found', { status: 404 });
          break;
      }
      
      // Add CORS headers to non-redirect responses
      if (response.status !== 302 && response.status !== 301) {
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }
      
      return response;
    } catch (error) {
      console.error('💥 Worker error:', error.message);
      return new Response(`Internal Server Error: ${error.message}`, {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};

// Cookie utility functions
function parseCookies(cookieString) {
  const cookies = {};
  if (!cookieString) return cookies;
  
  cookieString.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  return cookies;
}

function createSecureCookie(name, value, maxAge = 86400) {
  return `${name}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

function createExpiredCookie(name) {
  return `${name}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

// Auth handlers
async function handleGoogleAuth(env) {
  console.log('🎯 Starting Google OAuth process');
  
  const googleClientId = env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is missing');
  }
  
  const redirectUri = `${env.WORKER_URL}/auth/google/callback`;
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  
  authUrl.searchParams.set('client_id', googleClientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid profile email');
  authUrl.searchParams.set('access_type', 'offline');
  
  return Response.redirect(authUrl.toString(), 302);
}

async function handleGoogleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  
  if (error || !code) {
    return Response.redirect(`${env.FRONTEND_URL}/oauth-callback.html?error=auth_failed`, 302);
  }
  
  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${env.WORKER_URL}/auth/google/callback`
      })
    });
    
    const tokens = await tokenResponse.json();
    
    if (!tokens.access_token) {
      throw new Error('No access token received');
    }
    
    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    });
    
    const userInfo = await userResponse.json();
    
    // Check whitelist
    const isWhitelisted = await checkWhitelist(userInfo.email, env);
    if (!isWhitelisted) {
      return Response.redirect(`${env.FRONTEND_URL}/oauth-callback.html?error=not_authorized`, 302);
    }
    
    // Generate session
    const sessionId = generateSessionId();
    const sessionToken = generateSessionToken();
    
    // Store session data
    const sessionData = {
      user: {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        permissions: ['user']
      },
      token: sessionToken,
      refreshToken: tokens.refresh_token,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      refreshExpiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    };
    
    await env.OAUTH_SESSIONS.put(sessionId, JSON.stringify(sessionData), {
      expirationTtl: 7 * 24 * 60 * 60 // 7 days
    });
    
    // Create secure cookies
    const headers = new Headers({
      'Location': `${env.FRONTEND_URL}/oauth-callback.html`,
      'Set-Cookie': [
        createSecureCookie('auth_token', sessionToken, 86400), // 24 hours
        createSecureCookie('session_id', sessionId, 86400 * 7) // 7 days
      ].join(', ')
    });
    
    // Send success message to opener window
    const html = `
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_SUCCESS' }, '${env.FRONTEND_URL}');
              window.close();
            } else {
              window.location.href = '${env.FRONTEND_URL}';
            }
          </script>
        </body>
      </html>
    `;
    
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Set-Cookie': [
          createSecureCookie('auth_token', sessionToken, 86400),
          createSecureCookie('session_id', sessionId, 86400 * 7)
        ].join(', ')
      }
    });
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    return Response.redirect(`${env.FRONTEND_URL}/oauth-callback.html?error=auth_failed`, 302);
  }
}

async function handleVerifySession(request, env) {
  // Read cookies from request
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const token = cookies.auth_token;
  const sessionId = cookies.session_id;
  
  if (!sessionId || !token) {
    return new Response(JSON.stringify({ valid: false, error: 'Missing authentication' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const sessionData = await env.OAUTH_SESSIONS.get(sessionId);
    
    if (!sessionData) {
      return new Response(JSON.stringify({ valid: false, error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const session = JSON.parse(sessionData);
    
    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      // Try to refresh if we have a refresh token
      if (session.refreshToken && Date.now() < session.refreshExpiresAt) {
        return await refreshSession(sessionId, session, env);
      }
      
      await env.OAUTH_SESSIONS.delete(sessionId);
      return new Response(JSON.stringify({ valid: false, error: 'Session expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Verify token matches
    if (session.token !== token) {
      return new Response(JSON.stringify({ valid: false, error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      valid: true,
      user: session.user
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Session verification error:', error);
    return new Response(JSON.stringify({ valid: false, error: 'Verification failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleLogout(request, env) {
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const sessionId = cookies.session_id;
  
  if (sessionId) {
    try {
      await env.OAUTH_SESSIONS.delete(sessionId);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
  
  // Clear cookies
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Set-Cookie': [
      createExpiredCookie('auth_token'),
      createExpiredCookie('session_id')
    ].join(', ')
  });
  
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers
  });
}

async function handleRefreshToken(request, env) {
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const oldToken = cookies.auth_token;
  const sessionId = cookies.session_id;
  
  if (!oldToken || !sessionId) {
    return new Response(JSON.stringify({ error: 'No session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const sessionData = await env.OAUTH_SESSIONS.get(sessionId);
    if (!sessionData) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const session = JSON.parse(sessionData);
    
    // Verify old token
    if (session.token !== oldToken) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generate new token
    const newToken = generateSessionToken();
    
    // Update session
    session.token = newToken;
    session.expiresAt = Date.now() + (24 * 60 * 60 * 1000); // Reset to 24 hours
    
    await env.OAUTH_SESSIONS.put(sessionId, JSON.stringify(session), {
      expirationTtl: Math.floor((session.refreshExpiresAt - Date.now()) / 1000)
    });
    
    // Set new token cookie
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Set-Cookie': createSecureCookie('auth_token', newToken, 86400)
    });
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    return new Response(JSON.stringify({ error: 'Refresh failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleSetCookies(request, env) {
  // Legacy endpoint for URL token migration
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const sessionId = url.searchParams.get('session');
  const redirect = url.searchParams.get('redirect');
  
  if (!token || !sessionId) {
    return new Response('Missing parameters', { status: 400 });
  }
  
  try {
    // Verify session exists and is valid
    const sessionData = await env.OAUTH_SESSIONS.get(sessionId);
    if (!sessionData) {
      return new Response('Invalid credentials', { status: 401 });
    }
    
    const session = JSON.parse(sessionData);
    if (session.token !== token || Date.now() > session.expiresAt) {
      return new Response('Invalid or expired credentials', { status: 401 });
    }
    
    // Set cookies and redirect
    const headers = new Headers({
      'Location': redirect || env.FRONTEND_URL,
      'Set-Cookie': [
        createSecureCookie('auth_token', token, 86400),
        createSecureCookie('session_id', sessionId, 86400 * 7)
      ].join(', ')
    });
    
    return new Response(null, {
      status: 302,
      headers
    });
    
  } catch (error) {
    console.error('Set cookies error:', error);
    return new Response('Failed to set cookies', { status: 500 });
  }
}

async function refreshSession(sessionId, session, env) {
  // This would refresh with Google OAuth if needed
  // For now, just extend the session
  const newToken = generateSessionToken();
  
  session.token = newToken;
  session.expiresAt = Date.now() + (24 * 60 * 60 * 1000);
  
  await env.OAUTH_SESSIONS.put(sessionId, JSON.stringify(session), {
    expirationTtl: Math.floor((session.refreshExpiresAt - Date.now()) / 1000)
  });
  
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Set-Cookie': createSecureCookie('auth_token', newToken, 86400)
  });
  
  return new Response(JSON.stringify({
    valid: true,
    user: session.user,
    refreshed: true
  }), {
    status: 200,
    headers
  });
}

// Utility functions
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

function generateSessionId() {
  return crypto.randomUUID();
}

function generateSessionToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}