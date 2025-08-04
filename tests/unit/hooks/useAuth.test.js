import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '../../../src/hooks/useAuth';

// Mock all dependencies
jest.mock('../../../src/config/api', () => ({
  getAuthEndpoint: jest.fn((path) => `https://auth.example.com${path}`),
  validateEndpoint: jest.fn(() => true),
}));

jest.mock('../../../src/utils/secureStorage', () => ({
  secureStorage: {
    isAvailable: jest.fn(() => true),
    secureSetItem: jest.fn(),
    secureGetItem: jest.fn(),
    secureRemoveItem: jest.fn(),
  },
  SecureCookies: {
    hasAuthCookies: jest.fn(() => false),
    get: jest.fn(),
  },
  FallbackStorage: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('../../../src/utils/logger.js', () => ({
  authLogger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock window.history
Object.defineProperty(window, 'history', {
  writable: true,
  value: {
    replaceState: jest.fn(),
  },
});

// Mock window.location
Object.defineProperty(window, 'location', {
  writable: true,
  value: {
    search: '',
    pathname: '/',
    href: 'https://example.com',
  },
});

describe('useAuth Hook', () => {
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg',
    permissions: ['user'],
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    global.fetch = jest.fn();
    
    // Reset URL parameters
    window.location.search = '';
    window.location.pathname = '/';
    
    // Reset storage mocks
    const { secureStorage, SecureCookies, FallbackStorage } = require('../../../src/utils/secureStorage');
    secureStorage.secureGetItem.mockResolvedValue(null);
    SecureCookies.hasAuthCookies.mockReturnValue(false);
    FallbackStorage.getItem.mockReturnValue(null);
    localStorage.getItem = jest.fn().mockReturnValue(null);
    sessionStorage.getItem = jest.fn().mockReturnValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial Authentication Check', () => {
    it('starts with loading state', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBe(null);
    });

    it('processes URL tokens on mount', async () => {
      const mockSecureSetItem = require('../../../src/utils/secureStorage').secureStorage.secureSetItem;
      
      // Mock URL with tokens
      window.location.search = '?token=test-token&session=test-session';
      
      renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(mockSecureSetItem).toHaveBeenCalledWith('auth_token', 'test-token', { ttl: 7 * 24 * 60 * 60 * 1000 });
        expect(mockSecureSetItem).toHaveBeenCalledWith('session_id', 'test-session', { ttl: 7 * 24 * 60 * 60 * 1000 });
        expect(window.history.replaceState).toHaveBeenCalled();
      });
    });

    it('validates existing tokens successfully', async () => {
      const { secureStorage } = require('../../../src/utils/secureStorage');
      
      // Mock existing tokens
      secureStorage.secureGetItem
        .mockResolvedValueOnce('test-token')
        .mockResolvedValueOnce('test-session');
      
      // Mock successful validation
      global.fetch.mockResolvedValue({
        json: async () => ({ valid: true, user: mockUser }),
      });
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.user).toEqual(mockUser);
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://auth.example.com/auth/verify?session=test-session&token=test-token',
        { credentials: 'include' }
      );
    });

    it('handles invalid tokens by clearing storage', async () => {
      const { secureStorage } = require('../../../src/utils/secureStorage');
      const mockSecureRemoveItem = secureStorage.secureRemoveItem;
      
      // Mock existing tokens
      secureStorage.secureGetItem
        .mockResolvedValueOnce('invalid-token')
        .mockResolvedValueOnce('invalid-session');
      
      // Mock invalid validation
      global.fetch.mockResolvedValue({
        json: async () => ({ valid: false }),
      });
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.user).toBe(null);
      });
      
      expect(mockSecureRemoveItem).toHaveBeenCalledWith('auth_token');
      expect(mockSecureRemoveItem).toHaveBeenCalledWith('session_id');
    });

    it('falls back to different storage methods when secure storage fails', async () => {
      const { secureStorage, FallbackStorage } = require('../../../src/utils/secureStorage');
      
      // Mock secure storage failure
      secureStorage.isAvailable.mockReturnValue(false);
      
      // Mock fallback storage
      FallbackStorage.getItem
        .mockReturnValueOnce('fallback-token')
        .mockReturnValueOnce('fallback-session');
      
      // Mock successful validation
      global.fetch.mockResolvedValue({
        json: async () => ({ valid: true, user: mockUser }),
      });
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
    });

    it('migrates from plain storage to secure storage', async () => {
      const { secureStorage } = require('../../../src/utils/secureStorage');
      const mockSecureSetItem = secureStorage.secureSetItem;
      
      // Mock plain storage tokens
      localStorage.getItem = jest.fn()
        .mockReturnValueOnce('plain-token')
        .mockReturnValueOnce('plain-session');
      
      localStorage.removeItem = jest.fn();
      sessionStorage.removeItem = jest.fn();
      
      // Mock successful validation
      global.fetch.mockResolvedValue({
        json: async () => ({ valid: true, user: mockUser }),
      });
      
      renderHook(() => useAuth());
      
      await waitFor(() => {
        // Should migrate to secure storage
        expect(mockSecureSetItem).toHaveBeenCalledWith('auth_token', 'plain-token', { ttl: 7 * 24 * 60 * 60 * 1000 });
        expect(mockSecureSetItem).toHaveBeenCalledWith('session_id', 'plain-session', { ttl: 7 * 24 * 60 * 60 * 1000 });
        
        // Should clear plain storage
        expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
        expect(localStorage.removeItem).toHaveBeenCalledWith('session_id');
      });
    });
  });

  describe('HttpOnly Cookie Support', () => {
    it('prioritizes httpOnly cookies over other storage', async () => {
      const { SecureCookies } = require('../../../src/utils/secureStorage');
      
      // Mock httpOnly cookies
      SecureCookies.hasAuthCookies.mockReturnValue(true);
      SecureCookies.get
        .mockReturnValueOnce('cookie-token')
        .mockReturnValueOnce('cookie-session');
      
      // Mock successful validation
      global.fetch.mockResolvedValue({
        json: async () => ({ valid: true, user: mockUser }),
      });
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
      
      // Should use cookie values for validation
      expect(global.fetch).toHaveBeenCalledWith(
        'https://auth.example.com/auth/verify?session=cookie-session&token=cookie-token',
        { credentials: 'include' }
      );
    });
  });

  describe('Error Handling', () => {
    it('handles network errors during token validation', async () => {
      const { secureStorage } = require('../../../src/utils/secureStorage');
      const { authLogger } = require('../../../src/utils/logger.js');
      
      // Mock existing tokens
      secureStorage.secureGetItem
        .mockResolvedValueOnce('test-token')
        .mockResolvedValueOnce('test-session');
      
      // Mock network error
      global.fetch.mockRejectedValue(new Error('Network error'));
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.user).toBe(null);
      });
      
      expect(authLogger.error).toHaveBeenCalledWith('Auth check failed:', expect.any(Error));
    });

    it('handles invalid API endpoints', async () => {
      const { validateEndpoint } = require('../../../src/config/api');
      const { secureStorage } = require('../../../src/utils/secureStorage');
      
      // Mock invalid endpoint
      validateEndpoint.mockReturnValue(false);
      
      // Mock existing tokens
      secureStorage.secureGetItem
        .mockResolvedValueOnce('test-token')
        .mockResolvedValueOnce('test-session');
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.user).toBe(null);
      });
      
      // Should not make fetch request
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('handles storage errors gracefully', async () => {
      const { secureStorage } = require('../../../src/utils/secureStorage');
      const { authLogger } = require('../../../src/utils/logger.js');
      
      // Mock storage error
      secureStorage.secureGetItem.mockRejectedValue(new Error('Storage error'));
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.user).toBe(null);
      });
      
      expect(authLogger.error).toHaveBeenCalledWith('Failed to retrieve auth tokens securely:', expect.any(Error));
    });
  });

  describe('Logout Functionality', () => {
    it('performs logout with session cleanup', async () => {
      const { secureStorage } = require('../../../src/utils/secureStorage');
      const mockSecureRemoveItem = secureStorage.secureRemoveItem;
      
      // Mock existing session
      secureStorage.secureGetItem
        .mockResolvedValueOnce('test-token')
        .mockResolvedValueOnce('test-session')
        .mockResolvedValueOnce(null) // for logout call
        .mockResolvedValueOnce('test-session'); // for logout call
      
      // Mock successful validation
      global.fetch
        .mockResolvedValueOnce({
          json: async () => ({ valid: true, user: mockUser }),
        })
        .mockResolvedValueOnce({
          json: async () => ({ success: true }),
        });
      
      const { result } = renderHook(() => useAuth());
      
      // Wait for initial auth
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
      
      // Perform logout
      await act(async () => {
        await result.current.logout();
      });
      
      // Should call logout endpoint
      expect(global.fetch).toHaveBeenCalledWith(
        'https://auth.example.com/auth/logout?session=test-session',
        { credentials: 'include' }
      );
      
      // Should clear storage
      expect(mockSecureRemoveItem).toHaveBeenCalledWith('auth_token');
      expect(mockSecureRemoveItem).toHaveBeenCalledWith('session_id');
      
      // Should clear user state
      expect(result.current.user).toBe(null);
    });

    it('handles logout errors gracefully', async () => {
      const { secureStorage } = require('../../../src/utils/secureStorage');
      const { authLogger } = require('../../../src/utils/logger.js');
      
      // Mock existing session
      secureStorage.secureGetItem
        .mockResolvedValueOnce('test-token')
        .mockResolvedValueOnce('test-session')
        .mockResolvedValueOnce(null) // for logout call
        .mockResolvedValueOnce('test-session'); // for logout call
      
      // Mock successful validation, failed logout
      global.fetch
        .mockResolvedValueOnce({
          json: async () => ({ valid: true, user: mockUser }),
        })
        .mockRejectedValueOnce(new Error('Logout failed'));
      
      const { result } = renderHook(() => useAuth());
      
      // Wait for initial auth
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
      
      // Perform logout
      await act(async () => {
        await result.current.logout();
      });
      
      // Should log error but still clear local state
      expect(authLogger.error).toHaveBeenCalledWith('Logout error:', expect.any(Error));
      expect(result.current.user).toBe(null);
    });

    it('redirects to home after logout', async () => {
      const { secureStorage } = require('../../../src/utils/secureStorage');
      
      // Mock existing session
      secureStorage.secureGetItem
        .mockResolvedValueOnce('test-token')
        .mockResolvedValueOnce('test-session')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('test-session');
      
      // Mock successful validation and logout
      global.fetch
        .mockResolvedValueOnce({
          json: async () => ({ valid: true, user: mockUser }),
        })
        .mockResolvedValueOnce({
          json: async () => ({ success: true }),
        });
      
      // Mock window.location.href setter
      delete window.location;
      window.location = { href: '' };
      
      const { result } = renderHook(() => useAuth());
      
      // Wait for initial auth
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
      
      // Perform logout
      await act(async () => {
        await result.current.logout();
      });
      
      // Should redirect to home
      expect(window.location.href).toBe('/');
    });
  });

  describe('Token Storage Security', () => {
    it('stores tokens securely with TTL', async () => {
      const { secureStorage } = require('../../../src/utils/secureStorage');
      const mockSecureSetItem = secureStorage.secureSetItem;
      
      // Mock URL with tokens
      window.location.search = '?token=secure-token&session=secure-session';
      
      renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(mockSecureSetItem).toHaveBeenCalledWith('auth_token', 'secure-token', { 
          ttl: 7 * 24 * 60 * 60 * 1000 
        });
        expect(mockSecureSetItem).toHaveBeenCalledWith('session_id', 'secure-session', { 
          ttl: 7 * 24 * 60 * 60 * 1000 
        });
      });
    });

    it('falls back to obfuscated storage when secure storage unavailable', async () => {
      const { secureStorage, FallbackStorage } = require('../../../src/utils/secureStorage');
      const { authLogger } = require('../../../src/utils/logger.js');
      
      // Mock secure storage failure
      secureStorage.isAvailable.mockReturnValue(false);
      
      // Mock URL with tokens
      window.location.search = '?token=fallback-token&session=fallback-session';
      
      renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(FallbackStorage.setItem).toHaveBeenCalledWith('auth_token', 'fallback-token');
        expect(FallbackStorage.setItem).toHaveBeenCalledWith('session_id', 'fallback-session');
      });
    });

    it('clears all storage types on logout', async () => {
      const { secureStorage, FallbackStorage } = require('../../../src/utils/secureStorage');
      const mockSecureRemoveItem = secureStorage.secureRemoveItem;
      const mockFallbackRemoveItem = FallbackStorage.removeItem;
      
      // Mock localStorage and sessionStorage
      localStorage.removeItem = jest.fn();
      sessionStorage.removeItem = jest.fn();
      
      // Mock existing session
      secureStorage.secureGetItem
        .mockResolvedValueOnce('test-token')
        .mockResolvedValueOnce('test-session')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('test-session');
      
      global.fetch
        .mockResolvedValueOnce({
          json: async () => ({ valid: true, user: mockUser }),
        })
        .mockResolvedValueOnce({
          json: async () => ({ success: true }),
        });
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
      
      await act(async () => {
        await result.current.logout();
      });
      
      // Should clear all storage types
      expect(mockSecureRemoveItem).toHaveBeenCalledWith('auth_token');
      expect(mockSecureRemoveItem).toHaveBeenCalledWith('session_id');
      expect(mockFallbackRemoveItem).toHaveBeenCalledWith('auth_token');
      expect(mockFallbackRemoveItem).toHaveBeenCalledWith('session_id');
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('session_id');
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('session_id');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing URL parameters gracefully', async () => {
      // No URL parameters
      window.location.search = '';
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.user).toBe(null);
      });
      
      // Should not attempt to store anything
      const { secureStorage } = require('../../../src/utils/secureStorage');
      expect(secureStorage.secureSetItem).not.toHaveBeenCalled();
    });

    it('handles partial URL parameters', async () => {
      // Only token, no session
      window.location.search = '?token=only-token';
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      // Should not store incomplete auth data
      const { secureStorage } = require('../../../src/utils/secureStorage');
      expect(secureStorage.secureSetItem).not.toHaveBeenCalled();
    });

    it('handles logout without existing session', async () => {
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      // Should handle logout gracefully even without session
      await act(async () => {
        await result.current.logout();
      });
      
      expect(result.current.user).toBe(null);
    });

    it('handles concurrent authentication attempts', async () => {
      const { secureStorage } = require('../../../src/utils/secureStorage');
      
      // Mock existing tokens
      secureStorage.secureGetItem
        .mockResolvedValue('test-token')
        .mockResolvedValue('test-session');
      
      // Mock delayed validation
      global.fetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            json: async () => ({ valid: true, user: mockUser }),
          }), 100)
        )
      );
      
      // Render multiple hooks concurrently
      const { result: result1 } = renderHook(() => useAuth());
      const { result: result2 } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
        expect(result2.current.loading).toBe(false);
      });
      
      // Both should have the same user
      expect(result1.current.user).toEqual(mockUser);
      expect(result2.current.user).toEqual(mockUser);
    });
  });

  describe('Performance', () => {
    it('does not perform unnecessary validation calls', async () => {
      const { secureStorage } = require('../../../src/utils/secureStorage');
      
      // Mock no existing tokens
      secureStorage.secureGetItem.mockResolvedValue(null);
      
      const { rerender } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(global.fetch).not.toHaveBeenCalled();
      });
      
      // Re-render should not trigger additional calls
      rerender();
      
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('caches authentication state appropriately', async () => {
      const { secureStorage } = require('../../../src/utils/secureStorage');
      
      // Mock existing tokens
      secureStorage.secureGetItem
        .mockResolvedValueOnce('test-token')
        .mockResolvedValueOnce('test-session');
      
      global.fetch.mockResolvedValue({
        json: async () => ({ valid: true, user: mockUser }),
      });
      
      const { result, rerender } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
      
      // Re-render should not trigger new validation
      rerender();
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.current.user).toEqual(mockUser);
    });
  });
});