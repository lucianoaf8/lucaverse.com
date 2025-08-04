import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import Header from '../../../src/components/Header/Header';

// Mock the API config
jest.mock('../../../src/config/api', () => ({
  getNewsletterUrl: () => 'https://newsletter.example.com',
}));

// Mock AccessRequestForm component
jest.mock('../../../src/components/AccessRequestForm/AccessRequestForm', () => {
  return function MockAccessRequestForm({ isOpen, onClose }) {
    return isOpen ? (
      <div data-testid="access-request-form">
        <button onClick={onClose} data-testid="close-access-form">Close</button>
      </div>
    ) : null;
  };
});

describe('Header Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders header with logo and navigation', () => {
      render(<Header />);
      
      // Check logo
      expect(screen.getByAltText('Lucaverse Logo')).toBeInTheDocument();
      
      // Check navigation links
      expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /projects/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /customGpts/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /blog/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /contactMe/i })).toBeInTheDocument();
    });

    it('renders CTA buttons', () => {
      render(<Header />);
      
      expect(screen.getByRole('link', { name: /lucaverseLogin/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /requestAccess/i })).toBeInTheDocument();
    });

    it('renders language toggle', () => {
      render(<Header />);
      
      const languageToggle = screen.getByRole('button', { name: /switch to/i });
      expect(languageToggle).toBeInTheDocument();
      expect(languageToggle).toHaveTextContent('EN'); // Default language
    });

    it('renders newsletter link with external attributes', () => {
      render(<Header />);
      
      const newsletterLink = screen.getByRole('link', { name: /newsletter/i });
      expect(newsletterLink).toBeInTheDocument();
      expect(newsletterLink).toHaveAttribute('href', 'https://newsletter.example.com');
      expect(newsletterLink).toHaveAttribute('target', '_blank');
      expect(newsletterLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Language Toggle Functionality', () => {
    it('displays current language correctly', () => {
      render(<Header />);
      
      const toggleButton = screen.getByRole('button', { name: /switch to/i });
      expect(toggleButton).toHaveTextContent('EN');
    });

    it('changes language when toggle is clicked', async () => {
      const mockChangeLanguage = jest.fn();
      require('react-i18next').useTranslation.mockReturnValue({
        t: (key) => key,
        i18n: {
          changeLanguage: mockChangeLanguage,
          language: 'en',
        },
      });

      render(<Header />);
      
      const toggleButton = screen.getByRole('button', { name: /switch to portuguese/i });
      await user.click(toggleButton);
      
      expect(mockChangeLanguage).toHaveBeenCalledWith('pt');
    });

    it('shows flag animation when language changes', async () => {
      render(<Header />);
      
      const toggleButton = screen.getByRole('button', { name: /switch to/i });
      await user.click(toggleButton);
      
      // Wait for flag animation to appear
      await waitFor(() => {
        const flagElement = screen.getByTestId('flag-flash');
        expect(flagElement).toBeInTheDocument();
      }, { timeout: 100 });
    });

    it('handles hover states on language toggle', async () => {
      render(<Header />);
      
      const toggleButton = screen.getByRole('button', { name: /switch to/i });
      
      await user.hover(toggleButton);
      expect(toggleButton).toHaveAttribute('data-hovered', 'true');
      
      await user.unhover(toggleButton);
      expect(toggleButton).toHaveAttribute('data-hovered', 'false');
    });
  });

  describe('Access Request Modal', () => {
    it('opens access request form when button is clicked', async () => {
      render(<Header />);
      
      const requestButton = screen.getByRole('button', { name: /requestAccess/i });
      await user.click(requestButton);
      
      expect(screen.getByTestId('access-request-form')).toBeInTheDocument();
    });

    it('closes access request form when close is called', async () => {
      render(<Header />);
      
      // Open the form
      const requestButton = screen.getByRole('button', { name: /requestAccess/i });
      await user.click(requestButton);
      
      // Close the form
      const closeButton = screen.getByTestId('close-access-form');
      await user.click(closeButton);
      
      expect(screen.queryByTestId('access-request-form')).not.toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    it('has correct href attributes for hash navigation', () => {
      render(<Header />);
      
      expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '#home');
      expect(screen.getByRole('link', { name: /about/i })).toHaveAttribute('href', '#about');
      expect(screen.getByRole('link', { name: /projects/i })).toHaveAttribute('href', '#projects');
      expect(screen.getByRole('link', { name: /blog/i })).toHaveAttribute('href', '#blog');
      expect(screen.getByRole('link', { name: /contactMe/i })).toHaveAttribute('href', '#contact');
    });

    it('has correct href for login link', () => {
      render(<Header />);
      
      expect(screen.getByRole('link', { name: /lucaverseLogin/i })).toHaveAttribute('href', '#login');
    });
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<Header />);
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA labels and semantic structure', () => {
      render(<Header />);
      
      // Check semantic structure
      expect(screen.getByRole('banner')).toBeInTheDocument(); // header element
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      
      // Check ARIA labels
      expect(screen.getByAltText('Lucaverse Logo')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /switch to/i })).toHaveAttribute('title');
    });

    it('supports keyboard navigation', async () => {
      render(<Header />);
      
      const toggleButton = screen.getByRole('button', { name: /switch to/i });
      
      // Tab to the language toggle
      await user.tab();
      // Note: Exact tab navigation depends on page structure
      
      // Should be able to activate with Enter/Space
      toggleButton.focus();
      await user.keyboard('{Enter}');
      
      // Should trigger language change
      await waitFor(() => {
        expect(screen.queryByTestId('flag-flash')).toBeInTheDocument();
      });
    });
  });

  describe('SVG Flag Rendering', () => {
    it('renders Brazilian flag correctly when switching to Portuguese', async () => {
      render(<Header />);
      
      const toggleButton = screen.getByRole('button', { name: /switch to/i });
      await user.click(toggleButton);
      
      await waitFor(() => {
        const flagElement = screen.getByTestId('flag-flash');
        expect(flagElement).toHaveAttribute('data-flag', 'BR');
        
        // Check for Brazilian flag elements
        const svgElement = flagElement.querySelector('svg');
        expect(svgElement).toBeInTheDocument();
        expect(svgElement.querySelector('rect[fill="#009639"]')).toBeInTheDocument(); // Green
        expect(svgElement.querySelector('polygon[fill="#FEDF00"]')).toBeInTheDocument(); // Yellow
        expect(svgElement.querySelector('circle[fill="#002776"]')).toBeInTheDocument(); // Blue
      });
    });

    it('renders US flag correctly when switching to English', async () => {
      // Mock Portuguese as current language
      require('react-i18next').useTranslation.mockReturnValue({
        t: (key) => key,
        i18n: {
          changeLanguage: jest.fn(),
          language: 'pt',
        },
      });

      render(<Header />);
      
      const toggleButton = screen.getByRole('button', { name: /switch to/i });
      await user.click(toggleButton);
      
      await waitFor(() => {
        const flagElement = screen.getByTestId('flag-flash');
        expect(flagElement).toHaveAttribute('data-flag', 'US');
        
        // Check for US flag elements
        const svgElement = flagElement.querySelector('svg');
        expect(svgElement).toBeInTheDocument();
        expect(svgElement.querySelector('rect[fill="#B22234"]')).toBeInTheDocument(); // Red
        expect(svgElement.querySelector('rect[fill="#3C3B6E"]')).toBeInTheDocument(); // Blue
        expect(svgElement.querySelector('rect[fill="white"]')).toBeInTheDocument(); // White stripes
      });
    });
  });

  describe('Error Handling', () => {
    it('handles missing newsletter URL gracefully', () => {
      // Mock API to return undefined
      jest.doMock('../../../src/config/api', () => ({
        getNewsletterUrl: () => undefined,
      }));

      render(<Header />);
      
      const newsletterLink = screen.getByRole('link', { name: /newsletter/i });
      expect(newsletterLink).toHaveAttribute('href', ''); // Should handle gracefully
    });

    it('handles translation errors gracefully', () => {
      // Mock translation function to throw error
      require('react-i18next').useTranslation.mockReturnValue({
        t: () => {
          throw new Error('Translation error');
        },
        i18n: {
          changeLanguage: jest.fn(),
          language: 'en',
        },
      });

      // Should not crash
      expect(() => render(<Header />)).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('renders efficiently without unnecessary re-renders', () => {
      const { rerender } = render(<Header />);
      
      // Mock console.log to track re-renders
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Re-render with same props
      rerender(<Header />);
      
      // Should not cause excessive re-renders
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('handles rapid language switching without issues', async () => {
      render(<Header />);
      
      const toggleButton = screen.getByRole('button', { name: /switch to/i });
      
      // Rapidly click language toggle
      await user.click(toggleButton);
      await user.click(toggleButton);
      await user.click(toggleButton);
      
      // Should handle without errors
      expect(toggleButton).toBeInTheDocument();
    });
  });
});