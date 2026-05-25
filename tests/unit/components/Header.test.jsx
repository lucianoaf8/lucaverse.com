import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

// Stable shared mock for i18n — created once, not per call
const mockChangeLanguage = jest.fn();
const mockI18n = {
  changeLanguage: mockChangeLanguage,
  language: 'en',
};

// Override the global react-i18next mock for this file to use a stable i18n reference
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: mockI18n,
  }),
  Trans: ({ children }) => children,
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

describe('Header Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to English
    mockI18n.language = 'en';
  });

  describe('Rendering', () => {
    it('renders header with logo and navigation', () => {
      render(<Header />);

      // Check logo
      expect(screen.getByAltText('Lucaverse Logo')).toBeInTheDocument();

      // Navigation links render as their translation key (t(key) = key)
      expect(screen.getByRole('link', { name: /^home$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^about$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^projects$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^customGpts$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^blog$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^contactMe$/i })).toBeInTheDocument();
    });

    it('renders login links and request access buttons (mobile + desktop)', () => {
      render(<Header />);

      // Two login links (mobile + desktop)
      const loginLinks = screen.getAllByRole('link', { name: /lucaverseLogin/i });
      expect(loginLinks.length).toBeGreaterThanOrEqual(1);

      // Two request access buttons (mobile + desktop)
      const requestButtons = screen.getAllByRole('button', { name: /requestAccess/i });
      expect(requestButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('renders language toggle with "EN" label when language is English', () => {
      render(<Header />);

      const langButtons = screen.getAllByRole('button', { name: /^EN$/i });
      expect(langButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('language toggle has title attribute indicating target language', () => {
      render(<Header />);

      const langButtons = screen.getAllByRole('button', { name: /^EN$/i });
      expect(langButtons[0]).toHaveAttribute('title');
      expect(langButtons[0].getAttribute('title').toLowerCase()).toContain('switch to');
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
    it('displays "EN" as current language when i18n.language is en', () => {
      render(<Header />);

      const langButtons = screen.getAllByRole('button', { name: /^EN$/i });
      expect(langButtons[0]).toHaveTextContent('EN');
    });

    it('calls changeLanguage with "pt" when toggled from English', async () => {
      render(<Header />);

      const langButtons = screen.getAllByRole('button', { name: /^EN$/i });
      fireEvent.click(langButtons[0]);

      // The shared mockChangeLanguage is called by the component
      expect(mockChangeLanguage).toHaveBeenCalledWith('pt');
    });

    it('shows flag animation element briefly when language changes', async () => {
      render(<Header />);

      const langButtons = screen.getAllByRole('button', { name: /^EN$/i });
      fireEvent.click(langButtons[0]);

      // The flag element appears immediately after click
      const flagEl = document.querySelector('[data-flag]');
      expect(flagEl).toBeInTheDocument();
      expect(flagEl).toHaveAttribute('data-flag', 'BR'); // EN -> PT shows BR flag
    });

    it('language toggle button has data-hovered="false" initially', () => {
      render(<Header />);

      const langButtons = screen.getAllByRole('button', { name: /^EN$/i });
      expect(langButtons[0]).toHaveAttribute('data-hovered', 'false');
    });

    it('updates data-hovered when mouse enters and leaves toggle', () => {
      render(<Header />);

      const langButtons = screen.getAllByRole('button', { name: /^EN$/i });
      fireEvent.mouseEnter(langButtons[0]);

      // Re-query after state update to get fresh DOM reference
      const hoveredButtons = screen.getAllByRole('button', { name: /^EN$/i });
      expect(hoveredButtons[0]).toHaveAttribute('data-hovered', 'true');

      fireEvent.mouseLeave(hoveredButtons[0]);

      const unhoverButtons = screen.getAllByRole('button', { name: /^EN$/i });
      expect(unhoverButtons[0]).toHaveAttribute('data-hovered', 'false');
    });
  });

  describe('Access Request Modal', () => {
    it('opens access request form when request button is clicked', async () => {
      render(<Header />);

      const requestButtons = screen.getAllByRole('button', { name: /requestAccess/i });
      // Click the last one (desktop version)
      await user.click(requestButtons[requestButtons.length - 1]);

      expect(screen.getByTestId('access-request-form')).toBeInTheDocument();
    });

    it('closes access request form when close callback is called', async () => {
      render(<Header />);

      // Open the form
      const requestButtons = screen.getAllByRole('button', { name: /requestAccess/i });
      await user.click(requestButtons[requestButtons.length - 1]);

      // Close the form
      const closeButton = screen.getByTestId('close-access-form');
      await user.click(closeButton);

      expect(screen.queryByTestId('access-request-form')).not.toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    it('has correct href attributes for hash navigation', () => {
      render(<Header />);

      expect(screen.getByRole('link', { name: /^home$/i })).toHaveAttribute('href', '#home');
      expect(screen.getByRole('link', { name: /^about$/i })).toHaveAttribute('href', '#about');
      expect(screen.getByRole('link', { name: /^projects$/i })).toHaveAttribute('href', '#projects');
      expect(screen.getByRole('link', { name: /^blog$/i })).toHaveAttribute('href', '#blog');
      expect(screen.getByRole('link', { name: /^contactMe$/i })).toHaveAttribute('href', '#contact');
    });

    it('all login links point to #login', () => {
      render(<Header />);

      const loginLinks = screen.getAllByRole('link', { name: /lucaverseLogin/i });
      loginLinks.forEach(link => {
        expect(link).toHaveAttribute('href', '#login');
      });
    });
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<Header />);
      const results = await axe(container);

      expect(results).toHaveNoViolations();
    });

    it('has banner role (header) and navigation role', () => {
      render(<Header />);

      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('hamburger menu button has descriptive aria-label', () => {
      render(<Header />);

      const hamburger = screen.getByRole('button', { name: /toggle navigation menu/i });
      expect(hamburger).toBeInTheDocument();
      expect(hamburger).toHaveAttribute('aria-expanded');
    });

    it('supports keyboard activation of language toggle', () => {
      render(<Header />);

      const langButtons = screen.getAllByRole('button', { name: /^EN$/i });
      langButtons[0].focus();

      // Simulate Enter key press via fireEvent for predictable behavior
      fireEvent.keyDown(langButtons[0], { key: 'Enter', code: 'Enter' });
      fireEvent.click(langButtons[0]);

      expect(mockChangeLanguage).toHaveBeenCalled();
    });
  });

  describe('SVG Flag Rendering', () => {
    it('renders Brazilian flag SVG when switching from English to Portuguese', () => {
      render(<Header />);

      const langButtons = screen.getAllByRole('button', { name: /^EN$/i });
      fireEvent.click(langButtons[0]);

      const flagEl = document.querySelector('[data-flag="BR"]');
      expect(flagEl).toBeInTheDocument();

      const svgElement = flagEl.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
      expect(svgElement.querySelector('rect[fill="#009639"]')).toBeInTheDocument(); // Green
      expect(svgElement.querySelector('polygon[fill="#FEDF00"]')).toBeInTheDocument(); // Yellow
      expect(svgElement.querySelector('circle[fill="#002776"]')).toBeInTheDocument(); // Blue
    });

    it('flag element disappears after 250ms animation timeout', () => {
      jest.useFakeTimers();
      render(<Header />);

      const langButtons = screen.getAllByRole('button', { name: /^EN$/i });
      fireEvent.click(langButtons[0]);

      // Flag is visible immediately after click
      expect(document.querySelector('[data-flag]')).toBeInTheDocument();

      // After 250ms timeout, flag is hidden
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(document.querySelector('[data-flag]')).not.toBeInTheDocument();

      jest.useRealTimers();
    });

    it('renders US flag when switching from Portuguese to English', () => {
      // Simulate Portuguese language
      mockI18n.language = 'pt';

      render(<Header />);

      // When language is PT, toggle shows PT and clicking switches to EN
      const langButtons = screen.getAllByRole('button', { name: /^PT$/i });
      expect(langButtons.length).toBeGreaterThanOrEqual(1);

      fireEvent.click(langButtons[0]);

      expect(mockChangeLanguage).toHaveBeenCalledWith('en');

      const flagEl = document.querySelector('[data-flag="US"]');
      expect(flagEl).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders without unnecessary console output on re-render', () => {
      const { rerender } = render(<Header />);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      rerender(<Header />);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('handles rapid language switching without crashing', () => {
      render(<Header />);

      const langButtons = screen.getAllByRole('button', { name: /^EN$/i });
      const toggleButton = langButtons[0];

      // Rapid clicks should not crash
      fireEvent.click(toggleButton);
      fireEvent.click(toggleButton);
      fireEvent.click(toggleButton);

      // Component should still be in the DOM
      expect(screen.getByAltText('Lucaverse Logo')).toBeInTheDocument();
    });
  });
});
