// Whitelist Setup Script
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    // CORS headers - SECURITY: Restrict access to admin setup endpoint
    const allowedOrigins = [
      env.FRONTEND_URL || 'https://lucaverse.com',
      'https://lucaverse.com',
      'https://www.lucaverse.com',
      // Development origins for admin setup
      'http://localhost:5155',
      'http://localhost:3000'
    ];
    
    const origin = request.headers.get('Origin');
    const isAllowedOrigin = allowedOrigins.includes(origin);
    
    // SECURITY: Block unauthorized origins from accessing admin setup
    if (origin && !isAllowedOrigin) {
      return new Response('Forbidden: Origin not allowed', { 
        status: 403,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': isAllowedOrigin ? origin : env.FRONTEND_URL || 'https://lucaverse.com',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (pathname === '/setup-whitelist') {
        return await setupWhitelist(env);
      }

      return new Response('Setup endpoint not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    } catch (error) {
      console.error('Setup error:', error);
      return new Response(JSON.stringify({ 
        error: 'Setup failed', 
        details: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};

async function setupWhitelist(env) {
  try {
    // Admin users to whitelist
    const adminEmails = [
      'lucianoaf8@gmail.com'
    ];

    // Check if whitelist already exists
    const existingWhitelist = await env.USER_WHITELIST.get('users');
    let whitelistData = { emails: [] };
    
    if (existingWhitelist) {
      whitelistData = JSON.parse(existingWhitelist);
    }

    // Add admin emails if not already present
    let added = [];
    for (const email of adminEmails) {
      if (!whitelistData.emails.includes(email)) {
        whitelistData.emails.push(email);
        added.push(email);
      }
    }

    // Store updated whitelist
    await env.USER_WHITELIST.put('users', JSON.stringify(whitelistData));

    return new Response(JSON.stringify({
      success: true,
      message: 'Whitelist setup completed',
      totalUsers: whitelistData.emails.length,
      newlyAdded: added,
      allUsers: whitelistData.emails
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Whitelist setup error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Whitelist setup failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
