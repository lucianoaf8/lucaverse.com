/**
 * LucaverseLogin Component Tests
 * Tests the real LucaverseLogin component from src/components/LucaverseLogin/LucaverseLogin.jsx
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LucaverseLogin from '../../../src/components/LucaverseLogin/LucaverseLogin';

// Mock react-i18next with the real keys used by the component
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

// Mock TronGrid component (it's a .tsx file)
jest.mock('../../../src/components/Background/TronGrid.tsx', () => {
  return function MockTronGrid() {
    return <div data-testid="tron-grid">TronGrid Background</div>;
  };
});

// Mock API config
jest.mock('../../../src/config/api', () => ({
  getAuthEndpoint: jest.fn((path) => `https://auth.example.com${path}`),
  validateEndpoint: jest.fn(() => true),
}));

// Mock useAuth hook export
jest.mock('../../../src/hooks/useAuth', () => ({
  storeAuthTokensSecurely: jest.fn(),
}));

// Mock window.open for OAuth popup (external surface)
const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
  writable: true,
  value: mockWindowOpen,
});

describe('LucaverseLogin Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWindowOpen.mockReturnValue({
      focus: jest.fn(),
      closed: false,
      location: { href: '' }
    });
  });

  describe('Component Rendering', () => {
    it('renders the login page with correct structure', () => {
      render(<LucaverseLogin />);

      // The h1 has "Enter the" + "Lucaverse" split across elements
      expect(screen.getByText('Enter the')).toBeInTheDocument();
      expect(screen.getByText('Lucaverse')).toBeInTheDocument();
      expect(screen.getByTestId('tron-grid')).toBeInTheDocument();
    });

    it('displays authentication options', () => {
      render(<LucaverseLogin />);

      expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Continue with Microsoft/i })).toBeInTheDocument();
    });

    it('shows the card subtitle text', () => {
      render(<LucaverseLogin />);

      expect(screen.getByText('Connect with your preferred authentication method')).toBeInTheDocument();
    });

    it('shows the gateway heading', () => {
      render(<LucaverseLogin />);

      expect(screen.getByText('Choose Your Gateway')).toBeInTheDocument();
    });
  });

  describe('Google OAuth Login', () => {
    it('handles Google login button click — opens popup with auth URL', async () => {
      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
      fireEvent.click(googleButton);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('https://auth.example.com'),
        'googleAuth',
        expect.stringContaining('width=500,height=600')
      );
    });

    it('opens popup with the correct OAuth URL containing origin', async () => {
      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
      fireEvent.click(googleButton);

      const [url] = mockWindowOpen.mock.calls[0];
      expect(url).toContain('/auth/google?origin=');
      expect(url).toContain(encodeURIComponent(window.location.origin));
    });

    it('shows loading state during Google login', async () => {
      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
      fireEvent.click(googleButton);

      // Component shows 'Initializing connection...' (login.initializing key) while loading
      await waitFor(() => {
        expect(screen.getByText('Initializing connection...')).toBeInTheDocument();
      });
    });

    it('disables buttons during loading', async () => {
      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
      const microsoftButton = screen.getByRole('button', { name: /Continue with Microsoft/i });

      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(googleButton).toBeDisabled();
        expect(microsoftButton).toBeDisabled();
      });
    });
  });

  describe('Microsoft OAuth Login', () => {
    it('handles Microsoft login button click', async () => {
      render(<LucaverseLogin />);

      const microsoftButton = screen.getByRole('button', { name: /Continue with Microsoft/i });
      fireEvent.click(microsoftButton);

      // Microsoft uses a setTimeout simulation, shows loading immediately
      await waitFor(() => {
        expect(screen.getByText('Initializing connection...')).toBeInTheDocument();
      });
    });

    it('simulates Microsoft login flow and clears loading after timeout', async () => {
      jest.useFakeTimers();
      render(<LucaverseLogin />);

      const microsoftButton = screen.getByRole('button', { name: /Continue with Microsoft/i });
      fireEvent.click(microsoftButton);

      expect(screen.getByText('Initializing connection...')).toBeInTheDocument();

      // Fast forward time to complete the simulation (2000ms)
      jest.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(screen.queryByText('Initializing connection...')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('Interactive States', () => {
    it('handles button hover states', () => {
      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });

      fireEvent.mouseEnter(googleButton);
      fireEvent.mouseLeave(googleButton);

      // Button should remain clickable after hover interactions
      expect(googleButton).not.toBeDisabled();
    });

    it('buttons are present and interactable', () => {
      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
      const microsoftButton = screen.getByRole('button', { name: /Continue with Microsoft/i });

      // Both buttons exist and are not disabled initially
      expect(googleButton).not.toBeDisabled();
      expect(microsoftButton).not.toBeDisabled();
    });
  });

  describe('Background and Visual Elements', () => {
    it('renders TronGrid background component', () => {
      render(<LucaverseLogin />);

      expect(screen.getByTestId('tron-grid')).toBeInTheDocument();
    });

    it('has proper page structure for login layout', () => {
      const { container } = render(<LucaverseLogin />);

      // Should have main container structure
      expect(container.querySelector('.container') || container.firstChild).toBeInTheDocument();
    });
  });

  describe('Internationalization', () => {
    it('uses translation keys for all text content', () => {
      render(<LucaverseLogin />);

      expect(screen.getByText('Enter the')).toBeInTheDocument();
      expect(screen.getByText('Lucaverse')).toBeInTheDocument();
      expect(screen.getByText('Connect with your preferred authentication method')).toBeInTheDocument();
    });

    it('translates provider button labels', () => {
      render(<LucaverseLogin />);

      expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Continue with Microsoft/i })).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles OAuth window errors gracefully when popup is blocked', async () => {
      mockWindowOpen.mockReturnValue(null); // Simulate popup blocker

      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });

      // Should not crash when popup is blocked
      fireEvent.click(googleButton);

      expect(googleButton).toBeInTheDocument();
    });

    it('validates auth endpoint before opening popup', () => {
      const { validateEndpoint } = require('../../../src/config/api');

      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
      fireEvent.click(googleButton);

      expect(validateEndpoint).toHaveBeenCalled();
    });

    it('does not open popup when endpoint validation fails', () => {
      const { validateEndpoint } = require('../../../src/config/api');
      validateEndpoint.mockReturnValue(false);

      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
      fireEvent.click(googleButton);

      // Popup should not be opened when validation fails
      expect(mockWindowOpen).not.toHaveBeenCalled();
    });
  });
});
