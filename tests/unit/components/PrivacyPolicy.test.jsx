/**
 * PrivacyPolicy Component Tests
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback || key,
    i18n: { changeLanguage: jest.fn(), language: 'en' }
  }),
  Trans: ({ children }) => children,
  initReactI18next: { type: '3rdParty', init: jest.fn() }
}));

import PrivacyPolicy from '../../../src/components/PrivacyPolicy/PrivacyPolicy';

const makeProps = (overrides = {}) => ({
  isOpen: true,
  onClose: jest.fn(),
  ...overrides
});

describe('PrivacyPolicy Component', () => {
  describe('Closed state', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(<PrivacyPolicy isOpen={false} onClose={jest.fn()} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when isOpen is undefined', () => {
      const { container } = render(<PrivacyPolicy onClose={jest.fn()} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Open state rendering', () => {
    it('renders the overlay when isOpen is true', () => {
      render(<PrivacyPolicy {...makeProps()} />);
      // Should have content in DOM
      expect(screen.getByText(/Information We Collect/i)).toBeInTheDocument();
    });

    it('renders the close button (×)', () => {
      render(<PrivacyPolicy {...makeProps()} />);
      const closeBtn = screen.getByRole('button', { name: '×' });
      expect(closeBtn).toBeInTheDocument();
    });

    it('renders understood/accept button', () => {
      render(<PrivacyPolicy {...makeProps()} />);
      // The footer button uses t('understood') which returns 'understood'
      expect(screen.getByRole('button', { name: /understood/i })).toBeInTheDocument();
    });

    it('renders all 10 sections', () => {
      render(<PrivacyPolicy {...makeProps()} />);
      // Find h3 headings — all 10 section titles start with "N. "
      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings.length).toBe(10);
    });

    it('renders Information We Collect section', () => {
      render(<PrivacyPolicy {...makeProps()} />);
      expect(screen.getByText(/Information We Collect/i)).toBeInTheDocument();
    });

    it('renders How We Use Your Information section', () => {
      render(<PrivacyPolicy {...makeProps()} />);
      expect(screen.getByText(/How We Use Your Information/i)).toBeInTheDocument();
    });

    it('renders Data Retention section', () => {
      render(<PrivacyPolicy {...makeProps()} />);
      expect(screen.getByText(/Data Retention/i)).toBeInTheDocument();
    });

    it('renders Your Rights section heading', () => {
      render(<PrivacyPolicy {...makeProps()} />);
      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings.some(h => /Your Rights/i.test(h.textContent))).toBe(true);
    });

    it('renders Data Security section heading', () => {
      render(<PrivacyPolicy {...makeProps()} />);
      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings.some(h => /Data Security/i.test(h.textContent))).toBe(true);
    });

    it('renders Third-Party Services section heading', () => {
      render(<PrivacyPolicy {...makeProps()} />);
      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings.some(h => /Third-Party Services/i.test(h.textContent))).toBe(true);
    });

    it('renders Contact Information section heading', () => {
      render(<PrivacyPolicy {...makeProps()} />);
      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings.some(h => /Contact Information/i.test(h.textContent))).toBe(true);
    });

    it('renders privacy@lucaverse.com email', () => {
      render(<PrivacyPolicy {...makeProps()} />);
      expect(screen.getAllByText(/privacy@lucaverse\.com/i).length).toBeGreaterThan(0);
    });

    it('renders Last Updated date', () => {
      render(<PrivacyPolicy {...makeProps()} />);
      expect(screen.getByText(/Last Updated:/i)).toBeInTheDocument();
    });

    it('renders Cloudflare in third party services', () => {
      render(<PrivacyPolicy {...makeProps()} />);
      expect(screen.getByText(/Cloudflare/i)).toBeInTheDocument();
    });

    it('renders Resend in third party services', () => {
      render(<PrivacyPolicy {...makeProps()} />);
      expect(screen.getByText(/Resend/i)).toBeInTheDocument();
    });
  });

  describe('Close interaction', () => {
    it('calls onClose when × button is clicked', () => {
      const onClose = jest.fn();
      render(<PrivacyPolicy isOpen={true} onClose={onClose} />);
      fireEvent.click(screen.getByRole('button', { name: '×' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when understood button is clicked', () => {
      const onClose = jest.fn();
      render(<PrivacyPolicy isOpen={true} onClose={onClose} />);
      fireEvent.click(screen.getByRole('button', { name: /understood/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Toggle open/closed', () => {
    it('disappears when isOpen changes from true to false', () => {
      const { rerender } = render(<PrivacyPolicy isOpen={true} onClose={jest.fn()} />);
      expect(screen.getByText(/Information We Collect/i)).toBeInTheDocument();

      rerender(<PrivacyPolicy isOpen={false} onClose={jest.fn()} />);
      expect(screen.queryByText(/Information We Collect/i)).not.toBeInTheDocument();
    });

    it('appears when isOpen changes from false to true', () => {
      const { rerender } = render(<PrivacyPolicy isOpen={false} onClose={jest.fn()} />);
      expect(screen.queryByText(/Information We Collect/i)).not.toBeInTheDocument();

      rerender(<PrivacyPolicy isOpen={true} onClose={jest.fn()} />);
      expect(screen.getByText(/Information We Collect/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations when open', async () => {
      const { container } = render(<PrivacyPolicy {...makeProps()} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
