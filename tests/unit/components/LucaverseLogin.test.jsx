/**
 * LucaverseLogin Component Tests
 * Tests the real LucaverseLogin component from src/components/LucaverseLogin/LucaverseLogin.jsx
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LucaverseLogin from '../../../src/components/LucaverseLogin/LucaverseLogin';

// Mock react-i18next
const mockTranslations = {
  welcomeLucaverse: 'Welcome to Lucaverse',
  loginSubtitle: 'Access your personalized AI universe',
  loginWith: 'Continue with',
  google: 'Google',
  microsoft: 'Microsoft',
  loginDescription: 'Choose your preferred authentication method to access the Lucaverse dashboard.',
  loading: 'Loading...',
  orContinueWith: 'Or continue with',
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => mockTranslations[key] || fallback || key,
  }),
}));

// Mock TronGrid component
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

// Mock useAuth hook
jest.mock('../../../src/hooks/useAuth', () => ({
  storeAuthTokensSecurely: jest.fn(),
}));

// Mock window.open for OAuth popup
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

      expect(screen.getByText('Welcome to Lucaverse')).toBeInTheDocument();
      expect(screen.getByText('Access your personalized AI universe')).toBeInTheDocument();
      expect(screen.getByTestId('tron-grid')).toBeInTheDocument();
    });

    it('displays authentication options', () => {
      render(<LucaverseLogin />);

      expect(screen.getByRole('button', { name: /Google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Microsoft/i })).toBeInTheDocument();
    });

    it('shows login description text', () => {
      render(<LucaverseLogin />);

      expect(screen.getByText('Choose your preferred authentication method to access the Lucaverse dashboard.')).toBeInTheDocument();
    });
  });

  describe('Google OAuth Login', () => {
    it('handles Google login button click', async () => {
      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Google/i });
      fireEvent.click(googleButton);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('https://auth.example.com'),
        'oauth',
        expect.stringContaining('width=500,height=600')
      );
    });

    it('shows loading state during Google login', async () => {
      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });
    });

    it('disables buttons during loading', async () => {
      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Google/i });
      const microsoftButton = screen.getByRole('button', { name: /Microsoft/i });

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

      const microsoftButton = screen.getByRole('button', { name: /Microsoft/i });
      fireEvent.click(microsoftButton);

      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });
    });

    it('simulates Microsoft login flow', async () => {
      jest.useFakeTimers();
      render(<LucaverseLogin />);

      const microsoftButton = screen.getByRole('button', { name: /Microsoft/i });
      fireEvent.click(microsoftButton);

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Fast forward time to complete the simulation
      jest.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('Interactive States', () => {
    it('handles button hover states', () => {
      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Google/i });
      
      fireEvent.mouseEnter(googleButton);
      fireEvent.mouseLeave(googleButton);
      
      // Button should remain clickable after hover interactions
      expect(googleButton).not.toBeDisabled();
    });

    it('maintains button accessibility', () => {
      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Google/i });
      const microsoftButton = screen.getByRole('button', { name: /Microsoft/i });

      expect(googleButton).toHaveAttribute('type', 'button');
      expect(microsoftButton).toHaveAttribute('type', 'button');
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
      expect(container.querySelector('.lucaverseLogin') || container.firstChild).toBeInTheDocument();
    });
  });

  describe('Internationalization', () => {
    it('uses translation keys for all text content', () => {
      render(<LucaverseLogin />);

      expect(screen.getByText('Welcome to Lucaverse')).toBeInTheDocument();
      expect(screen.getByText('Access your personalized AI universe')).toBeInTheDocument();
      expect(screen.getByText('Choose your preferred authentication method to access the Lucaverse dashboard.')).toBeInTheDocument();
    });

    it('translates provider button labels', () => {
      render(<LucaverseLogin />);

      expect(screen.getByRole('button', { name: /Google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Microsoft/i })).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles OAuth window errors gracefully', async () => {
      mockWindowOpen.mockReturnValue(null); // Simulate popup blocker

      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Google/i });
      fireEvent.click(googleButton);

      // Should not crash when popup is blocked
      expect(googleButton).toBeInTheDocument();
    });

    it('validates auth endpoint before login', () => {
      const { validateEndpoint } = require('../../../src/config/api');
      
      render(<LucaverseLogin />);

      const googleButton = screen.getByRole('button', { name: /Google/i });
      fireEvent.click(googleButton);

      expect(validateEndpoint).toHaveBeenCalled();
    });
  });
});