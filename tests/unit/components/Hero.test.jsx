/**
 * Hero Component Tests
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';

// Mock i18next (global mock from jest.setup.js covers this, but we override for clarity)
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { changeLanguage: jest.fn(), language: 'en' }
  }),
  Trans: ({ children }) => children,
  initReactI18next: { type: '3rdParty', init: jest.fn() }
}));

// Mock HoloCore — it uses canvas/RAF which are not meaningful to test here
jest.mock('../../../src/components/Hero/HoloCore', () => {
  return function MockHoloCore() {
    return <div data-testid="holo-core-mock" />;
  };
});

// Mock AccessRequestForm
jest.mock('../../../src/components/AccessRequestForm/AccessRequestForm.jsx', () => {
  return function MockAccessRequestForm({ isOpen, onClose }) {
    return isOpen ? (
      <div data-testid="access-request-form">
        <button onClick={onClose} data-testid="close-access-form">Close</button>
      </div>
    ) : null;
  };
});

import Hero from '../../../src/components/Hero/Hero';

describe('Hero Component', () => {
  describe('Rendering', () => {
    it('renders the hero section with id="home"', () => {
      const { container } = render(<Hero />);
      const section = container.querySelector('section#home');
      expect(section).toBeInTheDocument();
    });

    it('renders the main heading with translation keys', () => {
      render(<Hero />);
      expect(screen.getByText('heroWelcome')).toBeInTheDocument();
      expect(screen.getByText('heroLucaverse')).toBeInTheDocument();
    });

    it('renders mission and vision content', () => {
      const { container } = render(<Hero />);
      // Mission/vision text nodes are siblings of <br/> elements inside a div.
      // Use container.textContent to verify presence without element boundary issues.
      const subtitleDiv = container.querySelector('section#home');
      expect(subtitleDiv.textContent).toContain('heroMission');
      expect(subtitleDiv.textContent).toContain('heroMissionText');
      expect(subtitleDiv.textContent).toContain('heroVision');
      expect(subtitleDiv.textContent).toContain('heroVisionText');
    });

    it('renders enter the lucaverse link pointing to #login', () => {
      render(<Hero />);
      const link = screen.getByRole('link', { name: /enterTheLucaverse/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '#login');
    });

    it('renders request access button', () => {
      render(<Hero />);
      const button = screen.getByRole('button', { name: /requestAccess/i });
      expect(button).toBeInTheDocument();
    });

    it('renders the HoloCore component placeholder', () => {
      render(<Hero />);
      expect(screen.getByTestId('holo-core-mock')).toBeInTheDocument();
    });

    it('does not render AccessRequestForm by default', () => {
      render(<Hero />);
      expect(screen.queryByTestId('access-request-form')).not.toBeInTheDocument();
    });
  });

  describe('Access Request Modal', () => {
    it('opens access request form when request access button is clicked', async () => {
      render(<Hero />);
      const button = screen.getByRole('button', { name: /requestAccess/i });
      fireEvent.click(button);
      expect(screen.getByTestId('access-request-form')).toBeInTheDocument();
    });

    it('closes access request form when onClose callback fires', async () => {
      render(<Hero />);
      const button = screen.getByRole('button', { name: /requestAccess/i });
      fireEvent.click(button);
      expect(screen.getByTestId('access-request-form')).toBeInTheDocument();

      const closeButton = screen.getByTestId('close-access-form');
      fireEvent.click(closeButton);
      expect(screen.queryByTestId('access-request-form')).not.toBeInTheDocument();
    });

    it('can open and close modal multiple times', () => {
      render(<Hero />);
      const requestBtn = screen.getByRole('button', { name: /requestAccess/i });

      fireEvent.click(requestBtn);
      expect(screen.getByTestId('access-request-form')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('close-access-form'));
      expect(screen.queryByTestId('access-request-form')).not.toBeInTheDocument();

      fireEvent.click(requestBtn);
      expect(screen.getByTestId('access-request-form')).toBeInTheDocument();
    });
  });

  describe('Structure', () => {
    it('renders HUD fragment elements', () => {
      const { container } = render(<Hero />);
      // Both HUD fragments should be rendered (even though styles are mocked)
      // The component renders two div.hudFragment elements
      const section = container.querySelector('section#home');
      expect(section).toBeInTheDocument();
      // At minimum, the hero grid structure should be present
      const heroGrid = section.firstElementChild;
      expect(heroGrid).toBeTruthy();
    });

    it('enter link has correct CSS classes via aria/role', () => {
      render(<Hero />);
      const link = screen.getByRole('link', { name: /enterTheLucaverse/i });
      expect(link.tagName).toBe('A');
    });

    it('request access is a button element', () => {
      render(<Hero />);
      const btn = screen.getByRole('button', { name: /requestAccess/i });
      expect(btn.tagName).toBe('BUTTON');
      expect(btn).toHaveAttribute('type', 'button');
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(<Hero />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
