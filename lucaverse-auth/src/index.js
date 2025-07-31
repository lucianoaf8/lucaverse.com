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

    // Handle CORS for frontend requests with enhanced popup support
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.FRONTEND_URL || 'https://lucaverse.com',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true', // Important for cookies
      'Access-Control-Max-Age': '86400',
      // CRITICAL: Enhanced cross-origin communication for OAuth popup
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN'
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
          response = await handleGoogleAuth(request, env);
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
        
        case '/auth/refresh':
          console.log('🔄 Handling token refresh');
          response = await handleRefreshToken(request, env);
          break;
        
        case '/auth/set-cookies':
          console.log('🍪 Handling set cookies');
          response = await handleSetCookies(request, env);
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

// Google OAuth redirect with security parameters
async function handleGoogleAuth(request, env) {
  console.log('🎯 Starting Google OAuth process');
  
  try {
    const url = new URL(request.url);
    const state = url.searchParams.get('state');
    const codeChallenge = url.searchParams.get('code_challenge');
    const codeChallengeMethod = url.searchParams.get('code_challenge_method');
    const sessionId = url.searchParams.get('session_id');
    
    // Validate required security parameters
    if (!state || !codeChallenge || !sessionId) {
      console.error('🚨 OAuth Security: Missing required parameters');
      return new Response('Missing OAuth security parameters', { status: 400 });
    }
    
    if (codeChallengeMethod !== 'S256') {
      console.error('🚨 OAuth Security: Invalid code challenge method');
      return new Response('Invalid code challenge method', { status: 400 });
    }
    
    const googleClientId = env.GOOGLE_CLIENT_ID;
    console.log('🔑 Google Client ID check:', !!googleClientId);
    
    if (!googleClientId) {
      throw new Error('GOOGLE_CLIENT_ID environment variable is missing');
    }
    
    // Store OAuth security parameters using STATE as key (since Google only returns state in callback)
    const oauthParams = {
      state,
      codeChallenge,
      codeChallengeMethod,
      sessionId,
      timestamp: Date.now()
    };
    
    console.log('🔐 Storing OAuth session with state key:', { state: state.substring(0, 10) + '...', sessionId });
    await env.OAUTH_SESSIONS.put(`oauth_state_${state}`, JSON.stringify(oauthParams), {
      expirationTtl: 300 // 5 minutes
    });
    
    const redirectUri = `${env.WORKER_URL}/auth/google/callback`;
    console.log('🔗 Redirect URI:', redirectUri);
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', googleClientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', codeChallengeMethod);
    
    const finalUrl = authUrl.toString();
    console.log('🚀 Final Google OAuth URL with security params');
    
    console.log('✅ OAuth Security: Parameters validated and stored');
    return Response.redirect(finalUrl, 302);
    
  } catch (error) {
    console.error('💥 handleGoogleAuth error:', error.message);
    console.error('📚 Stack trace:', error.stack);
    throw error;
  }
}

