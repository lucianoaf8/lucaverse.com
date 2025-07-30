// Authentication utility functions
// Uses httpOnly cookies for secure token storage

import { logger } from './logger.js';

const API_BASE_URL = 'https://lucaverse-auth.lucianoaf8.workers.dev';

/**
 * Check if user is authenticated
 * @returns {Promise<{authenticated: boolean, user?: object}>}
 */
export const checkAuthStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'GET',
      credentials: 'include', // Include cookies in request
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      const result = await response.json();
      return {
        authenticated: result.valid === true,
        user: result.user || null
      };
    }

    return { authenticated: false, user: null };
  } catch (error) {
    logger.error('Auth status check failed:', error);
    return { authenticated: false, user: null };
  }
};

/**
 * Make authenticated API request
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<Response>}
 */
export const authenticatedFetch = async (endpoint, options = {}) => {
  const defaultOptions = {
    credentials: 'include', // Always include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  return fetch(endpoint, { ...defaultOptions, ...options });
};

/**
 * Refresh authentication token
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const refreshAuthToken = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      const result = await response.json();
      
      // Update session timestamp on successful refresh
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem('lucaverse_last_activity', Date.now().toString());
      }
      
      return { success: true, data: result };
    }

    const error = await response.text();
    return { success: false, error };
  } catch (error) {
    logger.error('Token refresh failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Handle logout
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    logger.error('Logout error:', error);
  }
  
  // Redirect to home page
  window.location.href = '/';
};