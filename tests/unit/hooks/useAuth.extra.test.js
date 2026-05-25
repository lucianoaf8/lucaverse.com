/**
 * Extra useAuth tests to cover lines 20-24 and 95-96.
 *
 * Lines 20-24: storeAuthTokensSecurely catch block — when secureSetItem throws,
 *   falls back to plain sessionStorage.
 * Lines 95-96: clearAuthTokensSecurely catch block — when clearing throws.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { storeAuthTokensSecurely, useAuth } from '../../../src/hooks/useAuth';
import { HookTestWrapper } from '../../setup/reactTestHelpers';

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
    get: jest.fn(() => null),
  },
  FallbackStorage: {
    setItem: jest.fn(),
    getItem: jest.fn(() => null),
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
  value: { replaceState: jest.fn() },
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

describe('storeAuthTokensSecurely — catch block (lines 20-24)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { secureStorage } = require('../../../src/utils/secureStorage');
    secureStorage.isAvailable.mockReturnValue(true);
    secureStorage.secureSetItem.mockResolvedValue(undefined);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('falls back to plain sessionStorage when secureSetItem throws', async () => {
    const { secureStorage } = require('../../../src/utils/secureStorage');
    const { authLogger } = require('../../../src/utils/logger.js');

    // Make secureSetItem throw to force the catch block
    secureStorage.secureSetItem.mockRejectedValue(new Error('Storage error'));

    await storeAuthTokensSecurely('tok123', 'sess456');

    // Should log the error
    expect(authLogger.error).toHaveBeenCalledWith(
      'Failed to store auth tokens securely:',
      expect.any(Error)
    );

    // Should fall back to plain sessionStorage
    expect(Storage.prototype.setItem).toHaveBeenCalledWith('auth_token', 'tok123');
    expect(Storage.prototype.setItem).toHaveBeenCalledWith('session_id', 'sess456');
  });
});

describe('clearAuthTokensSecurely — catch block (lines 95-96)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();

    const { secureStorage, SecureCookies, FallbackStorage } = require('../../../src/utils/secureStorage');
    secureStorage.isAvailable.mockReturnValue(true);
    secureStorage.secureGetItem.mockResolvedValue(null);
    secureStorage.secureSetItem.mockResolvedValue(undefined);
    secureStorage.secureRemoveItem.mockReturnValue(undefined);
    SecureCookies.hasAuthCookies.mockReturnValue(false);
    SecureCookies.get.mockReturnValue(null);
    FallbackStorage.getItem.mockReturnValue(null);
    FallbackStorage.removeItem.mockReturnValue(undefined);

    const { validateEndpoint } = require('../../../src/config/api');
    validateEndpoint.mockReturnValue(true);

    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs error but does not throw when clearAuthTokensSecurely internals fail', async () => {
    const { secureStorage } = require('../../../src/utils/secureStorage');
    const { authLogger } = require('../../../src/utils/logger.js');

    // Make secureRemoveItem throw to force the catch block in clearAuthTokensSecurely
    secureStorage.secureRemoveItem.mockImplementation(() => {
      throw new Error('Remove failed');
    });

    // Use key-based implementation so tokens exist to trigger the logout path
    secureStorage.secureGetItem.mockImplementation((key) => {
      if (key === 'auth_token') return Promise.resolve('test-token');
      if (key === 'session_id') return Promise.resolve('test-session');
      return Promise.resolve(null);
    });

    global.fetch
      .mockResolvedValueOnce({
        json: async () => ({ valid: true, user: { id: '1', name: 'Test', email: 'test@test.com', permissions: [] } }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true }),
      });

    const { result } = renderHook(() => useAuth(), { wrapper: HookTestWrapper });

    // Wait for initial auth
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Perform logout — should trigger clearAuthTokensSecurely which will throw
    // Delete window.location to allow href assignment
    delete window.location;
    window.location = { href: '' };

    await act(async () => {
      await result.current.logout();
    });

    // authLogger.error should have been called with the clear error
    expect(authLogger.error).toHaveBeenCalledWith(
      'Failed to clear auth tokens securely:',
      expect.any(Error)
    );
  });
});
