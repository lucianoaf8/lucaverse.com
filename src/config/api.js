// SECURITY: Centralized API configuration to avoid hardcoded URLs
const getConfig = () => {
  // Check for environment variables (Vite uses VITE_ prefix)
  const authApiUrl = import.meta.env.VITE_AUTH_API_URL;
  const formsApiUrl = import.meta.env.VITE_FORMS_API_URL;
  const newsletterUrl = import.meta.env.VITE_NEWSLETTER_URL;
  const appUrl = import.meta.env.VITE_APP_URL;
  
  // Development environment detection
  const isDevelopment = import.meta.env.DEV;
  
  // Fallback URLs for different environments
  const defaults = {
    development: {
      authApi: 'http://localhost:8787',
      formsApi: 'http://localhost:8788',
      newsletter: 'https://newsletter.lucaverse.com',
      app: 'http://localhost:5155'
    },
    production: {
      authApi: 'https://lucaverse-auth.lucianoaf8.workers.dev',
      formsApi: 'https://summer-heart.lucianoaf8.workers.dev',
      newsletter: 'https://newsletter.lucaverse.com',
      app: 'https://lucaverse.com'
    }
  };
  
  const env = isDevelopment ? 'development' : 'production';
  
  return {
    authApi: authApiUrl || defaults[env].authApi,
    formsApi: formsApiUrl || defaults[env].formsApi,
    newsletter: newsletterUrl || defaults[env].newsletter,
    app: appUrl || defaults[env].app,
    isDevelopment
  };
};

export const API_CONFIG = getConfig();

// Utility functions for API endpoints
export const getAuthEndpoint = (path = '') => `${API_CONFIG.authApi}${path}`;
export const getFormsEndpoint = (path = '') => `${API_CONFIG.formsApi}${path}`;
export const getNewsletterUrl = () => API_CONFIG.newsletter;
export const getAppUrl = () => API_CONFIG.app;

// SECURITY: Validate API endpoints to prevent malicious URLs
export const validateEndpoint = (url) => {
  try {
    const parsedUrl = new URL(url);
    const allowedHosts = [
      'lucaverse-auth.lucianoaf8.workers.dev',
      'summer-heart.lucianoaf8.workers.dev',
      'newsletter.lucaverse.com',
      'lucaverse.com',
      'localhost' // For development
    ];
    
    return allowedHosts.some(host => 
      parsedUrl.hostname === host || 
      (host === 'localhost' && parsedUrl.hostname.includes('localhost'))
    );
  } catch {
    return false;
  }
};

// Debug function for development
export const logConfig = () => {
  if (API_CONFIG.isDevelopment) {
    console.log('🔧 API Configuration:', {
      authApi: API_CONFIG.authApi,
      formsApi: API_CONFIG.formsApi,
      newsletter: API_CONFIG.newsletter,
      app: API_CONFIG.app,
      environment: API_CONFIG.isDevelopment ? 'development' : 'production'
    });
  }
};

// Test function to verify environment variables are loaded
export const testEnvVars = () => {
  console.log('🧪 Environment Variables Test:', {
    VITE_AUTH_API_URL: import.meta.env.VITE_AUTH_API_URL,
    VITE_FORMS_API_URL: import.meta.env.VITE_FORMS_API_URL,
    VITE_NEWSLETTER_URL: import.meta.env.VITE_NEWSLETTER_URL,
    VITE_APP_URL: import.meta.env.VITE_APP_URL,
    DEV: import.meta.env.DEV,
    MODE: import.meta.env.MODE
  });
};