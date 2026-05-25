/**
 * PrivacyConsent Component Tests
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback || key,
    i18n: { changeLanguage: jest.fn(), language: 'en' }
  }),
  Trans: ({ children }) => children,
  initReactI18next: { type: '3rdParty', init: jest.fn() }
}));

import PrivacyConsent from '../../../src/components/PrivacyConsent/PrivacyConsent';

const makeProps = (overrides = {}) => ({
  onConsentChange: jest.fn(),
  onPrivacyPolicyOpen: jest.fn(),
  initialConsent: null,
  ...overrides
});

describe('PrivacyConsent Component', () => {
  const user = userEvent.setup();

  describe('Rendering', () => {
    it('renders without crashing', () => {
      expect(() => render(<PrivacyConsent {...makeProps()} />)).not.toThrow();
    });

    it('renders the consent header title', () => {
      render(<PrivacyConsent {...makeProps()} />);
      expect(screen.getByText(/Data Privacy & Consent/i)).toBeInTheDocument();
    });

    it('renders Essential Data section', () => {
      render(<PrivacyConsent {...makeProps()} />);
      expect(screen.getByText(/Essential Data/i)).toBeInTheDocument();
    });

    it('renders Usage Analytics section', () => {
      render(<PrivacyConsent {...makeProps()} />);
      expect(screen.getByText(/Usage Analytics/i)).toBeInTheDocument();
    });

    it('renders Performance Data section', () => {
      render(<PrivacyConsent {...makeProps()} />);
      expect(screen.getByText(/Performance Data/i)).toBeInTheDocument();
    });

    it('renders Essential Only button', () => {
      render(<PrivacyConsent {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Essential Only/i })).toBeInTheDocument();
    });

    it('renders Accept All button', () => {
      render(<PrivacyConsent {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Accept All/i })).toBeInTheDocument();
    });

    it('renders Read Privacy Policy button', () => {
      render(<PrivacyConsent {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Read Privacy Policy/i })).toBeInTheDocument();
    });

    it('renders Technical Details toggle button', () => {
      render(<PrivacyConsent {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Technical Details/i })).toBeInTheDocument();
    });

    it('essential checkbox is checked and disabled', () => {
      render(<PrivacyConsent {...makeProps()} />);
      const essentialCheckbox = screen.getByRole('checkbox', { name: /Essential Data/i });
      expect(essentialCheckbox).toBeChecked();
      expect(essentialCheckbox).toBeDisabled();
    });

    it('analytics checkbox starts unchecked by default', () => {
      render(<PrivacyConsent {...makeProps()} />);
      const analyticsCheckbox = screen.getByRole('checkbox', { name: /Usage Analytics/i });
      expect(analyticsCheckbox).not.toBeChecked();
    });

    it('performance checkbox starts unchecked by default', () => {
      render(<PrivacyConsent {...makeProps()} />);
      const perfCheckbox = screen.getByRole('checkbox', { name: /Performance Data/i });
      expect(perfCheckbox).not.toBeChecked();
    });
  });

  describe('Initial consent prop', () => {
    it('initializes analytics checkbox from initialConsent', () => {
      render(<PrivacyConsent {...makeProps({ initialConsent: { analytics: true, performance: false } })} />);
      const analyticsCheckbox = screen.getByRole('checkbox', { name: /Usage Analytics/i });
      expect(analyticsCheckbox).toBeChecked();
    });

    it('initializes performance checkbox from initialConsent', () => {
      render(<PrivacyConsent {...makeProps({ initialConsent: { analytics: false, performance: true } })} />);
      const perfCheckbox = screen.getByRole('checkbox', { name: /Performance Data/i });
      expect(perfCheckbox).toBeChecked();
    });
  });

  describe('onConsentChange callback', () => {
    it('calls onConsentChange on mount with initial consent state', () => {
      const onConsentChange = jest.fn();
      render(<PrivacyConsent onConsentChange={onConsentChange} onPrivacyPolicyOpen={jest.fn()} />);
      expect(onConsentChange).toHaveBeenCalledWith({
        essential: true,
        analytics: false,
        performance: false
      });
    });

    it('calls onConsentChange when analytics checkbox changes', () => {
      const onConsentChange = jest.fn();
      render(<PrivacyConsent onConsentChange={onConsentChange} onPrivacyPolicyOpen={jest.fn()} />);
      onConsentChange.mockClear();

      const analyticsCheckbox = screen.getByRole('checkbox', { name: /Usage Analytics/i });
      fireEvent.click(analyticsCheckbox);

      expect(onConsentChange).toHaveBeenCalledWith(
        expect.objectContaining({ analytics: true })
      );
    });

    it('calls onConsentChange when performance checkbox changes', () => {
      const onConsentChange = jest.fn();
      render(<PrivacyConsent onConsentChange={onConsentChange} onPrivacyPolicyOpen={jest.fn()} />);
      onConsentChange.mockClear();

      const perfCheckbox = screen.getByRole('checkbox', { name: /Performance Data/i });
      fireEvent.click(perfCheckbox);

      expect(onConsentChange).toHaveBeenCalledWith(
        expect.objectContaining({ performance: true })
      );
    });

    it('essential consent remains true when analytics changes', () => {
      const onConsentChange = jest.fn();
      render(<PrivacyConsent onConsentChange={onConsentChange} onPrivacyPolicyOpen={jest.fn()} />);
      onConsentChange.mockClear();

      fireEvent.click(screen.getByRole('checkbox', { name: /Usage Analytics/i }));

      const lastCall = onConsentChange.mock.calls[onConsentChange.mock.calls.length - 1][0];
      expect(lastCall.essential).toBe(true);
    });
  });

  describe('Accept All button', () => {
    it('sets all consent to true', () => {
      const onConsentChange = jest.fn();
      render(<PrivacyConsent onConsentChange={onConsentChange} onPrivacyPolicyOpen={jest.fn()} />);
      onConsentChange.mockClear();

      fireEvent.click(screen.getByRole('button', { name: /Accept All/i }));

      expect(onConsentChange).toHaveBeenCalledWith({
        essential: true,
        analytics: true,
        performance: true
      });
    });

    it('checks analytics checkbox after Accept All', () => {
      render(<PrivacyConsent {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: /Accept All/i }));
      expect(screen.getByRole('checkbox', { name: /Usage Analytics/i })).toBeChecked();
    });

    it('checks performance checkbox after Accept All', () => {
      render(<PrivacyConsent {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: /Accept All/i }));
      expect(screen.getByRole('checkbox', { name: /Performance Data/i })).toBeChecked();
    });
  });

  describe('Essential Only button', () => {
    it('sets analytics and performance to false', () => {
      const onConsentChange = jest.fn();
      // Start with all accepted
      render(<PrivacyConsent
        onConsentChange={onConsentChange}
        onPrivacyPolicyOpen={jest.fn()}
        initialConsent={{ analytics: true, performance: true }}
      />);
      onConsentChange.mockClear();

      fireEvent.click(screen.getByRole('button', { name: /Essential Only/i }));

      expect(onConsentChange).toHaveBeenCalledWith({
        essential: true,
        analytics: false,
        performance: false
      });
    });

    it('unchecks analytics after Essential Only', () => {
      render(<PrivacyConsent {...makeProps({ initialConsent: { analytics: true, performance: true } })} />);
      fireEvent.click(screen.getByRole('button', { name: /Essential Only/i }));
      expect(screen.getByRole('checkbox', { name: /Usage Analytics/i })).not.toBeChecked();
    });
  });

  describe('Essential checkbox cannot be unchecked', () => {
    it('clicking essential checkbox does not change its state', () => {
      const onConsentChange = jest.fn();
      render(<PrivacyConsent onConsentChange={onConsentChange} onPrivacyPolicyOpen={jest.fn()} />);
      onConsentChange.mockClear();

      const essentialCheckbox = screen.getByRole('checkbox', { name: /Essential Data/i });
      fireEvent.click(essentialCheckbox);

      // It's disabled, so onChange never fires — consent stays the same
      const lastCall = onConsentChange.mock.calls.length > 0
        ? onConsentChange.mock.calls[onConsentChange.mock.calls.length - 1][0]
        : { essential: true };
      expect(lastCall.essential).toBe(true);
    });
  });

  describe('Privacy Policy button', () => {
    it('calls onPrivacyPolicyOpen when clicked', () => {
      const onPrivacyPolicyOpen = jest.fn();
      render(<PrivacyConsent onConsentChange={jest.fn()} onPrivacyPolicyOpen={onPrivacyPolicyOpen} />);
      fireEvent.click(screen.getByRole('button', { name: /Read Privacy Policy/i }));
      expect(onPrivacyPolicyOpen).toHaveBeenCalledTimes(1);
    });
  });

  describe('Technical Details toggle', () => {
    it('technical details section is hidden by default', () => {
      render(<PrivacyConsent {...makeProps()} />);
      expect(screen.queryByText(/Data Protection/i)).not.toBeInTheDocument();
    });

    it('shows technical details when toggle is clicked', () => {
      render(<PrivacyConsent {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: /Technical Details/i }));
      expect(screen.getByText(/What Data We Collect & Why/i)).toBeInTheDocument();
    });

    it('hides technical details when toggled again', () => {
      render(<PrivacyConsent {...makeProps()} />);
      const toggleBtn = screen.getByRole('button', { name: /Technical Details/i });
      fireEvent.click(toggleBtn);
      expect(screen.getByText(/What Data We Collect & Why/i)).toBeInTheDocument();
      fireEvent.click(toggleBtn);
      expect(screen.queryByText(/What Data We Collect & Why/i)).not.toBeInTheDocument();
    });

    it('technical details shows Data Protection section', () => {
      render(<PrivacyConsent {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: /Technical Details/i }));
      expect(screen.getByText(/Data Protection/i)).toBeInTheDocument();
    });

    it('technical details shows Your Rights section', () => {
      render(<PrivacyConsent {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: /Technical Details/i }));
      expect(screen.getByText(/Your Rights/i)).toBeInTheDocument();
    });

    it('technical details contains privacy email link', () => {
      render(<PrivacyConsent {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: /Technical Details/i }));
      const emailLink = screen.getByRole('link', { name: /privacy@lucaverse.com/i });
      expect(emailLink).toHaveAttribute('href', 'mailto:privacy@lucaverse.com');
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(<PrivacyConsent {...makeProps()} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('checkboxes have associated labels', () => {
      render(<PrivacyConsent {...makeProps()} />);
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(cb => {
        expect(cb).toHaveAttribute('id');
        expect(document.querySelector(`label[for="${cb.id}"]`)).toBeInTheDocument();
      });
    });
  });
});
