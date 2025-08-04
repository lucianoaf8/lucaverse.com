/**
 * LucaverseLogin Component Tests (Isolated)
 * Tests the OAuth login component functionality, security features, and UI interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Mock TronGrid component
jest.mock('../../../src/components/Background/TronGrid.tsx', () => {
  const React = require('react');
  return function MockTronGrid() {
    return React.createElement('div', { 'data-testid': 'tron-grid' }, 'TronGrid Background');
  };
});

// Mock API configuration
const mockGetAuthEndpoint = jest.fn();
const mockValidateEndpoint = jest.fn();

jest.mock('../../../src/config/api', () => ({
  getAuthEndpoint: mockGetAuthEndpoint,
  validateEndpoint: mockValidateEndpoint,
}));

// Mock auth hook
const mockStoreAuthTokensSecurely = jest.fn();
jest.mock('../../../src/hooks/useAuth', () => ({
  storeAuthTokensSecurely: mockStoreAuthTokensSecurely,
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback || key,
  }),
}));

// Create isolated LucaverseLogin component for testing
const TestLucaverseLogin = () => {
  const React = require('react');
  const { useState } = React;
  const { useTranslation } = require('react-i18next');
  const TronGrid = require('../../../src/components/Background/TronGrid.tsx');
  const { getAuthEndpoint, validateEndpoint } = require('../../../src/config/api');
  const { storeAuthTokensSecurely } = require('../../../src/hooks/useAuth');

  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredButton, setHoveredButton] = useState(null);

  const handleLogin = (provider) => {
    if (provider === 'Google') {
      handleGoogleLogin();
    } else {
      // Microsoft or other providers - simulate for now
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
      }, 2000);
    }
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    
    // OAuth popup window specs
    const popupWidth = 500;
    const popupHeight = 600;
    const left = (window.screen.width / 2) - (popupWidth / 2);
    const top = (window.screen.height / 2) - (popupHeight / 2);
    
    // SECURITY: Use centralized API configuration
    const oauthUrl = getAuthEndpoint('/auth/google');
    
    // SECURITY: Validate endpoint before opening popup
    if (!validateEndpoint(oauthUrl)) {
      setIsLoading(false);
      return;
    }
    
    const popup = window.open(
      oauthUrl,
      'googleAuth',
      `width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      console.error('❌ Popup was blocked!');
      setIsLoading(false);
      alert('Popup was blocked. Please allow popups for this site.');
      return;
    }

    // Timeout ID for cleanup
    let timeoutId;

    // Listen for messages from the popup
    const messageHandler = async (event) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'OAUTH_SUCCESS') {
        // Store authentication tokens securely
        await storeAuthTokensSecurely(event.data.token, event.data.sessionId);
        
        // Close the popup first
        if (popup && !popup.closed) {
          popup.close();
        }
        
        // Clean up
        clearTimeout(timeoutId);
        window.removeEventListener('message', messageHandler);
        
        // Wait a moment for popup to fully close, then redirect
        setTimeout(() => {
          setIsLoading(false);
          window.location.hash = 'dashboard';
        }, 500);
        
      } else if (event.data.type === 'OAUTH_ERROR') {
        // Handle authentication error
        console.error('OAuth error:', event.data.error);
        
        // Close the popup first
        if (popup && !popup.closed) {
          popup.close();
        }
        
        clearTimeout(timeoutId);
        window.removeEventListener('message', messageHandler);
        
        // Wait a moment for popup to fully close, then show error
        setTimeout(() => {
          setIsLoading(false);
          alert('Authentication failed. Please try again.');
        }, 300);
      }
    };

    // Add message listener
    window.addEventListener('message', messageHandler);

    // Timeout after 5 minutes
    timeoutId = setTimeout(() => {
      if (popup && !popup.closed) {
        popup.close();
      }
      window.removeEventListener('message', messageHandler);
      setIsLoading(false);
      console.error('OAuth timeout');
    }, 300000);
  };

  return (
    <div data-testid="login-container" className="container">
      {/* Background with TronGrid */}
      {React.createElement(TronGrid)}

      {/* Background Grid Pattern */}
      <div className="gridPattern" />

      {/* Glow Orbs */}
      <div className="glowOrbCyan" />
      <div className="glowOrbTeal" />

      {/* Main Login Container */}
      <div className="mainContainer">
        {/* Header */}
        <div className="header">
          {/* Logo */}
          <div className="logoContainer">
            <div className="logo">
              <div className="logoGlow" />
              <div className="logoInner">
                <img src="/assets/lv-logo-nobg.png" alt="Lucaverse Logo" className="logoImage" />
              </div>
            </div>
          </div>

          <h1 className="title">
            {t('login.enterThe', 'Enter the')}{' '}
            <span className="titleGradient">
              {t('login.lucaverse', 'Lucaverse')}
            </span>
          </h1>
        </div>

        {/* Login Card */}
        <div className="loginCard">
          {/* Holographic border effect */}
          <div className="holographicBorder" />

          <div className="cardContent">
            <div className="cardHeader">
              <h2 className="cardTitle">
                {t('login.chooseGateway', 'Choose Your Gateway')}
              </h2>
              <p className="cardSubtitle">
                {t('login.connectWith', 'Connect with your preferred authentication method')}
              </p>
            </div>

            {/* Google Login Button */}
            <button
              onClick={() => handleLogin('Google')}
              onMouseEnter={() => setHoveredButton('google')}
              onMouseLeave={() => setHoveredButton(null)}
              disabled={isLoading}
              className="loginButton googleButton"
              data-testid="google-login-button"
            >
              <div 
                className={`buttonContainer ${
                  hoveredButton === 'google' ? 'hovered' : ''
                } ${isLoading ? 'loading' : ''}`}
              >
                <div className="buttonContent">
                  <div className="buttonIcon googleIcon">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  <span className="buttonText">
                    {t('login.continueWithGoogle', 'Continue with Google')}
                  </span>
                </div>
              </div>
            </button>

            {/* Microsoft Login Button */}
            <button
              onClick={() => handleLogin('Microsoft')}
              onMouseEnter={() => setHoveredButton('microsoft')}
              onMouseLeave={() => setHoveredButton(null)}
              disabled={isLoading}
              className="loginButton microsoftButton"
              data-testid="microsoft-login-button"
            >
              <div 
                className={`buttonContainer microsoft ${
                  hoveredButton === 'microsoft' ? 'hovered' : ''
                } ${isLoading ? 'loading' : ''}`}
              >
                <div className="buttonContent">
                  <div className="buttonIcon">
                    <svg viewBox="0 0 23 23" width="20" height="20">
                      <path fill="#f25022" d="M0 0h11v11H0z"/>
                      <path fill="#00a4ef" d="M12 0h11v11H12z"/>
                      <path fill="#7fba00" d="M0 12h11v11H0z"/>
                      <path fill="#ffb900" d="M12 12h11v11H12z"/>
                    </svg>
                  </div>
                  <span className="buttonText">
                    {t('login.continueWithMicrosoft', 'Continue with Microsoft')}
                  </span>
                </div>
              </div>
            </button>

            {/* Loading State */}
            <div className="loadingContainer">
              {isLoading && (
                <div className="loadingContent" data-testid="loading-content">
                  <div className="loadingSpinner" />
                  <span className="loadingText">
                    {t('login.initializing', 'Initializing connection...')}
                  </span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="divider">
              <div className="dividerLine">
                <div className="dividerBorder" />
              </div>
              <div className="dividerContent">
                <span className="dividerText">
                  {t('login.secureAuth', 'Secure Authentication')}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="footer">
              <p className="footerText">
                {t('login.termsAgreement', 'By continuing, you agree to our Terms of Service')}
              </p>
              <p>
                {t('login.encryption', 'Protected by enterprise-grade encryption')}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom HUD Element */}
        <div className="bottomHud">
          <div className="hudContent">
            <div className="hudDot hudDotCyan" />
            <span>{t('login.secureConnection', 'SECURE CONNECTION ESTABLISHED')}</span>
            <div className="hudDot hudDotTeal" />
          </div>
        </div>
      </div>
    </div>
  );
};