// Handle Google OAuth callback with security validation
async function handleGoogleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  
  if (error) {
    console.error('🚨 OAuth Error:', error);
    return createOAuthErrorResponse(error, 'OAuth provider error', env);
  }
  
  if (!code || !state) {
    console.error('🚨 OAuth Security: Missing code or state parameter');
    return createOAuthErrorResponse('missing_params', 'Missing OAuth parameters', env);
  }
  
  console.log('🔍 OAuth callback received:', { 
    code: code ? 'present' : 'missing',
    state: state ? state.substring(0, 10) + '...' : 'missing'
  });
  
  // Retrieve stored OAuth parameters using STATE as key
  console.log('🔎 Looking up OAuth session with state key...');
  const storedParamsData = await env.OAUTH_SESSIONS.get(`oauth_state_${state}`);
  if (!storedParamsData) {
    console.error('🚨 OAuth Security: OAuth session not found or expired');
    return createOAuthErrorResponse('session_expired', 'Session expired or not found', env);
  }
  
  const storedParams = JSON.parse(storedParamsData);
  
  console.log('✅ OAuth session found and loaded');

  // Validate state parameter
  if (storedParams.state !== state) {
    console.error('🚨 OAuth Security: State parameter mismatch');
    await env.OAUTH_SESSIONS.delete(`oauth_state_${state}`);
    return createOAuthErrorResponse('state_mismatch', 'Invalid state parameter', env);
  }
  
  console.log('✅ State parameter validation passed');
  
  // Validate timestamp (5 minute window)
  const now = Date.now();
  if (now - storedParams.timestamp > 300000) {
    console.error('🚨 OAuth Security: OAuth session expired');
    await env.OAUTH_SESSIONS.delete(`oauth_state_${state}`);
    return createOAuthErrorResponse('session_expired', 'OAuth session expired', env);
  }
  
  console.log('✅ Timestamp validation passed');
  
  console.log('✅ OAuth Security: State validation passed');

  try {
    // Clean up OAuth session now that we've validated it
    console.log('🧹 Cleaning up OAuth session after validation');
    await env.OAUTH_SESSIONS.delete(`oauth_state_${state}`);
    
    // Exchange code for tokens using PKCE
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
        // Note: Google doesn't require code_verifier for confidential clients
        // but we include it for additional security when available
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
      return createOAuthErrorResponse('not_authorized', `User ${userInfo.email} is not authorized`, env);
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
      refreshToken: tokens.refresh_token,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      refreshExpiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    };

    // Store session in KV
    await env.OAUTH_SESSIONS.put(sessionId, JSON.stringify(sessionData), {
      expirationTtl: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    console.log('🎉 OAuth Success! User authenticated:', {
      email: userInfo.email,
      name: userInfo.name,
      sessionId,
      frontendUrl: env.FRONTEND_URL
    });

    // Send success message to opener window with secure cookies
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Authentication Complete</title>
          <style>
            body {
              font-family: 'Space Grotesk', sans-serif;
              background: #040810;
              color: #00E5FF;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .message {
              padding: 20px;
              max-width: 400px;
            }
            .spinner {
              width: 30px;
              height: 30px;
              border: 3px solid rgba(0, 229, 255, 0.3);
              border-top: 3px solid #00E5FF;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .success-message {
              color: #00FFCC;
              font-size: 16px;
              margin-bottom: 10px;
            }
            .close-message {
              color: rgba(255, 255, 255, 0.7);
              font-size: 14px;
            }
            .debug-info {
              color: rgba(255, 255, 255, 0.5);
              font-size: 12px;
              margin-top: 20px;
              padding: 10px;
              background: rgba(0, 0, 0, 0.3);
              border-radius: 5px;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <div class="message">
            <div class="spinner"></div>
            <div class="success-message">Authentication successful!</div>
            <div class="close-message">This window should close automatically...</div>
            <div class="debug-info" id="debug-info">
              Initializing OAuth callback...
            </div>
          </div>
          
          <script>
            (function() {
              'use strict';
              
              const debugInfo = document.getElementById('debug-info');
              
              function addDebugLog(message) {
                console.log(message);
                debugInfo.innerHTML += '<br>' + new Date().toISOString().slice(11, 23) + ' - ' + message;
                debugInfo.scrollTop = debugInfo.scrollHeight;
              }
              
              addDebugLog('🚀 OAuth callback script started');
              addDebugLog('🌐 Current URL: ' + window.location.href);
              addDebugLog('🔗 Window opener exists: ' + !!window.opener);
              addDebugLog('🔗 Window parent exists: ' + !!window.parent);
              addDebugLog('🎯 Frontend URL: ${env.FRONTEND_URL}');
              addDebugLog('🏠 Current origin: ' + window.location.origin);
              
              // Function to attempt sending message and closing window
              function attemptClose() {
                try {
                  addDebugLog('📤 Preparing to send success message');
                  
                  const message = {
                    type: 'OAUTH_SUCCESS',
                    timestamp: Date.now(),
                    debug: {
                      workerOrigin: window.location.origin,
                      frontendUrl: '${env.FRONTEND_URL}',
                      timestamp: new Date().toISOString()
                    }
                  };
                  
                  addDebugLog('📦 Message payload: ' + JSON.stringify(message, null, 2));
                  
                  let messageSent = false;
                  
                  if (window.opener && !window.opener.closed) {
                    addDebugLog('📨 Attempting to send message to opener');
                    
                    // First try: Send to specific frontend URL
                    try {
                      window.opener.postMessage(message, '${env.FRONTEND_URL}');
                      addDebugLog('✅ Message sent to ${env.FRONTEND_URL}');
                      messageSent = true;
                    } catch (e) {
                      addDebugLog('❌ Failed to send to ${env.FRONTEND_URL}: ' + e.message);
                      
                      // Second try: wildcard origin
                      try {
                        window.opener.postMessage(message, '*');
                        addDebugLog('✅ Message sent with wildcard origin');
                        messageSent = true;
                      } catch (e2) {
                        addDebugLog('❌ Failed wildcard send: ' + e2.message);
                      }
                    }
                  } else {
                    addDebugLog('⚠️ No window.opener or opener is closed');
                    
                    // Try parent window as fallback
                    if (window.parent && window.parent !== window) {
                      addDebugLog('📨 Attempting to send message to parent');
                      try {
                        window.parent.postMessage(message, '${env.FRONTEND_URL}');
                        addDebugLog('✅ Message sent to parent');
                        messageSent = true;
                      } catch (e) {
                        addDebugLog('❌ Failed to send to parent: ' + e.message);
                        try {
                          window.parent.postMessage(message, '*');
                          addDebugLog('✅ Message sent to parent with wildcard');
                          messageSent = true;
                        } catch (e2) {
                          addDebugLog('❌ Failed parent wildcard: ' + e2.message);
                        }
                      }
                    }
                  }
                  
                  // Additional attempt: Try top window
                  if (!messageSent && window.top && window.top !== window) {
                    addDebugLog('📨 Attempting to send message to top window');
                    try {
                      window.top.postMessage(message, '${env.FRONTEND_URL}');
                      addDebugLog('✅ Message sent to top window');
                      messageSent = true;
                    } catch (e) {
                      addDebugLog('❌ Failed to send to top: ' + e.message);
                      try {
                        window.top.postMessage(message, '*');
                        addDebugLog('✅ Message sent to top with wildcard');
                        messageSent = true;
                      } catch (e2) {
                        addDebugLog('❌ Failed top wildcard: ' + e2.message);
                      }
                    }
                  }
                  
                  if (!messageSent) {
                    addDebugLog('🚨 No message could be sent!');
                  }
                  
                  // Close window attempts
                  addDebugLog('🚪 Starting window close attempts');
                  
                  // Immediate close attempt
                  setTimeout(() => {
                    addDebugLog('🚪 Attempt 1: Immediate close');
                    try {
                      window.close();
                      if (window.closed) {
                        addDebugLog('✅ Window closed successfully');
                      } else {
                        addDebugLog('⚠️ Window.close() called but window still open');
                      }
                    } catch (e) {
                      addDebugLog('❌ Window close failed: ' + e.message);
                    }
                  }, 100);
                  
                  // Second attempt after 500ms
                  setTimeout(() => {
                    if (!window.closed) {
                      addDebugLog('🚪 Attempt 2: Force close after delay');
                      try {
                        window.close();
                      } catch (e) {
                        addDebugLog('❌ Force close failed: ' + e.message);
                      }
                    }
                  }, 500);
                  
                  // Third attempt - navigation
                  setTimeout(() => {
                    if (!window.closed) {
                      addDebugLog('🚪 Attempt 3: Navigation to about:blank');
                      try {
                        window.location.href = 'about:blank';
                      } catch (e) {
                        addDebugLog('❌ Navigation failed: ' + e.message);
                      }
                    }
                  }, 1500);
                  
                  // Final fallback - show manual close message
                  setTimeout(() => {
                    if (!window.closed) {
                      addDebugLog('🚨 All close attempts failed - showing manual close message');
                      document.querySelector('.close-message').innerHTML = 
                        'Please close this window manually to complete authentication.';
                    }
                  }, 3000);
                  
                } catch (error) {
                  addDebugLog('💥 Critical error in attemptClose: ' + error.message);
                  console.error('OAuth callback error:', error);
                  document.querySelector('.close-message').innerHTML = 
                    'Error occurred. Please close this window manually.';
                }
              }
              
              addDebugLog('⏰ Starting OAuth callback in 100ms');
              
              // Start the close attempt after a brief delay
              setTimeout(attemptClose, 100);
              
              // Also try after DOM is fully loaded as backup
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                  addDebugLog('📄 DOM loaded - running backup attempt');
                  setTimeout(attemptClose, 50);
                });
              }
              
              // Listen for beforeunload to log when window is actually closing
              window.addEventListener('beforeunload', () => {
                addDebugLog('👋 Window is closing...');
              });
              
            })();
          </script>
        </body>
      </html>
    `;
    
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Set-Cookie': [
          createSecureCookie('auth_token', sessionToken, 86400), // 24 hours
          createSecureCookie('session_id', sessionId, 86400 * 7) // 7 days
        ].join(', '),
        // CRITICAL: Enhanced cross-origin communication for OAuth popup
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Frame-Options': 'SAMEORIGIN',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    return createOAuthErrorResponse('auth_failed', `Authentication failed: ${error.message}`, env);
  }
}

// Verify session token
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

// Create OAuth error response with popup that sends error to parent
function createOAuthErrorResponse(errorCode, errorMessage, env) {
  console.log('🚨 Creating OAuth error response:', { errorCode, errorMessage });
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Authentication Error</title>
        <style>
          body {
            font-family: 'Space Grotesk', sans-serif;
            background: #040810;
            color: #FF6B6B;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            text-align: center;
          }
          .message {
            padding: 20px;
            max-width: 400px;
          }
          .error-icon {
            font-size: 48px;
            margin-bottom: 20px;
          }
          .error-message {
            color: #FF6B6B;
            font-size: 16px;
            margin-bottom: 10px;
          }
          .close-message {
            color: rgba(255, 255, 255, 0.7);
            font-size: 14px;
          }
          .debug-info {
            color: rgba(255, 255, 255, 0.5);
            font-size: 12px;
            margin-top: 20px;
            padding: 10px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 5px;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="message">
          <div class="error-icon">⚠️</div>
          <div class="error-message">Authentication failed</div>
          <div class="close-message">This window will close automatically...</div>
          <div class="debug-info" id="debug-info">
            Error: ${errorCode}
          </div>
        </div>
        
        <script>
          (function() {
            'use strict';
            
            const debugInfo = document.getElementById('debug-info');
            
            function addDebugLog(message) {
              console.log(message);
              debugInfo.innerHTML += '<br>' + new Date().toISOString().slice(11, 23) + ' - ' + message;
              debugInfo.scrollTop = debugInfo.scrollHeight;
            }
            
            addDebugLog('🚨 OAuth error callback started');
            addDebugLog('❌ Error: ${errorCode}');
            addDebugLog('📝 Message: ${errorMessage}');
            addDebugLog('🔗 Window opener exists: ' + !!window.opener);
            
            function attemptErrorClose() {
              try {
                addDebugLog('📤 Sending error message to parent');
                
                const message = {
                  type: 'OAUTH_ERROR',
                  error: '${errorMessage}',
                  errorCode: '${errorCode}',
                  timestamp: Date.now(),
                  debug: {
                    workerOrigin: window.location.origin,
                    frontendUrl: '${env.FRONTEND_URL}'
                  }
                };
                
                let messageSent = false;
                
                if (window.opener && !window.opener.closed) {
                  addDebugLog('📨 Attempting to send error to opener');
                  
                  try {
                    window.opener.postMessage(message, '${env.FRONTEND_URL}');
                    addDebugLog('✅ Error message sent to ${env.FRONTEND_URL}');
                    messageSent = true;
                  } catch (e) {
                    addDebugLog('❌ Failed to send to ${env.FRONTEND_URL}: ' + e.message);
                    
                    try {
                      window.opener.postMessage(message, '*');
                      addDebugLog('✅ Error message sent with wildcard origin');
                      messageSent = true;
                    } catch (e2) {
                      addDebugLog('❌ Failed wildcard send: ' + e2.message);
                    }
                  }
                } else {
                  addDebugLog('⚠️ No window.opener or opener is closed');
                }
                
                if (!messageSent) {
                  addDebugLog('🚨 No error message could be sent!');
                }
                
                // Close window attempts
                addDebugLog('🚪 Starting window close attempts');
                
                setTimeout(() => {
                  addDebugLog('🚪 Attempt 1: Immediate close');
                  try {
                    window.close();
                  } catch (e) {
                    addDebugLog('❌ Window close failed: ' + e.message);
                  }
                }, 100);
                
                setTimeout(() => {
                  if (!window.closed) {
                    addDebugLog('🚪 Attempt 2: Force close after delay');
                    try {
                      window.close();
                    } catch (e) {
                      addDebugLog('❌ Force close failed: ' + e.message);
                    }
                  }
                }, 1000);
                
                setTimeout(() => {
                  if (!window.closed) {
                    addDebugLog('🚪 Attempt 3: Navigation to about:blank');
                    try {
                      window.location.href = 'about:blank';
                    } catch (e) {
                      addDebugLog('❌ Navigation failed: ' + e.message);
                    }
                  }
                }, 2000);
                
              } catch (error) {
                addDebugLog('💥 Critical error in attemptErrorClose: ' + error.message);
                console.error('OAuth error callback error:', error);
              }
            }
            
            addDebugLog('⏰ Starting OAuth error callback in 100ms');
            setTimeout(attemptErrorClose, 100);
            
          })();
        </script>
      </body>
    </html>
  `;
  
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
      'X-Frame-Options': 'SAMEORIGIN',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
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

// Handle token refresh
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

// Handle setting cookies (legacy URL token migration)
async function handleSetCookies(request, env) {
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

// Auto-refresh session
async function refreshSession(sessionId, session, env) {
  // Generate new token
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
