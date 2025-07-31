import { useState, useEffect } from 'react';
import { logger } from '../utils/logger.js';
import sessionManager from '../utils/sessionManager.js';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // REMOVED: Legacy URL token handling for security (LUCI-HIGH-002)
      // No longer check for tokens in URL parameters to prevent token leakage
      
      // Verify authentication status via API call (cookies will be sent automatically)
      try {
        const response = await fetch(
          'https://lucaverse-auth.lucianoaf8.workers.dev/auth/verify',
          {
            method: 'GET',
            credentials: 'include', // Important: this sends cookies with the request
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
        
        if (response.ok) {
          const result = await response.json();
          if (result.valid && result.user) {
            setUser(result.user);
            
            // Initialize session management for authenticated users
            await sessionManager.initialize();
          }
        }
      } catch (error) {
        logger.error('Auth check failed:', error);
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  const logout = async () => {
    try {
      // Cleanup session management
      sessionManager.cleanup();
      
      await fetch('https://lucaverse-auth.lucianoaf8.workers.dev/auth/logout', {
        method: 'POST',
        credentials: 'include', // Important: this sends cookies with the request
        headers: {
          'Content-Type': 'application/json',
        }
      });
    } catch (error) {
      logger.error('Logout error:', error);
    }
    
    setUser(null);
    window.location.href = '/';
  };

  return { user, loading, logout };
};
