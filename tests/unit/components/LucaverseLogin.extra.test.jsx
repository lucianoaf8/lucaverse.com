/**
 * Extra LucaverseLogin tests to cover lines 63-77, 91-94, 99-101, 106-108.
 *
 * These cover:
 * - handleOAuthResult called with OAUTH_SUCCESS → stores tokens, redirects
 * - handleOAuthResult called with OAUTH_ERROR → shows alert
 * - messageHandler origin mismatch → skipped
 * - cleanup function execution
 * - Timeout expiry path
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import LucaverseLogin from '../../../src/components/LucaverseLogin/LucaverseLogin';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => {
      const translations = {
        'login.enterThe': 'Enter the',
        'login.lucaverse': 'Lucaverse',
        'login.chooseGateway': 'Choose Your Gateway',
        'login.connectWith': 'Connect with your preferred authentication method',
        'login.continueWithGoogle': 'Continue with Google',
        'login.continueWithMicrosoft': 'Continue with Microsoft',
        'login.initializing': 'Initializing connection...',
        'login.secureAuth': 'Secure Authentication',
        'login.termsAgreement': 'By continuing, you agree to our Terms of Service',
        'login.encryption': 'Protected by enterprise-grade encryption',
        'login.secureConnection': 'SECURE CONNECTION ESTABLISHED',
      };
      return translations[key] || fallback || key;
    },
  }),
}));

jest.mock('../../../src/components/Background/TronGrid.tsx', () => {
  return function MockTronGrid() {
    return <div data-testid="tron-grid">TronGrid</div>;
  };
});

jest.mock('../../../src/config/api', () => ({
  getAuthEndpoint: jest.fn((path) => `http://localhost:8787${path}`),
  validateEndpoint: jest.fn(() => true),
}));

const mockStoreAuthTokensSecurely = jest.fn();
jest.mock('../../../src/hooks/useAuth', () => ({
  storeAuthTokensSecurely: (...args) => mockStoreAuthTokensSecurely(...args),
}));

const mockWindowOpen = jest.fn();
const mockAlertFn = jest.fn();

Object.defineProperty(window, 'open', { writable: true, value: mockWindowOpen });
Object.defineProperty(window, 'alert', { writable: true, value: mockAlertFn });

// BroadcastChannel mock
let capturedBroadcastChannelInstance = null;
class MockBroadcastChannel {
  constructor(name) {
    this.name = name;
    this.onmessage = null;
    capturedBroadcastChannelInstance = this;
  }
  close() {}
}
global.BroadcastChannel = MockBroadcastChannel;

describe('LucaverseLogin — handleOAuthResult paths (lines 63-77)', () => {
  let mockPopup;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedBroadcastChannelInstance = null;
    mockStoreAuthTokensSecurely.mockResolvedValue(undefined);
    mockAlertFn.mockReturnValue(undefined);

    mockPopup = { focus: jest.fn(), closed: false };
    mockWindowOpen.mockReturnValue(mockPopup);

    // Ensure validateEndpoint returns true
    const { validateEndpoint } = require('../../../src/config/api');
    validateEndpoint.mockReturnValue(true);

    // Reset location.hash
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { origin: 'http://localhost', hash: '', href: 'http://localhost' },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('OAUTH_SUCCESS via BroadcastChannel (lines 63-70)', () => {
    it('calls storeAuthTokensSecurely with token and sessionId on OAUTH_SUCCESS', async () => {
      jest.useFakeTimers();
      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
      fireEvent.click(googleButton);

      // Wait for BroadcastChannel to be created
      expect(capturedBroadcastChannelInstance).not.toBeNull();

      // Simulate OAUTH_SUCCESS message via BroadcastChannel
      await act(async () => {
        capturedBroadcastChannelInstance.onmessage({
          data: { type: 'OAUTH_SUCCESS', token: 'my-token', sessionId: 'my-session' }
        });
      });

      expect(mockStoreAuthTokensSecurely).toHaveBeenCalledWith('my-token', 'my-session');

      // Advance timers to trigger the redirect setTimeout (1500ms)
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      jest.useRealTimers();
    });

    it('redirects to dashboard hash after OAUTH_SUCCESS', async () => {
      jest.useFakeTimers();
      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
      fireEvent.click(googleButton);

      await act(async () => {
        capturedBroadcastChannelInstance.onmessage({
          data: { type: 'OAUTH_SUCCESS', token: 'tok', sessionId: 'sess' }
        });
      });

      // Advance timers past 1500ms
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // window.location.hash should have been set to 'dashboard'
      expect(window.location.hash).toBe('dashboard');

      jest.useRealTimers();
    });
  });

  describe('OAUTH_ERROR via BroadcastChannel (lines 70-77)', () => {
    it('shows alert with failure message on OAUTH_ERROR', async () => {
      jest.useFakeTimers();
      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
      fireEvent.click(googleButton);

      await act(async () => {
        capturedBroadcastChannelInstance.onmessage({
          data: { type: 'OAUTH_ERROR', error: 'access_denied' }
        });
      });

      // Advance timers past 1500ms
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockAlertFn).toHaveBeenCalledWith('Authentication failed. Please try again.');

      jest.useRealTimers();
    });

    it('sets loading to false after OAUTH_ERROR', async () => {
      jest.useFakeTimers();
      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
      fireEvent.click(googleButton);

      // Initially loading
      expect(screen.getByText('Initializing connection...')).toBeInTheDocument();

      await act(async () => {
        capturedBroadcastChannelInstance.onmessage({
          data: { type: 'OAUTH_ERROR', error: 'denied' }
        });
      });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // After error + timeout, loading should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Initializing connection...')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('postMessage handler — origin mismatch (lines 91-94)', () => {
    it('ignores postMessage from different origin', async () => {
      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
      fireEvent.click(googleButton);

      // Send postMessage from wrong origin — should be ignored
      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: { type: 'OAUTH_SUCCESS', token: 'tok', sessionId: 'sess' },
          origin: 'https://evil.com'
        }));
      });

      // storeAuthTokensSecurely should NOT have been called
      expect(mockStoreAuthTokensSecurely).not.toHaveBeenCalled();
    });

    it('processes postMessage from correct origin', async () => {
      jest.useFakeTimers();
      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
      fireEvent.click(googleButton);

      // Send from correct origin
      await act(async () => {
        window.dispatchEvent(new MessageEvent('message', {
          data: { type: 'OAUTH_SUCCESS', token: 'postmsg-tok', sessionId: 'postmsg-sess' },
          origin: window.location.origin
        }));
      });

      expect(mockStoreAuthTokensSecurely).toHaveBeenCalledWith('postmsg-tok', 'postmsg-sess');

      act(() => { jest.advanceTimersByTime(2000); });
      jest.useRealTimers();
    });
  });

  describe('postMessage — unknown type ignored (line 92 false branch)', () => {
    it('ignores postMessage with unknown type (not OAUTH_SUCCESS or OAUTH_ERROR)', async () => {
      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
      fireEvent.click(googleButton);

      // Send message with wrong type from correct origin — should be ignored
      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: { type: 'SOME_OTHER_TYPE', foo: 'bar' },
          origin: window.location.origin,
        }));
      });

      // storeAuthTokensSecurely should NOT have been called
      expect(mockStoreAuthTokensSecurely).not.toHaveBeenCalled();
    });
  });

  describe('cleanup — bc.close() when bc is null (line 101 bc null branch)', () => {
    it('handles case when BroadcastChannel unavailable (bc is null)', async () => {
      // Temporarily make BroadcastChannel unavailable by setting it to undefined
      const origBC = global.BroadcastChannel;
      global.BroadcastChannel = undefined;
      capturedBroadcastChannelInstance = null;

      jest.useFakeTimers();
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
      act(() => { fireEvent.click(googleButton); });

      // No bc was created (BroadcastChannel undefined)
      expect(capturedBroadcastChannelInstance).toBeNull();

      // Advance to timeout — cleanup will run with bc=null
      act(() => { jest.advanceTimersByTime(300001); });

      consoleDebugSpy.mockRestore();
      jest.useRealTimers();
      global.BroadcastChannel = origBC;
    });
  });

  describe('Microsoft button hover (line 200)', () => {
    it('sets hoveredButton to microsoft on mouseEnter and null on mouseLeave', () => {
      render(<LucaverseLogin />);

      const microsoftButton = screen.getByRole('button', { name: /Continue with Microsoft/i });

      act(() => { fireEvent.mouseEnter(microsoftButton); });
      act(() => { fireEvent.mouseLeave(microsoftButton); });

      // Just verify no throw — the hover state changes are internal
      expect(microsoftButton).toBeInTheDocument();
    });
  });

  describe('Timeout path (lines 106-108)', () => {
    it('clears loading and logs after 5-minute timeout', async () => {
      jest.useFakeTimers();
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
      fireEvent.click(googleButton);

      // Advance 5 minutes (300000ms)
      act(() => {
        jest.advanceTimersByTime(300000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Initializing connection...')).not.toBeInTheDocument();
      });

      errSpy.mockRestore();
      jest.useRealTimers();
    });
  });

  describe('cleanup — bc.close() throws (line 101 catch branch)', () => {
    it('swallows error when bc.close() throws during cleanup', async () => {
      jest.useFakeTimers();
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
      fireEvent.click(googleButton);

      // Make bc.close() throw
      expect(capturedBroadcastChannelInstance).not.toBeNull();
      capturedBroadcastChannelInstance.close = () => { throw new Error('close failed'); };

      // Advance to timeout — cleanup() runs, bc.close() throws, error swallowed
      act(() => {
        jest.advanceTimersByTime(300000);
      });

      // No uncaught error — cleanup swallows it
      await waitFor(() => {
        expect(screen.queryByText('Initializing connection...')).not.toBeInTheDocument();
      });

      errSpy.mockRestore();
      jest.useRealTimers();
    });
  });
});
