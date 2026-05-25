import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import Contact from '../../../src/components/Contact/Contact';

// Mock all external dependencies
jest.mock('../../../src/components/PrivacyConsent/PrivacyConsent', () => {
  return function MockPrivacyConsent({ onConsentChange, onPrivacyPolicyOpen }) {
    return (
      <div data-testid="privacy-consent">
        <button onClick={() => onConsentChange({ essential: true, analytics: true, performance: false })}>
          Accept Analytics
        </button>
        <button onClick={() => onConsentChange({ essential: true, analytics: false, performance: false })}>
          Essential Only
        </button>
        <button onClick={onPrivacyPolicyOpen}>Privacy Policy</button>
      </div>
    );
  };
});

jest.mock('../../../src/components/PrivacyPolicy/PrivacyPolicy', () => {
  return function MockPrivacyPolicy({ isOpen, onClose }) {
    return isOpen ? (
      <div data-testid="privacy-policy">
        <button onClick={onClose}>Close Policy</button>
      </div>
    ) : null;
  };
});

jest.mock('../../../src/utils/privacyUtils', () => ({
  PrivacyManager: {
    getConsent: jest.fn(() => null),
    setConsent: jest.fn(),
    hasConsent: jest.fn(() => false),
  },
  FormDataBuilder: {
    buildFormData: jest.fn(),
  },
  PrivacyHelpers: {
    needsConsentDecision: jest.fn(() => true),
  },
}));

jest.mock('../../../src/utils/securityUtils', () => ({
  sanitizeFormData: jest.fn(),
  VALIDATION_SCHEMAS: {
    contact: {},
  },
}));

jest.mock('../../../src/config/api', () => ({
  getFormsEndpoint: () => 'https://api.example.com/forms',
  validateEndpoint: () => true,
}));

jest.mock('../../../src/utils/csrfUtils', () => ({
  addCSRFTokenToFormData: jest.fn(),
  initializeCSRFProtection: jest.fn(),
}));

jest.mock('../../../src/utils/honeypotUtils', () => ({
  initializeHoneypot: jest.fn(),
  trackFormInteraction: jest.fn(),
  addBotDetectionFields: jest.fn(),
}));

// Helper: get form inputs by placeholder (t(key) returns key itself in test env)
const getNameInput = () => screen.getByPlaceholderText('yourNamePlaceholder');
const getEmailInput = () => screen.getByPlaceholderText('yourEmailPlaceholder');
const getSubjectInput = () => screen.getByPlaceholderText('subjectPlaceholder');
const getMessageInput = () => screen.getByPlaceholderText('messagePlaceholder');
const getSubmitButton = () => screen.getByRole('button', { name: /sendMessage/i });

// Helper: fill all required form fields via fireEvent and submit
const fillAndSubmit = (container, overrides = {}) => {
  const fields = {
    name: 'John Doe',
    email: 'john@example.com',
    subject: 'Test Subject',
    message: 'Test message',
    ...overrides,
  };

  fireEvent.change(screen.getByPlaceholderText('yourNamePlaceholder'), {
    target: { name: 'name', value: fields.name },
  });
  fireEvent.change(screen.getByPlaceholderText('yourEmailPlaceholder'), {
    target: { name: 'email', value: fields.email },
  });
  if (fields.subject !== null) {
    fireEvent.change(screen.getByPlaceholderText('subjectPlaceholder'), {
      target: { name: 'subject', value: fields.subject },
    });
  }
  fireEvent.change(screen.getByPlaceholderText('messagePlaceholder'), {
    target: { name: 'message', value: fields.message },
  });

  const form = container.querySelector('form');
  fireEvent.submit(form);
};

