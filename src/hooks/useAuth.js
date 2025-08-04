import { useState, useEffect } from 'react';
import { getAuthEndpoint, validateEndpoint } from '../config/api';
import { secureStorage, SecureCookies, FallbackStorage } from '../utils/secureStorage';
import { authLogger } from '../utils/logger.js';

// SECURITY: Helper functions for secure token storage
export const storeAuthTokensSecurely = async (token, sessionId) => {
  try {
    // Primary: Use secure encrypted storage if available
    if (secureStorage.isAvailable()) {
      await secureStorage.secureSetItem('auth_token', token, { ttl: 7 * 24 * 60 * 60 * 1000 }); // 7 days
      await secureStorage.secureSetItem('session_id', sessionId, { ttl: 7 * 24 * 60 * 60 * 1000 });
      return;
    }
    
    // Fallback: Use simple obfuscation
    FallbackStorage.setItem('auth_token', token);
    FallbackStorage.setItem('session_id', sessionId);
  } catch (error) {
    authLogger.error('Failed to store auth tokens securely:', error);
    // Last resort: plain storage (will be removed in production)
    sessionStorage.setItem('auth_token', token);
    sessionStorage.setItem('session_id', sessionId);
  }
};

const getAuthTokensSecurely = async () => {
  try {
    // Primary: Check for httpOnly cookies (most secure)
    if (SecureCookies.hasAuthCookies()) {
      return {
        storedToken: SecureCookies.get('auth_token'),
        storedSessionId: SecureCookies.get('auth_session')
      };
    }
    
    // Secondary: Try secure encrypted storage
    if (secureStorage.isAvailable()) {
      const token = await secureStorage.secureGetItem('auth_token');
      const sessionId = await secureStorage.secureGetItem('session_id');
      if (token && sessionId) {
        return { storedToken: token, storedSessionId: sessionId };
      }
    }
    
    // Fallback: Try obfuscated storage
    const fallbackToken = FallbackStorage.getItem('auth_token');
    const fallbackSessionId = FallbackStorage.getItem('session_id');
    if (fallbackToken && fallbackSessionId) {
      return { storedToken: fallbackToken, storedSessionId: fallbackSessionId };
    }
    
    // Last resort: Check plain storage (for migration)
    const plainToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    const plainSessionId = localStorage.getItem('session_id') || sessionStorage.getItem('session_id');
    
    if (plainToken && plainSessionId) {
      // Migrate to secure storage
      await storeAuthTokensSecurely(plainToken, plainSessionId);
      // Clear plain storage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('session_id');
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('session_id');
      
      return { storedToken: plainToken, storedSessionId: plainSessionId };
    }
    
    return { storedToken: null, storedSessionId: null };
  } catch (error) {
    authLogger.error('Failed to retrieve auth tokens securely:', error);
    return { storedToken: null, storedSessionId: null };
  }
};

const clearAuthTokensSecurely = async () => {
  try {
    // Clear all storage types
    if (secureStorage.isAvailable()) {
      secureStorage.secureRemoveItem('auth_token');
      secureStorage.secureRemoveItem('session_id');
    }
    
    FallbackStorage.removeItem('auth_token');
    FallbackStorage.removeItem('session_id');
    
    // Clear legacy plain storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('session_id');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('session_id');
    
    // Note: httpOnly cookies can only be cleared by the server
  } catch (error) {
    authLogger.error('Failed to clear auth tokens securely:', error);
  }
};

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const sessionId = urlParams.get('session');
      
      if (token && sessionId) {
        // SECURITY: Store tokens securely instead of plain localStorage
        await storeAuthTokensSecurely(token, sessionId);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      // SECURITY: Try to get tokens from secure storage or cookies
      const { storedToken, storedSessionId } = await getAuthTokensSecurely();
      
      if (storedToken && storedSessionId) {
        try {
          // SECURITY: Use centralized API configuration
          const verifyUrl = getAuthEndpoint(`/auth/verify?session=${storedSessionId}&token=${storedToken}`);
          
          // SECURITY: Validate endpoint before making request
          if (!validateEndpoint(verifyUrl)) {
            throw new Error('Invalid API endpoint');
          }
          
          const response = await fetch(verifyUrl, {
            credentials: 'include' // Include cookies for validation
          });
          const result = await response.json();
          
          if (result.valid) {
            setUser(result.user);
          } else {
            await clearAuthTokensSecurely();
          }
        } catch (error) {
          authLogger.error('Auth check failed:', error);
          await clearAuthTokensSecurely();
        }
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  const logout = async () => {
    // SECURITY: Get session ID from secure storage
    const { storedSessionId } = await getAuthTokensSecurely();
    
    if (storedSessionId) {
      try {
        // SECURITY: Use centralized API configuration
        const logoutUrl = getAuthEndpoint(`/auth/logout?session=${storedSessionId}`);
        
        // SECURITY: Validate endpoint before making request
        if (validateEndpoint(logoutUrl)) {
          await fetch(logoutUrl, {
            credentials: 'include' // Include cookies
          });
        }
      } catch (error) {
        authLogger.error('Logout error:', error);
      }
    }
    
    // SECURITY: Clear all token storage securely
    await clearAuthTokensSecurely();
    setUser(null);
    window.location.href = '/';
  };

  return { user, loading, logout };
};
