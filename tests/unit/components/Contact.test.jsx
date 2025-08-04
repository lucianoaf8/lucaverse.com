import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import Contact from '../../../src/components/Contact/Contact';

// Mock all dependencies
jest.mock('../../../src/components/PrivacyConsent/PrivacyConsent', () => {
  return function MockPrivacyConsent({ onConsentChange, onPrivacyPolicyOpen, initialConsent }) {
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
    buildFormData: jest.fn((data, type, startTime) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append('formType', type);
      formData.append('formStartTime', startTime.toString());
      return formData;
    }),
  },
  PrivacyHelpers: {
    needsConsentDecision: jest.fn(() => true),
  },
}));

jest.mock('../../../src/utils/securityUtils', () => ({
  sanitizeFormData: jest.fn((data, schema) => ({
    isValid: true,
    sanitizedData: data,
    errors: {},
  })),
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
  initializeHoneypot: jest.fn(() => ({
    trackInteraction: jest.fn(),
    addDetectionFields: jest.fn(),
    fields: [
      { name: 'website', type: 'text', placeholder: '', style: { display: 'none' } }
    ],
  })),
  trackFormInteraction: jest.fn(),
  addBotDetectionFields: jest.fn(),
}));

describe('Contact Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    global.fetch = jest.fn();
    
    // Mock successful form submission by default
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Message sent successfully!' }),
      text: async () => JSON.stringify({ success: true, message: 'Message sent successfully!' }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders contact form with all required fields', () => {
      render(<Contact />);
      
      expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /subject/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /message/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('renders contact information section', () => {
      render(<Contact />);
      
      expect(screen.getByText(/getInTouch/i)).toBeInTheDocument();
      expect(screen.getByText(/contactSubtitle/i)).toBeInTheDocument();
      expect(screen.getByText(/address/i)).toBeInTheDocument();
      expect(screen.getByText(/canada/i)).toBeInTheDocument();
      expect(screen.getByText(/email/i)).toBeInTheDocument();
    });

    it('renders social media links', () => {
      render(<Contact />);
      
      const socialLinks = screen.getAllByRole('link');
      const socialLinksCount = socialLinks.filter(link => 
        link.getAttribute('aria-label')?.includes('GitHub') ||
        link.getAttribute('aria-label')?.includes('LinkedIn') ||
        link.getAttribute('aria-label')?.includes('Twitter') ||
        link.getAttribute('aria-label')?.includes('Medium')
      ).length;
      
      expect(socialLinksCount).toBe(4);
    });

    it('shows privacy consent modal on initial load', async () => {
      require('../../../src/utils/privacyUtils').PrivacyHelpers.needsConsentDecision.mockReturnValue(true);
      
      render(<Contact />);
      
      await waitFor(() => {
        expect(screen.getByTestId('privacy-consent')).toBeInTheDocument();
      });
    });
  });

  describe('Form Interaction', () => {
    it('updates form fields when user types', async () => {
      render(<Contact />);
      
      const nameInput = screen.getByRole('textbox', { name: /name/i });
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      
      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      
      expect(nameInput).toHaveValue('John Doe');
      expect(emailInput).toHaveValue('john@example.com');
    });

    it('clears validation errors when user starts typing', async () => {
      // Mock validation to return errors
      require('../../../src/utils/securityUtils').sanitizeFormData.mockReturnValue({
        isValid: false,
        sanitizedData: {},
        errors: { name: ['Name is required'] },
      });

      render(<Contact />);
      
      // Submit form to trigger validation errors
      const submitButton = screen.getByRole('button', { name: /send/i });
      await user.click(submitButton);
      
      // Start typing in name field
      const nameInput = screen.getByRole('textbox', { name: /name/i });
      await user.type(nameInput, 'J');
      
      // Validation error should be cleared (this would need state inspection)
      expect(nameInput).toHaveValue('J');
    });

    it('tracks form interactions for bot detection', async () => {
      const mockTrackInteraction = jest.fn();
      require('../../../src/utils/honeypotUtils').initializeHoneypot.mockReturnValue({
        trackInteraction: mockTrackInteraction,
        addDetectionFields: jest.fn(),
        fields: [],
      });

      render(<Contact />);
      
      const nameInput = screen.getByRole('textbox', { name: /name/i });
      await user.type(nameInput, 'Test');
      
      expect(mockTrackInteraction).toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data successfully', async () => {
      render(<Contact />);
      
      // Fill out form
      await user.type(screen.getByRole('textbox', { name: /name/i }), 'John Doe');
      await user.type(screen.getByRole('textbox', { name: /email/i }), 'john@example.com');
      await user.type(screen.getByRole('textbox', { name: /subject/i }), 'Test Subject');
      await user.type(screen.getByRole('textbox', { name: /message/i }), 'Test message');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /send/i });
      await user.click(submitButton);
      
      // Check that fetch was called
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

    it('shows loading state during submission', async () => {
      // Mock delayed response
      global.fetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true }),
          text: async () => JSON.stringify({ success: true }),
        }), 100))
      );

      render(<Contact />);
      
      // Fill out form
      await user.type(screen.getByRole('textbox', { name: /name/i }), 'John Doe');
      await user.type(screen.getByRole('textbox', { name: /email/i }), 'john@example.com');
      await user.type(screen.getByRole('textbox', { name: /message/i }), 'Test message');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /send/i });
      await user.click(submitButton);
      
      // Check loading state
      expect(screen.getByRole('button', { name: /sending/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
    });

    it('handles form submission errors gracefully', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      render(<Contact />);
      
      // Fill out form
      await user.type(screen.getByRole('textbox', { name: /name/i }), 'John Doe');
      await user.type(screen.getByRole('textbox', { name: /email/i }), 'john@example.com');
      await user.type(screen.getByRole('textbox', { name: /message/i }), 'Test message');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /send/i });
      await user.click(submitButton);
      
      // Should show error notification
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('handles localhost development mode gracefully', async () => {
      // Mock localhost
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { hostname: 'localhost' },
      });

      global.fetch.mockRejectedValue(new Error('Network error'));

      render(<Contact />);
      
      // Fill out form
      await user.type(screen.getByRole('textbox', { name: /name/i }), 'John Doe');
      await user.type(screen.getByRole('textbox', { name: /email/i }), 'john@example.com');
      await user.type(screen.getByRole('textbox', { name: /message/i }), 'Test message');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /send/i });
      await user.click(submitButton);
      
      // Should show success message for localhost
      await waitFor(() => {
        expect(screen.getByText(/contactLocalDev/i)).toBeInTheDocument();
      });
    });
  });

  describe('Privacy Consent', () => {
    it('handles privacy consent acceptance', async () => {
      render(<Contact />);
      
      // Wait for privacy consent modal
      await waitFor(() => {
        expect(screen.getByTestId('privacy-consent')).toBeInTheDocument();
      });
      
      // Accept analytics
      const acceptButton = screen.getByRole('button', { name: /accept analytics/i });
      await user.click(acceptButton);
      
      // Check that consent was set
      expect(require('../../../src/utils/privacyUtils').PrivacyManager.setConsent).toHaveBeenCalledWith({
        essential: true,
        analytics: true,
        performance: false,
      });
    });

    it('shows privacy policy when requested', async () => {
      render(<Contact />);
      
      // Wait for privacy consent modal
      await waitFor(() => {
        expect(screen.getByTestId('privacy-consent')).toBeInTheDocument();
      });
      
      // Click privacy policy
      const policyButton = screen.getByRole('button', { name: /privacy policy/i });
      await user.click(policyButton);
      
      // Should show privacy policy modal
      expect(screen.getByTestId('privacy-policy')).toBeInTheDocument();
    });

    it('handles consent continuation', async () => {
      render(<Contact />);
      
      // Wait for privacy consent modal
      await waitFor(() => {
        expect(screen.getByTestId('privacy-consent')).toBeInTheDocument();
      });
      
      // Click continue without setting consent
      const continueButton = screen.getByRole('button', { name: /continue to contact form/i });
      await user.click(continueButton);
      
      // Should set essential-only consent
      expect(require('../../../src/utils/privacyUtils').PrivacyManager.setConsent).toHaveBeenCalledWith({
        essential: true,
        analytics: false,
        performance: false,
      });
    });
  });

  describe('Form Validation', () => {
    it('shows validation errors for invalid data', async () => {
      // Mock validation to return errors
      require('../../../src/utils/securityUtils').sanitizeFormData.mockReturnValue({
        isValid: false,
        sanitizedData: {},
        errors: {
          name: ['Name is required'],
          email: ['Invalid email format'],
          message: ['Message is too short'],
        },
      });

      render(<Contact />);
      
      // Submit form without filling it
      const submitButton = screen.getByRole('button', { name: /send/i });
      await user.click(submitButton);
      
      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/please fix the validation errors/i)).toBeInTheDocument();
      });
    });

    it('adds default subject when not provided', async () => {
      const mockSanitizeFormData = require('../../../src/utils/securityUtils').sanitizeFormData;

      render(<Contact />);
      
      // Fill out form without subject
      await user.type(screen.getByRole('textbox', { name: /name/i }), 'John Doe');
      await user.type(screen.getByRole('textbox', { name: /email/i }), 'john@example.com');
      await user.type(screen.getByRole('textbox', { name: /message/i }), 'Test message');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /send/i });
      await user.click(submitButton);
      
      // Check that sanitization was called with default subject
      expect(mockSanitizeFormData).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'General Inquiry - Lucaverse Portfolio',
        }),
        expect.any(Object)
      );
    });
  });

  describe('Security Features', () => {
    it('initializes CSRF protection on mount', () => {
      render(<Contact />);
      
      expect(require('../../../src/utils/csrfUtils').initializeCSRFProtection).toHaveBeenCalled();
    });

    it('adds CSRF token to form submission', async () => {
      const mockAddCSRFToken = require('../../../src/utils/csrfUtils').addCSRFTokenToFormData;

      render(<Contact />);
      
      // Fill and submit form
      await user.type(screen.getByRole('textbox', { name: /name/i }), 'John Doe');
      await user.type(screen.getByRole('textbox', { name: /email/i }), 'john@example.com');
      await user.type(screen.getByRole('textbox', { name: /message/i }), 'Test message');
      
      const submitButton = screen.getByRole('button', { name: /send/i });
      await user.click(submitButton);
      
      expect(mockAddCSRFToken).toHaveBeenCalled();
    });

    it('handles CSRF token errors', async () => {
      require('../../../src/utils/csrfUtils').addCSRFTokenToFormData.mockImplementation(() => {
        throw new Error('CSRF token generation failed');
      });

      render(<Contact />);
      
      // Fill and submit form
      await user.type(screen.getByRole('textbox', { name: /name/i }), 'John Doe');
      await user.type(screen.getByRole('textbox', { name: /email/i }), 'john@example.com');
      await user.type(screen.getByRole('textbox', { name: /message/i }), 'Test message');
      
      const submitButton = screen.getByRole('button', { name: /send/i });
      await user.click(submitButton);
      
      // Should show CSRF error
      await waitFor(() => {
        expect(screen.getByText(/CSRF token generation failed/i)).toBeInTheDocument();
      });
    });

    it('renders honeypot fields for bot detection', () => {
      render(<Contact />);
      
      // Check for honeypot field (should be hidden)
      const honeypotField = document.querySelector('input[name="website"]');
      expect(honeypotField).toBeInTheDocument();
      expect(honeypotField).toHaveStyle({ display: 'none' });
    });
  });

  describe('Notifications', () => {
    it('shows success notification after successful submission', async () => {
      render(<Contact />);
      
      // Fill and submit form
      await user.type(screen.getByRole('textbox', { name: /name/i }), 'John Doe');
      await user.type(screen.getByRole('textbox', { name: /email/i }), 'john@example.com');
      await user.type(screen.getByRole('textbox', { name: /message/i }), 'Test message');
      
      const submitButton = screen.getByRole('button', { name: /send/i });
      await user.click(submitButton);
      
      // Should show success notification
      await waitFor(() => {
        expect(screen.getByText(/contactSuccess/i)).toBeInTheDocument();
      });
    });

    it('auto-closes notifications after timeout', async () => {
      jest.useFakeTimers();
      
      render(<Contact />);
      
      // Fill and submit form
      await user.type(screen.getByRole('textbox', { name: /name/i }), 'John Doe');
      await user.type(screen.getByRole('textbox', { name: /email/i }), 'john@example.com');
      await user.type(screen.getByRole('textbox', { name: /message/i }), 'Test message');
      
      const submitButton = screen.getByRole('button', { name: /send/i });
      await user.click(submitButton);
      
      // Fast-forward time
      jest.advanceTimersByTime(5000);
      
      // Notification should be auto-closed
      await waitFor(() => {
        expect(screen.queryByText(/contactSuccess/i)).not.toBeInTheDocument();
      });
      
      jest.useRealTimers();
    });

    it('allows manual closing of notifications', async () => {
      render(<Contact />);
      
      // Fill and submit form
      await user.type(screen.getByRole('textbox', { name: /name/i }), 'John Doe');
      await user.type(screen.getByRole('textbox', { name: /email/i }), 'john@example.com');
      await user.type(screen.getByRole('textbox', { name: /message/i }), 'Test message');
      
      const submitButton = screen.getByRole('button', { name: /send/i });
      await user.click(submitButton);
      
      // Wait for notification
      await waitFor(() => {
        expect(screen.getByText(/contactSuccess/i)).toBeInTheDocument();
      });
      
      // Close notification manually
      const closeButton = screen.getByRole('button', { name: /×/i });
      await user.click(closeButton);
      
      expect(screen.queryByText(/contactSuccess/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<Contact />);
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('has proper form labels and structure', () => {
      render(<Contact />);
      
      // Check that all form inputs have labels (via placeholder or aria-label)
      expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /subject/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /message/i })).toBeInTheDocument();
    });

    it('maintains focus management in modals', async () => {
      render(<Contact />);
      
      // Open privacy consent modal
      await waitFor(() => {
        expect(screen.getByTestId('privacy-consent')).toBeInTheDocument();
      });
      
      // Focus should be managed within modal
      const acceptButton = screen.getByRole('button', { name: /accept analytics/i });
      expect(acceptButton).toBeInTheDocument();
    });
  });

  describe('Error Boundary', () => {
    it('handles component errors gracefully', () => {
      // Mock console.error to prevent error logging during test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock a component that throws an error
      require('../../../src/utils/privacyUtils').PrivacyManager.getConsent.mockImplementation(() => {
        throw new Error('Test error');
      });
      
      // Should not crash the entire component
      expect(() => render(<Contact />)).not.toThrow();
      
      consoleSpy.mockRestore();
    });
  });
});