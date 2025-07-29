import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const sessionId = urlParams.get('session');
      
      if (token) {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('session_id', sessionId);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      const storedToken = localStorage.getItem('auth_token');
      const storedSessionId = localStorage.getItem('session_id');
      
      if (storedToken && storedSessionId) {
        try {
          const response = await fetch(
            `https://lucaverse-auth.lucianoaf8.workers.dev/auth/verify?session=${storedSessionId}&token=${storedToken}`
          );
          const result = await response.json();
          
          if (result.valid) {
            setUser(result.user);
          } else {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('session_id');
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('session_id');
        }
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  const logout = async () => {
    const sessionId = localStorage.getItem('session_id');
    if (sessionId) {
      try {
        await fetch(`https://lucaverse-auth.lucianoaf8.workers.dev/auth/logout?session=${sessionId}`);
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    localStorage.removeItem('auth_token');
    localStorage.removeItem('session_id');
    setUser(null);
    window.location.href = '/';
  };

  return { user, loading, logout };
};