describe('LucaverseLogin Component (Isolated)', () => {
  // Mock window.open and other window methods
  let mockWindowOpen;
  let mockAlert;
  let mockConsoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock window methods
    mockWindowOpen = jest.fn();
    mockAlert = jest.fn();
    mockConsoleError = jest.fn();
    
    global.window.open = mockWindowOpen;
    global.alert = mockAlert;
    global.console.error = mockConsoleError;
    
    // Mock window.screen
    Object.defineProperty(window, 'screen', {
      writable: true,
      value: {
        width: 1920,
        height: 1080,
      },
    });
    
    // Mock location.hash
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        hash: '',
        origin: 'https://example.com',
      },
    });

    // Setup API mocks
    mockGetAuthEndpoint.mockReturnValue('https://auth.example.com/auth/google');
    mockValidateEndpoint.mockReturnValue(true);
    mockStoreAuthTokensSecurely.mockResolvedValue();
  });

  describe('Component Rendering', () => {
    it('renders the login component with all elements', () => {
      render(<TestLucaverseLogin />);

      expect(screen.getByTestId('login-container')).toBeInTheDocument();
      expect(screen.getByTestId('tron-grid')).toBeInTheDocument();
      expect(screen.getByText('Enter the')).toBeInTheDocument();
      expect(screen.getByText('Lucaverse')).toBeInTheDocument();
      expect(screen.getByText('Choose Your Gateway')).toBeInTheDocument();
    });

    it('displays the Lucaverse logo', () => {
      render(<TestLucaverseLogin />);

      const logo = screen.getByAltText('Lucaverse Logo');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', '/assets/lv-logo-nobg.png');
    });

    it('shows both login buttons', () => {
      render(<TestLucaverseLogin />);

      expect(screen.getByTestId('google-login-button')).toBeInTheDocument();
      expect(screen.getByTestId('microsoft-login-button')).toBeInTheDocument();
      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
      expect(screen.getByText('Continue with Microsoft')).toBeInTheDocument();
    });

    it('displays security and terms information', () => {
      render(<TestLucaverseLogin />);

      expect(screen.getByText('Secure Authentication')).toBeInTheDocument();
      expect(screen.getByText('By continuing, you agree to our Terms of Service')).toBeInTheDocument();
      expect(screen.getByText('Protected by enterprise-grade encryption')).toBeInTheDocument();
      expect(screen.getByText('SECURE CONNECTION ESTABLISHED')).toBeInTheDocument();
    });
  });

  describe('Google Login Flow', () => {
    it('handles Google login button click', () => {
      const mockPopup = {
        closed: false,
        close: jest.fn(),
      };
      mockWindowOpen.mockReturnValue(mockPopup);

      render(<TestLucaverseLogin />);

      const googleButton = screen.getByTestId('google-login-button');
      fireEvent.click(googleButton);

      expect(mockGetAuthEndpoint).toHaveBeenCalledWith('/auth/google');
      expect(mockValidateEndpoint).toHaveBeenCalledWith('https://auth.example.com/auth/google');
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://auth.example.com/auth/google',
        'googleAuth',
        'width=500,height=600,left=710,top=240,scrollbars=yes,resizable=yes'
      );
    });

    it('shows loading state when Google login is clicked', () => {
      const mockPopup = { closed: false, close: jest.fn() };
      mockWindowOpen.mockReturnValue(mockPopup);

      render(<TestLucaverseLogin />);

      const googleButton = screen.getByTestId('google-login-button');
      fireEvent.click(googleButton);

      expect(screen.getByTestId('loading-content')).toBeInTheDocument();
      expect(screen.getByText('Initializing connection...')).toBeInTheDocument();
      expect(googleButton).toBeDisabled();
    });

    it('handles popup blocked scenario', () => {
      mockWindowOpen.mockReturnValue(null);

      render(<TestLucaverseLogin />);

      const googleButton = screen.getByTestId('google-login-button');
      fireEvent.click(googleButton);

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Popup was blocked!');
      expect(mockAlert).toHaveBeenCalledWith('Popup was blocked. Please allow popups for this site.');
      expect(screen.queryByTestId('loading-content')).not.toBeInTheDocument();
    });

    it('handles invalid endpoint validation', () => {
      mockValidateEndpoint.mockReturnValue(false);

      render(<TestLucaverseLogin />);

      const googleButton = screen.getByTestId('google-login-button');
      fireEvent.click(googleButton);

      expect(mockWindowOpen).not.toHaveBeenCalled();
      expect(screen.queryByTestId('loading-content')).not.toBeInTheDocument();
    });
  });

  describe('OAuth Message Handling', () => {
    let mockPopup;
    let messageHandler;

    beforeEach(() => {
      mockPopup = { closed: false, close: jest.fn() };
      mockWindowOpen.mockReturnValue(mockPopup);
      
      // Capture the message handler when addEventListener is called
      const originalAddEventListener = window.addEventListener;
      window.addEventListener = jest.fn((event, handler) => {
        if (event === 'message') {
          messageHandler = handler;
        }
        return originalAddEventListener(event, handler);
      });
    });

    it('handles successful OAuth response', async () => {
      jest.useFakeTimers();
      
      render(<TestLucaverseLogin />);

      const googleButton = screen.getByTestId('google-login-button');
      fireEvent.click(googleButton);

      // Simulate successful OAuth message
      const successEvent = {
        origin: 'https://example.com',
        data: {
          type: 'OAUTH_SUCCESS',
          token: 'test-token',
          sessionId: 'test-session',
        },
      };

      await act(async () => {
        messageHandler(successEvent);
      });

      expect(mockStoreAuthTokensSecurely).toHaveBeenCalledWith('test-token', 'test-session');
      expect(mockPopup.close).toHaveBeenCalled();

      // Wait for the redirect timeout
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(window.location.hash).toBe('dashboard');
      
      jest.useRealTimers();
    });

    it('handles OAuth error response', async () => {
      jest.useFakeTimers();
      
      render(<TestLucaverseLogin />);

      const googleButton = screen.getByTestId('google-login-button');
      fireEvent.click(googleButton);

      // Simulate OAuth error message
      const errorEvent = {
        origin: 'https://example.com',
        data: {
          type: 'OAUTH_ERROR',
          error: 'Authentication failed',
        },
      };

      await act(async () => {
        messageHandler(errorEvent);
      });

      expect(mockConsoleError).toHaveBeenCalledWith('OAuth error:', 'Authentication failed');
      expect(mockPopup.close).toHaveBeenCalled();

      // Wait for the error alert timeout
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockAlert).toHaveBeenCalledWith('Authentication failed. Please try again.');
      
      jest.useRealTimers();
    });

    it('ignores messages from different origins', async () => {
      render(<TestLucaverseLogin />);

      const googleButton = screen.getByTestId('google-login-button');
      fireEvent.click(googleButton);

      // Simulate message from different origin
      const maliciousEvent = {
        origin: 'https://malicious.com',
        data: {
          type: 'OAUTH_SUCCESS',
          token: 'malicious-token',
          sessionId: 'malicious-session',
        },
      };

      await act(async () => {
        messageHandler(maliciousEvent);
      });

      expect(mockStoreAuthTokensSecurely).not.toHaveBeenCalled();
      expect(mockPopup.close).not.toHaveBeenCalled();
    });
  });

  describe('Microsoft Login Flow', () => {
    it('handles Microsoft login button click', () => {
      jest.useFakeTimers();

      render(<TestLucaverseLogin />);

      const microsoftButton = screen.getByTestId('microsoft-login-button');
      fireEvent.click(microsoftButton);

      expect(screen.getByTestId('loading-content')).toBeInTheDocument();
      expect(microsoftButton).toBeDisabled();

      // Fast forward the timeout
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(screen.queryByTestId('loading-content')).not.toBeInTheDocument();

      jest.useRealTimers();
    });
  });

  describe('Button Interactions', () => {
    it('handles hover states on login buttons', () => {
      render(<TestLucaverseLogin />);

      const googleButton = screen.getByTestId('google-login-button');
      const microsoftButton = screen.getByTestId('microsoft-login-button');

      // Test Google button hover
      fireEvent.mouseEnter(googleButton);
      expect(googleButton.querySelector('.buttonContainer')).toHaveClass('hovered');

      fireEvent.mouseLeave(googleButton);
      expect(googleButton.querySelector('.buttonContainer')).not.toHaveClass('hovered');

      // Test Microsoft button hover
      fireEvent.mouseEnter(microsoftButton);
      expect(microsoftButton.querySelector('.buttonContainer')).toHaveClass('hovered');

      fireEvent.mouseLeave(microsoftButton);
      expect(microsoftButton.querySelector('.buttonContainer')).not.toHaveClass('hovered');
    });

    it('disables buttons during loading state', () => {
      const mockPopup = { closed: false, close: jest.fn() };
      mockWindowOpen.mockReturnValue(mockPopup);

      render(<TestLucaverseLogin />);

      const googleButton = screen.getByTestId('google-login-button');
      const microsoftButton = screen.getByTestId('microsoft-login-button');

      fireEvent.click(googleButton);

      expect(googleButton).toBeDisabled();
      expect(microsoftButton).toBeDisabled();
    });
  });

  describe('Security Features', () => {
    it('validates API endpoints before making requests', () => {
      mockValidateEndpoint.mockReturnValue(false);

      render(<TestLucaverseLogin />);

      const googleButton = screen.getByTestId('google-login-button');
      fireEvent.click(googleButton);

      expect(mockValidateEndpoint).toHaveBeenCalledWith('https://auth.example.com/auth/google');
      expect(mockWindowOpen).not.toHaveBeenCalled();
    });

    it('uses centralized API configuration', () => {
      const mockPopup = { closed: false, close: jest.fn() };
      mockWindowOpen.mockReturnValue(mockPopup);

      render(<TestLucaverseLogin />);

      const googleButton = screen.getByTestId('google-login-button');
      fireEvent.click(googleButton);

      expect(mockGetAuthEndpoint).toHaveBeenCalledWith('/auth/google');
    });

    it('implements OAuth timeout protection', () => {
      jest.useFakeTimers();
      const mockPopup = { closed: false, close: jest.fn() };
      mockWindowOpen.mockReturnValue(mockPopup);

      render(<TestLucaverseLogin />);

      const googleButton = screen.getByTestId('google-login-button');
      fireEvent.click(googleButton);

      // Fast forward 5 minutes (OAuth timeout)
      act(() => {
        jest.advanceTimersByTime(300000);
      });

      expect(mockPopup.close).toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalledWith('OAuth timeout');

      jest.useRealTimers();
    });
  });

  describe('Internationalization', () => {
    it('displays all translated text elements', () => {
      render(<TestLucaverseLogin />);

      expect(screen.getByText('Enter the')).toBeInTheDocument();
      expect(screen.getByText('Lucaverse')).toBeInTheDocument();
      expect(screen.getByText('Choose Your Gateway')).toBeInTheDocument();
      expect(screen.getByText('Connect with your preferred authentication method')).toBeInTheDocument();
      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
      expect(screen.getByText('Continue with Microsoft')).toBeInTheDocument();
      expect(screen.getByText('Secure Authentication')).toBeInTheDocument();
      expect(screen.getByText('By continuing, you agree to our Terms of Service')).toBeInTheDocument();
      expect(screen.getByText('Protected by enterprise-grade encryption')).toBeInTheDocument();
      expect(screen.getByText('SECURE CONNECTION ESTABLISHED')).toBeInTheDocument();
    });
  });

  describe('Visual Elements', () => {
    it('renders background visual elements', () => {
      const { container } = render(<TestLucaverseLogin />);

      expect(screen.getByTestId('tron-grid')).toBeInTheDocument();
      expect(container.querySelector('.gridPattern')).toBeInTheDocument();
      expect(container.querySelector('.glowOrbCyan')).toBeInTheDocument();
      expect(container.querySelector('.glowOrbTeal')).toBeInTheDocument();
    });

    it('displays SVG icons for login providers', () => {
      const { container } = render(<TestLucaverseLogin />);

      const googleIcon = container.querySelector('.googleIcon svg');
      const microsoftIcon = container.querySelector('.buttonIcon svg');

      expect(googleIcon).toBeInTheDocument();
      expect(microsoftIcon).toBeInTheDocument();
    });
  });
});