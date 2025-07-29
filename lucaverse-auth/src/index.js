// Google OAuth Worker for Lucaverse Authentication
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    console.log('🌟 Worker request:', request.method, pathname);
    console.log('🔧 Environment check:', {
      hasGoogleClientId: !!env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!env.GOOGLE_CLIENT_SECRET,
      workerUrl: env.WORKER_URL,
      frontendUrl: env.FRONTEND_URL
    });

    // Handle CORS for frontend requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', googleClientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('access_type', 'offline');
    
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

    // Redirect to frontend with session info
    const redirectUrl = new URL(`${env.FRONTEND_URL}/oauth-callback.html`);
    redirectUrl.searchParams.set('token', sessionToken);
    redirectUrl.searchParams.set('session', sessionId);
    
    return Response.redirect(redirectUrl.toString(), 302);
    
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
      await env.OAUTH_SESSIONS.delete(sessionId);
      return new Response(JSON.stringify({ valid: false, error: 'Session expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if token matches
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
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
