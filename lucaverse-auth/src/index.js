// Google OAuth Worker for Lucaverse Authentication - Enhanced Version
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    console.log('🌟 Worker request:', request.method, pathname, url.toString());
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
      'X-Frame-Options': 'SAMEORIGIN',
      // CRITICAL: CDN/Cache prevention for OAuth endpoints
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
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
        
        case '/debug/save-logs':
          console.log('💾 Handling debug log save');
          response = await handleSaveDebugLogs(request, env);
          break;
        
        case '/debug/save-txt-logs':
          console.log('📝 Handling TXT log save');
          response = await handleSaveTxtLogs(request, env);
          break;
        
        case '/health':
          console.log('💚 Health check');
          response = new Response(JSON.stringify({
            status: 'healthy',
            timestamp: Date.now(),
            environment: {
              hasGoogleClientId: !!env.GOOGLE_CLIENT_ID,
              hasGoogleClientSecret: !!env.GOOGLE_CLIENT_SECRET,
              workerUrl: env.WORKER_URL,
              frontendUrl: env.FRONTEND_URL
            }
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
          break;
        
        case '/debug':
          console.log('🔍 Debug info request');
          try {
            // Test KV access
            const testWhitelist = await env.USER_WHITELIST.get('users');
            
            response = new Response(JSON.stringify({
              status: 'debug',
              timestamp: Date.now(),
              environment: {
                hasGoogleClientId: !!env.GOOGLE_CLIENT_ID,
                hasGoogleClientSecret: !!env.GOOGLE_CLIENT_SECRET,
                googleClientIdPrefix: env.GOOGLE_CLIENT_ID ? env.GOOGLE_CLIENT_ID.substring(0, 10) + '...' : 'missing',
                workerUrl: env.WORKER_URL,
                frontendUrl: env.FRONTEND_URL
              },
              kvStore: {
                whitelistExists: !!testWhitelist,
                whitelistData: testWhitelist ? JSON.parse(testWhitelist) : null
              },
              oauth: {
                redirectUri: `${env.WORKER_URL}/auth/google/callback`,
                expectedOrigins: [env.FRONTEND_URL]
              }
            }, null, 2), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          } catch (error) {
            response = new Response(JSON.stringify({
              status: 'debug_error',
              error: error.message,
              timestamp: Date.now()
            }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            });
          }
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
    const codeVerifier = url.searchParams.get('code_verifier'); // CRITICAL FIX: Get code_verifier from frontend
    
    console.log('🔍 OAuth Parameters Debug:', {
      hasState: !!state,
      hasCodeChallenge: !!codeChallenge,
      hasCodeVerifier: !!codeVerifier, // This should now be true
      hasSessionId: !!sessionId,
      codeChallengeMethod,
      codeVerifierLength: codeVerifier?.length || 0,
      codeChallengeLength: codeChallenge?.length || 0
    });
    
    // KV Health Check as per plan
    const kvTestKey = `health_check_${Date.now()}`;
    const kvTestData = { test: true, timestamp: Date.now() };
    
    try {
      // Test KV write
      await env.OAUTH_SESSIONS.put(kvTestKey, JSON.stringify(kvTestData), {
        expirationTtl: 60 // 1 minute
      });
      console.log('✅ KV Write successful');
      
      // Test KV read
      const retrievedData = await env.OAUTH_SESSIONS.get(kvTestKey);
      if (retrievedData) {
        const parsed = JSON.parse(retrievedData);
        console.log('✅ KV Read successful:', parsed);
      } else {
        console.log('❌ KV Read failed: No data retrieved');
      }
      
      // Test KV delete
      await env.OAUTH_SESSIONS.delete(kvTestKey);
      console.log('✅ KV Delete successful');
      
    } catch (error) {
      console.log('❌ KV Health Check failed:', error);
    }
    
    // Validate required security parameters
    if (!state || !codeChallenge || !sessionId || !codeVerifier) {
      console.error('🚨 OAuth Security: Missing required parameters', {
        missingState: !state,
        missingCodeChallenge: !codeChallenge,
        missingCodeVerifier: !codeVerifier, // Now checking for code_verifier too
        missingSessionId: !sessionId
      });
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
      codeVerifier, // CRITICAL FIX: Store the code_verifier for token exchange
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

// Handle Google OAuth callback with security validation - ENHANCED VERSION
async function handleGoogleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  
  console.log('🔥 ENHANCED CALLBACK: Starting Google OAuth callback processing');
  console.log('🔍 Callback parameters:', { 
    code: code ? 'present' : 'missing',
    state: state ? state.substring(0, 10) + '...' : 'missing',
    error: error || 'none',
    fullUrl: url.toString()
  });
  
  if (error) {
    console.error('🚨 OAuth Error received from Google:', error);
    return createOAuthErrorResponse(error, 'OAuth provider error', env);
  }
  
  if (!code || !state) {
    console.error('🚨 OAuth Security: Missing code or state parameter');
    return createOAuthErrorResponse('missing_params', 'Missing OAuth parameters', env);
  }
  
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

  try {
    // Clean up OAuth session now that we've validated it
    console.log('🧹 Cleaning up OAuth session after validation');
    await env.OAUTH_SESSIONS.delete(`oauth_state_${state}`);
    
    console.log('🔄 Exchanging authorization code for tokens...');
    
    // CRITICAL FIX: Add code_verifier to token exchange (the missing PKCE parameter!)
    const tokenRequestBody = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: `${env.WORKER_URL}/auth/google/callback`,
      code_verifier: storedParams.codeVerifier // ✅ NOW CORRECT: Using actual code_verifier!
    });
    
    console.log('🚀 Google Token Request Debug:', {
      url: 'https://oauth2.googleapis.com/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      bodyParams: {
        client_id: env.GOOGLE_CLIENT_ID,
        grant_type: 'authorization_code',
        redirect_uri: `${env.WORKER_URL}/auth/google/callback`,
        hasCode: !!code,
        hasClientSecret: !!env.GOOGLE_CLIENT_SECRET,
        hasCodeVerifier: !!storedParams.codeVerifier, // ✅ Now correctly checking codeVerifier
        codeVerifierSource: 'storedParams.codeVerifier (FIXED!)',
        codeVerifierLength: storedParams.codeVerifier?.length || 0
      }
    });
    
    // Exchange code for tokens using PKCE
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody,
    });

    console.log('📤 Token exchange response status:', tokenResponse.status);
    console.log('📤 Token exchange response headers:', Object.fromEntries(tokenResponse.headers));
    
    const tokens = await tokenResponse.json();
    console.log('📥 Google Token Response:', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText, 
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      hasError: !!tokens.error,
      error: tokens.error,
      errorDescription: tokens.error_description,
      expiresIn: tokens.expires_in,
      tokenType: tokens.token_type
    });
    
    if (!tokens.access_token) {
      console.error('❌ No access token received from Google:', tokens);
      
      // Enhanced error handling based on Google's error response
      let errorMessage = 'No access token received from Google';
      if (tokens.error) {
        switch (tokens.error) {
          case 'invalid_grant':
            errorMessage = 'Authorization code expired or invalid. Please try again.';
            break;
          case 'invalid_client':
            errorMessage = 'OAuth client configuration error. Please contact support.';
            break;
          case 'invalid_request':
            errorMessage = 'Invalid OAuth request parameters. Please try again.';
            break;
          case 'unsupported_grant_type':
            errorMessage = 'OAuth grant type not supported. Please contact support.';
            break;
          default:
            errorMessage = `OAuth error: ${tokens.error} - ${tokens.error_description || 'Unknown error'}`;
        }
      }
      
      throw new Error(errorMessage);
    }

    console.log('✅ Access token received from Google');

    console.log('👤 Fetching user information from Google...');
    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    const userInfo = await userResponse.json();
    console.log('👤 User info received:', { 
      email: userInfo.email, 
      name: userInfo.name,
      id: userInfo.id ? 'present' : 'missing'
    });
    
    console.log('🔍 Checking user whitelist...');
    // Check if user is whitelisted
    const isWhitelisted = await checkWhitelist(userInfo.email, env);
    console.log('🔍 Whitelist check result:', isWhitelisted ? 'APPROVED' : 'DENIED');
    
    if (!isWhitelisted) {
      console.error('🚫 User not whitelisted:', userInfo.email);
      return createOAuthErrorResponse('not_authorized', `User ${userInfo.email} is not authorized`, env);
    }

    console.log('✅ User is whitelisted, creating session...');

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

    console.log('💾 Storing session in KV store...');
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

    console.log('📄 Creating SUCCESS HTML response for popup...');
    // CRITICAL FIX: Enhanced HTML response with comprehensive popup handling
    const html = createOAuthSuccessHTML(env, userInfo, sessionId, sessionToken);
    
    const responseHeaders = {
      'Content-Type': 'text/html; charset=utf-8',
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
    };

    console.log('🚀 Returning SUCCESS response to popup');
    return new Response(html, {
      status: 200,
      headers: responseHeaders
    });
    
  } catch (error) {
    console.error('💥 OAuth callback error:', error.message);
    console.error('📚 Stack trace:', error.stack);
    return createOAuthErrorResponse('auth_failed', `Authentication failed: ${error.message}`, env);
  }
}

