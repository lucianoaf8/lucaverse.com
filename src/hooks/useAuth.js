import { useState, useEffect } from 'react';
import { logger } from '../utils/logger.js';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Check if there are tokens in URL params (legacy support - should be removed)
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const sessionId = urlParams.get('session');
      
      if (token && sessionId) {
        // If tokens are in URL, redirect to server endpoint to set secure cookies
        window.location.href = `https://lucaverse-auth.lucianoaf8.workers.dev/auth/set-cookies?token=${encodeURIComponent(token)}&session=${encodeURIComponent(sessionId)}&redirect=${encodeURIComponent(window.location.origin + window.location.pathname)}`;
        return;
      }
      
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
