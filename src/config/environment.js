// Environment configuration for different deployment contexts
export const getEnvironmentConfig = () => {
  const isLocalhost = window.location.hostname === 'localhost';
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname.includes('dev') || 
                       window.location.port === '5155';

  return {
    isDevelopment,
    isProduction: !isDevelopment,
    
    // Worker URLs
    authWorkerUrl: isLocalhost 
      ? 'https://lucaverse-auth-dev.lucianoaf8.workers.dev'
      : 'https://lucaverse-auth.lucianoaf8.workers.dev',
    
    formWorkerUrl: isLocalhost
      ? 'https://summer-heart-dev.lucianoaf8.workers.dev' // If you create a dev version
      : 'https://summer-heart.lucianoaf8.workers.dev',
    
    contactWorkerUrl: isLocalhost
      ? 'https://formerformfarmer-dev.lucianoaf8.workers.dev' // If you create a dev version  
      : 'https://formerformfarmer.lucianoaf8.workers.dev',
    
    // Frontend URLs
    frontendUrl: isLocalhost
      ? 'http://localhost:5155'
      : 'https://lucaverse.com',
    
    // OAuth redirect origins
    allowedOrigins: isLocalhost
      ? ['http://localhost:5155', 'https://lucaverse-auth-dev.lucianoaf8.workers.dev']
      : ['https://lucaverse.com', 'https://lucaverse-auth.lucianoaf8.workers.dev']
  };
};

// Export a singleton instance
export const ENV_CONFIG = getEnvironmentConfig();