// ENHANCED: Create comprehensive OAuth success HTML with robust popup communication
function createOAuthSuccessHTML(env, userInfo, sessionId, sessionToken) {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Complete - Lucaverse</title>
    <style>
      body {
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: linear-gradient(135deg, #040810 0%, #0a1a2a 100%);
        color: #00E5FF;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
        text-align: center;
        overflow: hidden;
      }
      .container {
        padding: 40px;
        max-width: 500px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 15px;
        border: 1px solid rgba(0, 229, 255, 0.2);
        backdrop-filter: blur(10px);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      }
      .success-icon {
        font-size: 60px;
        margin-bottom: 20px;
        animation: pulse 2s infinite;
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
      }
      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(0, 229, 255, 0.3);
        border-top: 4px solid #00E5FF;
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
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 15px;
      }
      .user-info {
        color: rgba(255, 255, 255, 0.9);
        font-size: 16px;
        margin-bottom: 20px;
      }
      .close-message {
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
        margin-bottom: 20px;
      }
      .debug-info {
        color: rgba(255, 255, 255, 0.5);
        font-size: 11px;
        font-family: 'Courier New', monospace;
        background: rgba(0, 0, 0, 0.4);
        border-radius: 8px;
        padding: 15px;
        margin-top: 20px;
        text-align: left;
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid rgba(0, 229, 255, 0.1);
      }
      .debug-entry {
        margin-bottom: 5px;
        word-break: break-all;
      }
      .timestamp {
        color: rgba(0, 229, 255, 0.6);
        font-weight: bold;
      }
      .status-success { color: #00FFCC; }
      .status-error { color: #FF6B6B; }
      .status-warning { color: #FFD700; }
      .status-info { color: #00E5FF; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="success-icon">✅</div>
      <div class="success-message">Authentication Successful!</div>
      <div class="user-info">Welcome, ${userInfo.name || userInfo.email}!</div>
      <div class="spinner"></div>
      <div class="close-message">Redirecting to dashboard...</div>
      <div class="debug-info" id="debug-info">
        <div class="debug-entry status-info">
          <span class="timestamp">[INIT]</span> OAuth callback script starting...
        </div>
      </div>
    </div>
    
    <script>
      (function() {
        'use strict';
        
        // Configuration  
        const CONFIG = {
          frontendUrl: '${env.FRONTEND_URL}',
          workerOrigin: window.location.origin,
          maxRetryAttempts: 5,
          retryDelay: 500,
          timeoutMs: 10000
        };
        
        // Debug logging setup - MUST BE FIRST
        const debugInfo = document.getElementById('debug-info');
        let debugCount = 0;
        
        function addDebugLog(message, status = 'info') {
          debugCount++;
          const timestamp = new Date().toISOString().slice(11, 23);
          const entry = document.createElement('div');
          entry.className = \`debug-entry status-\${status}\`;
          entry.innerHTML = \`<span class="timestamp">[\${timestamp}]</span> \${message}\`;
          debugInfo.appendChild(entry);
          debugInfo.scrollTop = debugInfo.scrollHeight;
          console.log(\`[OAuth-\${debugCount}] \${message}\`);
          
          // Limit debug entries to prevent memory issues
          if (debugCount > 50) {
            const firstEntry = debugInfo.querySelector('.debug-entry');
            if (firstEntry) firstEntry.remove();
          }
        }
        
        // CRITICAL DEBUG: Log configuration (now after function is defined)
        addDebugLog(\`🔧 CONFIG.frontendUrl: \${CONFIG.frontendUrl}\`, 'info');
        addDebugLog(\`🔧 CONFIG.workerOrigin: \${CONFIG.workerOrigin}\`, 'info');
        addDebugLog(\`🔧 window.opener exists: \${!!window.opener}\`, 'info');
        addDebugLog(\`🔧 window.opener.closed: \${window.opener ? window.opener.closed : 'N/A'}\`, 'info');
        
        // Authentication data factory - generates timestamp when called
        function createAuthData() {
          return {
            type: 'OAUTH_SUCCESS',
            timestamp: Date.now(), // ✅ Dynamic timestamp when message is sent
            user: {
              email: '${userInfo.email}',
              name: '${userInfo.name || ''}',
              id: '${userInfo.id || ''}'
            },
            sessionId: '${sessionId}',
            debug: {
              workerOrigin: CONFIG.workerOrigin,
              frontendUrl: CONFIG.frontendUrl,
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString(),
              messageGeneratedAt: Date.now()
            }
          };
        }
        
        addDebugLog('OAuth callback initialized', 'success');
        addDebugLog(\`Frontend URL: \${CONFIG.frontendUrl}\`);
        addDebugLog(\`Worker Origin: \${CONFIG.workerOrigin}\`);
        addDebugLog(\`Window opener exists: \${!!window.opener}\`);
        addDebugLog(\`Window parent exists: \${!!window.parent && window.parent !== window}\`);
        addDebugLog(\`Window top exists: \${!!window.top && window.top !== window}\`);
        
        // Popup communication manager
        class PopupCommunicator {
          constructor() {
            this.attempts = 0;
            this.maxAttempts = CONFIG.maxRetryAttempts;
            this.messageSent = false;
            this.windowClosed = false;
          }
          
          async sendMessage() {
            addDebugLog('Starting message transmission attempts', 'info');
            
            const targets = this.getTargetWindows();
            addDebugLog(\`Found \${targets.length} potential target windows\`);
            
            // RACE CONDITION FIX: Send message to ONLY the first available target
            // Multiple targets were causing duplicate message processing in the frontend
            if (targets.length === 0) {
              addDebugLog('❌ No target windows available', 'error');
              return;
            }
            
            // Try targets in order of preference: opener first (most common), then parent, then top
            for (const target of targets) {
              addDebugLog(\`🎯 Attempting to send to primary target: \${target.name}\`, 'info');
              
              if (await this.sendToTarget(target)) {
                this.messageSent = true;
                addDebugLog(\`✅ SUCCESS: Message sent to \${target.name} - stopping here to prevent duplicates\`, 'success');
                return; // CRITICAL: Stop after first successful send to prevent race condition
              } else {
                addDebugLog(\`❌ Failed to send to \${target.name}, trying next target...\`, 'warning');
              }
            }
            
            addDebugLog('❌ All message transmissions failed', 'error');
          }
          
          getTargetWindows() {
            const targets = [];
            
            if (window.opener && !window.opener.closed) {
              targets.push({
                window: window.opener,
                name: 'opener',
                origins: [CONFIG.frontendUrl, '*']
              });
            }
            
            if (window.parent && window.parent !== window) {
              targets.push({
                window: window.parent,
                name: 'parent',
                origins: [CONFIG.frontendUrl, '*']
              });
            }
            
            if (window.top && window.top !== window && window.top !== window.parent) {
              targets.push({
                window: window.top,
                name: 'top',
                origins: [CONFIG.frontendUrl, '*']
              });
            }
            
            return targets;
          }
          
          async sendToTarget(target) {
            // CRITICAL FIX: Enhanced message delivery with multiple attempts and better timing
            const messageData = createAuthData(); // Generate fresh timestamp once
            
            addDebugLog(\`🎯 ATTEMPTING SEND TO TARGET: \${target.name}\`, 'info');
            addDebugLog(\`   Target window exists: \${!!target.window}\`, 'info');
            addDebugLog(\`   Target window closed: \${target.window ? target.window.closed : 'N/A'}\`, 'info');
            addDebugLog(\`   Message data type: \${messageData.type}\`, 'info');
            addDebugLog(\`   Frontend URL: \${CONFIG.frontendUrl}\`, 'info');
            
            // CRITICAL FIX: Multiple send attempts with different timings
            const sendAttempts = [
              { delay: 0, origin: CONFIG.frontendUrl, name: 'immediate-specific' },
              { delay: 100, origin: CONFIG.frontendUrl, name: 'delayed-specific' },
              { delay: 200, origin: '*', name: 'delayed-wildcard' },
              { delay: 500, origin: CONFIG.frontendUrl, name: 'backup-specific' },
              { delay: 800, origin: '*', name: 'backup-wildcard' }
            ];
            
            let successCount = 0;
            
            for (const attempt of sendAttempts) {
              try {
                await new Promise(resolve => setTimeout(resolve, attempt.delay));
                
                // Check if window is still available
                if (!target.window || target.window.closed) {
                  addDebugLog(\`❌ Target window no longer available for attempt: \${attempt.name}\`, 'error');
                  break;
                }
                
                addDebugLog(\`📤 Attempt \${attempt.name}: Sending to \${target.name} with origin: \${attempt.origin}\`);
                target.window.postMessage(messageData, attempt.origin);
                addDebugLog(\`✅ postMessage() call completed for \${attempt.name}\`, 'success');
                successCount++;
                
                // Wait to see if any errors occur
                await new Promise(resolve => setTimeout(resolve, 50));
                
              } catch (error) {
                addDebugLog(\`⚠️ Attempt \${attempt.name} failed: \${error.message}\`, 'warning');
              }
            }
            
            if (successCount > 0) {
              addDebugLog(\`✅ MESSAGE DELIVERY SUCCESS: \${successCount} successful attempts to \${target.name}\`, 'success');
              return true;
            } else {
              addDebugLog(\`❌ ALL MESSAGE ATTEMPTS FAILED for \${target.name}\`, 'error');
              return false;
            }
          }
          
          async closeWindow() {
            addDebugLog('Starting window close sequence - EXTENDED TIMING for message delivery', 'info');
            
            // CRITICAL FIX: Extended delays to ensure message delivery completes
            const closeAttempts = [
              { delay: 2000, method: 'first-delayed' },    // Wait 2 seconds first
              { delay: 3000, method: 'second-delayed' },   // Wait 3 seconds  
              { delay: 4000, method: 'third-delayed' },    // Wait 4 seconds
              { delay: 6000, method: 'force-close' },      // Force close after 6 seconds
              { delay: 8000, method: 'navigation' }        // Navigate as final backup
            ];
            
            // Show extended message to user
            setTimeout(() => {
              const closeMsg = document.querySelector('.close-message');
              if (closeMsg) {
                closeMsg.innerHTML = 'Message sent! This window will close in a few seconds...';
              }
            }, 1000);
            
            for (const attempt of closeAttempts) {
              setTimeout(() => {
                if (this.windowClosed) return;
                
                addDebugLog(\`Close attempt: \${attempt.method} (after \${attempt.delay}ms)\`, 'info');
                
                switch (attempt.method) {
                  case 'first-delayed':
                  case 'second-delayed':
                  case 'third-delayed':
                  case 'force-close':
                    try {
                      addDebugLog('Attempting window.close()', 'info');
                      window.close();
                      if (window.closed) {
                        addDebugLog('Window closed successfully', 'success');
                        this.windowClosed = true;
                      } else {
                        addDebugLog('window.close() called but window still open', 'warning');
                      }
                    } catch (error) {
                      addDebugLog(\`Close failed: \${error.message}\`, 'error');
                    }
                    break;
                    
                  case 'navigation':
                    if (!this.windowClosed) {
                      try {
                        addDebugLog('Final fallback: navigation to about:blank', 'warning');
                        window.location.href = 'about:blank';
                      } catch (error) {
                        addDebugLog(\`Navigation failed: \${error.message}\`, 'error');
                      }
                    }
                    break;
                }
              }, attempt.delay);
            }
            
            // Final fallback - show manual close message after 10 seconds
            setTimeout(() => {
              if (!this.windowClosed) {
                addDebugLog('All close attempts failed - manual intervention required', 'error');
                const closeMsg = document.querySelector('.close-message');
                const spinner = document.querySelector('.spinner');
                if (closeMsg) closeMsg.innerHTML = 'Please close this window manually to complete authentication.';
                if (spinner) spinner.style.display = 'none';
              }
            }, 10000);
          }
          
          delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
          }
        }
        
        // Initialize and run
        async function runOAuthCallback() {
          try {
            addDebugLog('Creating popup communicator', 'info');
            const communicator = new PopupCommunicator();
            
            // CRITICAL FIX: Extended timing for proper message delivery
            addDebugLog('Starting message delivery sequence...', 'info');
            
            // Send authentication success message
            await communicator.sendMessage();
            
            addDebugLog('Message sending completed, waiting for processing...', 'info');
            
            // CRITICAL FIX: Wait longer for message processing (extended from 200ms to 1500ms)
            await communicator.delay(1500);
            
            addDebugLog('Message processing wait completed, starting window close sequence...', 'info');
            
            // Attempt to close the window (now with extended timing)
            await communicator.closeWindow();
            
          } catch (error) {
            addDebugLog(\`Critical error in OAuth callback: \${error.message}\`, 'error');
            console.error('OAuth callback error:', error);
            
            // Show error to user but still try to send message
            const successMsg = document.querySelector('.success-message');
            const closeMsg = document.querySelector('.close-message');
            
            if (successMsg) successMsg.textContent = 'Authentication completed with warnings';
            if (closeMsg) closeMsg.innerHTML = 
              'Please close this window manually. If the main page does not update, please refresh it.';
              
            // Still try to send the success message even with error
            try {
              const communicator = new PopupCommunicator();
              await communicator.sendMessage();
            } catch (secondaryError) {
              addDebugLog(\`Secondary message send failed: \${secondaryError.message}\`, 'error');
            }
          }
        }
        
        // Event listeners
        window.addEventListener('beforeunload', () => {
          addDebugLog('Window is being closed', 'info');
        });
        
        window.addEventListener('error', (event) => {
          addDebugLog(\`JavaScript error: \${event.error?.message || event.message}\`, 'error');
        });
        
        // Start the process with enhanced timing
        addDebugLog('Starting OAuth callback process in 500ms (extended for stability)', 'info');
        setTimeout(runOAuthCallback, 500);
        
        // Backup execution on DOM ready with longer delay
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
              addDebugLog('DOM ready - running backup execution', 'warning');
              runOAuthCallback();
            }, 800);
          });
        }
        
        // Additional backup - ensure execution even if other timers fail
        setTimeout(() => {
          addDebugLog('Final backup execution timer (safety net)', 'warning');
          runOAuthCallback();
        }, 1000);
        
      })();
    </script>
  </body>
</html>`;
}

// Create OAuth error response with popup that sends error to parent - ENHANCED
function createOAuthErrorResponse(errorCode, errorMessage, env) {
  console.log('🚨 Creating ENHANCED OAuth error response:', { errorCode, errorMessage });
  
  const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Error - Lucaverse</title>
    <style>
      body {
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: linear-gradient(135deg, #040810 0%, #2a0a0a 100%);
        color: #FF6B6B;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
        text-align: center;
        overflow: hidden;
      }
      .container {
        padding: 40px;
        max-width: 500px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 15px;
        border: 1px solid rgba(255, 107, 107, 0.2);
        backdrop-filter: blur(10px);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      }
      .error-icon {
        font-size: 60px;
        margin-bottom: 20px;
        animation: shake 1s ease-in-out;
      }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
      }
      .error-message {
        color: #FF6B6B;
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 15px;
      }
      .error-details {
        color: rgba(255, 255, 255, 0.8);
        font-size: 14px;
        margin-bottom: 20px;
      }
      .close-message {
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
        margin-bottom: 20px;
      }
      .debug-info {
        color: rgba(255, 255, 255, 0.5);
        font-size: 11px;
        font-family: 'Courier New', monospace;
        background: rgba(0, 0, 0, 0.4);
        border-radius: 8px;
        padding: 15px;
        margin-top: 20px;
        text-align: left;
        border: 1px solid rgba(255, 107, 107, 0.1);
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="error-icon">⚠️</div>
      <div class="error-message">Authentication Failed</div>
      <div class="error-details">Please try again or contact support if the problem persists.</div>
      <div class="close-message">This window will close automatically...</div>
      <div class="debug-info" id="debug-info">
        Error Code: ${errorCode}<br>
        Details: ${errorMessage}
      </div>
    </div>
    
    <script>
      (function() {
        'use strict';
        
        const debugInfo = document.getElementById('debug-info');
        
        function addDebugLog(message) {
          const timestamp = new Date().toISOString().slice(11, 23);
          debugInfo.innerHTML += '<br>' + timestamp + ' - ' + message;
          debugInfo.scrollTop = debugInfo.scrollHeight;
          console.log(message);
        }
        
        addDebugLog('OAuth error callback started');
        addDebugLog('Error Code: ${errorCode}');
        addDebugLog('Error Message: ${errorMessage}');
        
        function attemptErrorClose() {
          try {
            const errorData = {
              type: 'OAUTH_ERROR',
              error: '${errorMessage}',
              errorCode: '${errorCode}',
              timestamp: Date.now(),
              debug: {
                workerOrigin: window.location.origin,
                frontendUrl: '${env.FRONTEND_URL}',
                timestamp: new Date().toISOString()
              }
            };
            
            addDebugLog('Sending error message to parent windows');
            
            const targets = [];
            if (window.opener && !window.opener.closed) targets.push({ win: window.opener, name: 'opener' });
            if (window.parent && window.parent !== window) targets.push({ win: window.parent, name: 'parent' });
            if (window.top && window.top !== window) targets.push({ win: window.top, name: 'top' });
            
            let messageSent = false;
            
            targets.forEach(target => {
              try {
                // Try specific origin first
                target.win.postMessage(errorData, '${env.FRONTEND_URL}');
                addDebugLog(\`Error sent to \${target.name} (specific origin)\`);
                messageSent = true;
              } catch (e) {
                try {
                  // Fallback to wildcard
                  target.win.postMessage(errorData, '*');
                  addDebugLog(\`Error sent to \${target.name} (wildcard)\`);
                  messageSent = true;
                } catch (e2) {
                  addDebugLog(\`Failed to send to \${target.name}: \${e2.message}\`);
                }
              }
            });
            
            if (!messageSent) {
              addDebugLog('No error message could be sent to any target');
            }
            
            // Close window attempts
            setTimeout(() => {
              addDebugLog('Attempting to close window');
              try {
                window.close();
              } catch (e) {
                addDebugLog('Window close failed: ' + e.message);
              }
            }, 1000);
            
            setTimeout(() => {
              if (!window.closed) {
                addDebugLog('Forcing window close');
                try {
                  window.location.href = 'about:blank';
                } catch (e) {
                  addDebugLog('Navigation failed: ' + e.message);
                }
              }
            }, 3000);
            
          } catch (error) {
            addDebugLog('Critical error in error handler: ' + error.message);
            console.error('OAuth error callback error:', error);
          }
        }
        
        setTimeout(attemptErrorClose, 100);
        
      })();
    </script>
  </body>
</html>`;
  
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
      'X-Frame-Options': 'SAMEORIGIN',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

// Check if user email is whitelisted - ENHANCED
async function checkWhitelist(email, env) {
  try {
    console.log('🔍 Checking whitelist for email:', email);
    
    const whitelistData = await env.USER_WHITELIST.get('users');
    console.log('📄 Whitelist data retrieved:', whitelistData ? 'present' : 'missing');
    
    if (!whitelistData) {
      console.log('❌ No whitelist data found in KV store');
      return false;
    }
    
    const whitelist = JSON.parse(whitelistData);
    console.log('📋 Parsed whitelist:', { 
      hasEmails: !!whitelist.emails, 
      emailCount: whitelist.emails ? whitelist.emails.length : 0,
      emails: whitelist.emails || []
    });
    
    const isWhitelisted = whitelist.emails && whitelist.emails.includes(email);
    console.log('🔍 Whitelist check result:', isWhitelisted ? 'APPROVED' : 'DENIED');
    
    return isWhitelisted;
  } catch (error) {
    console.error('💥 Whitelist check error:', error.message);
    console.error('📚 Stack trace:', error.stack);
    return false;
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

// Handle debug log saving
async function handleSaveDebugLogs(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const logData = await request.json();
    const timestamp = new Date().toISOString();
    const logKey = `debug_logs_${logData.sessionId || timestamp}`;
    
    // Store logs in KV for later analysis
    await env.OAUTH_SESSIONS.put(logKey, JSON.stringify({
      ...logData,
      savedAt: timestamp,
      ip: request.headers.get('CF-Connecting-IP'),
      userAgent: request.headers.get('User-Agent')
    }), {
      expirationTtl: 24 * 60 * 60 // Keep logs for 24 hours
    });

    console.log('💾 Debug logs saved:', {
      sessionId: logData.sessionId,
      logCount: logData.totalLogs,
      duration: logData.duration,
      key: logKey
    });

    return new Response(JSON.stringify({ 
      success: true, 
      logKey,
      message: 'Debug logs saved successfully' 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Failed to save debug logs:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle TXT debug log saving
async function handleSaveTxtLogs(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const txtContent = await request.text();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `oauth-debug-${timestamp}.txt`;
    
    console.log('📝 TXT Debug logs received:', {
      filename: filename,
      size: txtContent.length,
      preview: txtContent.substring(0, 200) + '...'
    });
    
    // For now, log the content (could be enhanced to save to R2 storage)
    console.log('=== TXT LOG CONTENT ===');
    console.log(txtContent);
    console.log('=== END LOG CONTENT ===');
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'TXT logs received and logged to worker console', 
      filename: filename,
      size: txtContent.length 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Failed to save TXT debug logs:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
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