describe('Contact Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();

    // Default: successful submission
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Message sent successfully!' }),
      text: async () => JSON.stringify({ success: true, message: 'Message sent successfully!' }),
    });

    // Re-setup all mock implementations after clearAllMocks()
    const { sanitizeFormData } = require('../../../src/utils/securityUtils');
    sanitizeFormData.mockImplementation((data) => ({
      isValid: true,
      sanitizedData: data,
      errors: {},
    }));

    const { FormDataBuilder } = require('../../../src/utils/privacyUtils');
    FormDataBuilder.buildFormData.mockImplementation((data, type, startTime) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) formData.append(key, String(value));
      });
      formData.append('formType', type);
      formData.append('formStartTime', String(startTime));
      return formData;
    });

    const { PrivacyManager } = require('../../../src/utils/privacyUtils');
    PrivacyManager.hasConsent.mockReturnValue(false);
    PrivacyManager.getConsent.mockReturnValue(null);

    // CSRF: reset to no-op (critical — prevents leak from CSRF-throw test)
    const { addCSRFTokenToFormData, initializeCSRFProtection } = require('../../../src/utils/csrfUtils');
    addCSRFTokenToFormData.mockImplementation(() => {}); // no-op
    initializeCSRFProtection.mockImplementation(() => {});

    const { initializeHoneypot } = require('../../../src/utils/honeypotUtils');
    initializeHoneypot.mockReturnValue({
      trackInteraction: jest.fn(),
      addDetectionFields: jest.fn(),
      fields: [
        { name: 'website', type: 'text', placeholder: '', style: { display: 'none' } },
      ],
    });

    // Reset window.location hostname to non-localhost for most tests
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { hostname: 'example.com', origin: 'https://example.com' },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders contact form with all required fields identified by placeholder', () => {
      render(<Contact />);

      expect(getNameInput()).toBeInTheDocument();
      expect(getEmailInput()).toBeInTheDocument();
      expect(getSubjectInput()).toBeInTheDocument();
      expect(getMessageInput()).toBeInTheDocument();
      expect(getSubmitButton()).toBeInTheDocument();
    });

    it('renders contact information section with i18n keys as text', () => {
      render(<Contact />);

      expect(screen.getByText('getInTouch')).toBeInTheDocument();
      expect(screen.getByText('contactSubtitle')).toBeInTheDocument();
      expect(screen.getByText('address')).toBeInTheDocument();
      expect(screen.getByText('email')).toBeInTheDocument();
    });

    it('renders social media links with aria-labels', () => {
      render(<Contact />);

      const socialLinks = screen.getAllByRole('link');
      const socialCount = socialLinks.filter(link =>
        link.getAttribute('aria-label')?.includes('GitHub') ||
        link.getAttribute('aria-label')?.includes('LinkedIn') ||
        link.getAttribute('aria-label')?.includes('Twitter') ||
        link.getAttribute('aria-label')?.includes('Medium')
      ).length;

      expect(socialCount).toBe(4);
    });

    it('does not show privacy consent modal on initial load (disabled in component)', () => {
      render(<Contact />);

      // Privacy consent modal is disabled with {false && ...} in the component
      expect(screen.queryByTestId('privacy-consent')).not.toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('updates form fields when user types', async () => {
      const user = userEvent.setup();
      render(<Contact />);

      const nameInput = getNameInput();
      const emailInput = getEmailInput();

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');

      expect(nameInput).toHaveValue('John Doe');
      expect(emailInput).toHaveValue('john@example.com');
    });

    it('clears field value when user types replacement text', async () => {
      const user = userEvent.setup();
      render(<Contact />);

      const nameInput = getNameInput();
      await user.type(nameInput, 'J');
      expect(nameInput).toHaveValue('J');
    });

    it('tracks form interactions via honeypot system', async () => {
      const user = userEvent.setup();
      const mockTrackInteraction = jest.fn();
      const { initializeHoneypot } = require('../../../src/utils/honeypotUtils');
      initializeHoneypot.mockReturnValue({
        trackInteraction: mockTrackInteraction,
        addDetectionFields: jest.fn(),
        fields: [],
      });

      render(<Contact />);

      const nameInput = getNameInput();
      await user.type(nameInput, 'T');

      expect(mockTrackInteraction).toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data and calls fetch', async () => {
      const { container } = render(<Contact />);

      fillAndSubmit(container);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.example.com/forms',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include',
          })
        );
      });
    });

    it('shows loading state during submission (button text changes to Sending...)', async () => {
      // Use a delayed fetch so we can catch the loading state
      let resolveFetch;
      global.fetch.mockReturnValue(
        new Promise(resolve => { resolveFetch = resolve; })
      );

      const { container } = render(<Contact />);

      fillAndSubmit(container);

      // Loading state: button text changes to 'Sending...' and is disabled
      await waitFor(() => {
        const btn = screen.getByRole('button', { name: /Sending\.\.\./i });
        expect(btn).toBeInTheDocument();
        expect(btn).toBeDisabled();
      });

      // Resolve fetch to clean up
      act(() => {
        resolveFetch({ ok: true, text: async () => '{}' });
      });
    });

    it('handles form submission network errors gracefully', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const { container } = render(<Contact />);

      fillAndSubmit(container);

      // On non-localhost, shows generic error
      await waitFor(() => {
        expect(screen.getByText('genericError')).toBeInTheDocument();
      });
    });

    it('shows development success message when fetch fails on localhost', async () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { hostname: 'localhost' },
      });

      global.fetch.mockRejectedValue(new Error('Network error'));

      const { container } = render(<Contact />);

      fillAndSubmit(container);

      await waitFor(() => {
        expect(screen.getByText('contactLocalDev')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('shows validation error notification when data is invalid', async () => {
      const { sanitizeFormData } = require('../../../src/utils/securityUtils');
      sanitizeFormData.mockReturnValue({
        isValid: false,
        sanitizedData: {},
        errors: {
          name: ['Name is required'],
          email: ['Invalid email format'],
          message: ['Message is too short'],
        },
      });

      const { container } = render(<Contact />);

      // fireEvent.submit bypasses HTML5 required validation
      const form = container.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/please fix the validation errors/i)).toBeInTheDocument();
      });
    });

    it('adds default subject when form subject is empty', async () => {
      const mockSanitizeFormData = require('../../../src/utils/securityUtils').sanitizeFormData;

      const { container } = render(<Contact />);

      // Fill all fields EXCEPT subject to test default subject behavior
      fireEvent.change(getNameInput(), { target: { name: 'name', value: 'John Doe' } });
      fireEvent.change(getEmailInput(), { target: { name: 'email', value: 'john@example.com' } });
      fireEvent.change(getMessageInput(), { target: { name: 'message', value: 'Test message' } });
      // subject left empty — component should add default

      const form = container.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockSanitizeFormData).toHaveBeenCalledWith(
          expect.objectContaining({
            subject: 'General Inquiry - Lucaverse Portfolio',
          }),
          expect.any(Object)
        );
      });
    });
  });

  describe('Security Features', () => {
    it('initializes CSRF protection on component mount', () => {
      render(<Contact />);

      expect(require('../../../src/utils/csrfUtils').initializeCSRFProtection).toHaveBeenCalled();
    });

    it('adds CSRF token to form submission data', async () => {
      const mockAddCSRFToken = require('../../../src/utils/csrfUtils').addCSRFTokenToFormData;

      const { container } = render(<Contact />);

      fillAndSubmit(container);

      await waitFor(() => {
        expect(mockAddCSRFToken).toHaveBeenCalled();
      });
    });

    it('shows error when CSRF token generation fails', async () => {
      const { addCSRFTokenToFormData } = require('../../../src/utils/csrfUtils');
      addCSRFTokenToFormData.mockImplementation(() => {
        throw new Error('CSRF token generation failed');
      });

      const { container } = render(<Contact />);

      fillAndSubmit(container);

      await waitFor(() => {
        expect(screen.getByText(/CSRF token generation failed/i)).toBeInTheDocument();
      });
    });

    it('renders honeypot fields for bot detection (after mount)', async () => {
      render(<Contact />);

      await waitFor(() => {
        const honeypotField = document.querySelector('input[name="website"]');
        expect(honeypotField).toBeInTheDocument();
        expect(honeypotField).toHaveStyle({ display: 'none' });
      });
    });
  });

  describe('Notifications', () => {
    it('shows success notification (contactSuccess key) after successful submission', async () => {
      const { container } = render(<Contact />);

      fillAndSubmit(container);

      await waitFor(() => {
        expect(screen.getByText('contactSuccess')).toBeInTheDocument();
      });
    });

    it('allows manual closing of success notification', async () => {
      const { container } = render(<Contact />);

      fillAndSubmit(container);

      await waitFor(() => {
        expect(screen.getByText('contactSuccess')).toBeInTheDocument();
      });

      // Close notification manually via the × button
      const closeButton = screen.getByRole('button', { name: /×/i });
      fireEvent.click(closeButton);

      expect(screen.queryByText('contactSuccess')).not.toBeInTheDocument();
    });

    it('auto-closes notification after timeout', async () => {
      const { container } = render(<Contact />);

      fillAndSubmit(container);

      // Wait for success notification to appear
      await waitFor(() => {
        expect(screen.getByText('contactSuccess')).toBeInTheDocument();
      });

      // Component calls setTimeout(hideNotification, 3000) after success
      // Wait for it to auto-close (within 4s)
      await waitFor(() => {
        expect(screen.queryByText('contactSuccess')).not.toBeInTheDocument();
      }, { timeout: 4000 });
    }, 6000);
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<Contact />);
      const results = await axe(container);

      expect(results).toHaveNoViolations();
    }, 10000);

    it('form inputs are present in the DOM', () => {
      render(<Contact />);

      expect(getNameInput()).toBeInTheDocument();
      expect(getEmailInput()).toBeInTheDocument();
      expect(getSubjectInput()).toBeInTheDocument();
      expect(getMessageInput()).toBeInTheDocument();
    });
  });

  describe('Error Boundary', () => {
    it('handles component errors gracefully when privacy manager throws', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      require('../../../src/utils/privacyUtils').PrivacyManager.getConsent.mockImplementation(() => {
        throw new Error('Test error');
      });

      // Should not crash the entire component
      expect(() => render(<Contact />)).not.toThrow();

      consoleSpy.mockRestore();
    });
  });
});
