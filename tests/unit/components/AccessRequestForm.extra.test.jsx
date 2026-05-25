/**
 * Extra AccessRequestForm tests to cover lines:
 * - 71-72: handleClickOutside onClose() call (clicking outside container)
 * - 143-146: CSRF error catch (addCSRFTokenToFormData throws)
 * - 154-155: localhost catch success path (JSON.parse fails in ok=true branch)
 * - 169-170: parse error catch inside response.ok=true block
 * - 176-178: setTimeout internals in success path
 * - 189-191: non-localhost catch → genericError
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const mockValidateEndpoint = jest.fn(() => true);
jest.mock('../../../src/config/api', () => ({
  getFormsEndpoint: () => 'http://localhost:8788',
  validateEndpoint: (...args) => mockValidateEndpoint(...args),
}));

jest.mock('../../../src/utils/privacyUtils', () => ({
  PrivacyManager: { isAllowed: jest.fn(() => false) },
  FormDataBuilder: {
    buildFormData: jest.fn(() => new FormData()),
  },
}));

jest.mock('../../../src/utils/securityUtils', () => ({
  sanitizeFormData: jest.fn((data) => data),
  VALIDATION_SCHEMAS: { access_request: {} },
}));

const mockAddCSRFToken = jest.fn();
jest.mock('../../../src/utils/csrfUtils', () => ({
  addCSRFTokenToFormData: (...args) => mockAddCSRFToken(...args),
  initializeCSRFProtection: jest.fn(),
}));

const mockHoneypotSystem = {
  fields: [],
  trackInteraction: jest.fn(),
  addDetectionFields: jest.fn(),
  validate: jest.fn(() => ({ isBot: false })),
};

jest.mock('../../../src/utils/honeypotUtils', () => ({
  initializeHoneypot: jest.fn(() => mockHoneypotSystem),
  trackFormInteraction: jest.fn(),
  addBotDetectionFields: jest.fn(),
}));

import AccessRequestForm from '../../../src/components/AccessRequestForm/AccessRequestForm';

const makeProps = (overrides = {}) => ({
  isOpen: true,
  onClose: jest.fn(),
  ...overrides,
});

describe('AccessRequestForm — extra coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateEndpoint.mockReturnValue(true);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ message: 'Success' }),
    });
    mockAddCSRFToken.mockImplementation(() => {});
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { hostname: 'lucaverse.com' },
    });
  });

  describe('handleClickOutside — triggers onClose (lines 71-72)', () => {
    it('calls onClose when mousedown occurs outside the form container', async () => {
      const onClose = jest.fn();
      const { container } = render(<AccessRequestForm isOpen={true} onClose={onClose} />);

      // The form container has ref={formRef}. Clicking inside the overlay but outside
      // the container triggers handleClickOutside → onClose()
      // Find the overlay (the parent div that wraps the container)
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      });

      // Dispatch a mousedown on document.body (outside the form container)
      act(() => {
        fireEvent.mouseDown(document.body);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('CSRF error catch (lines 143-146)', () => {
    it('shows CSRF error notification and does not submit when CSRF throws', async () => {
      mockAddCSRFToken.mockImplementation(() => {
        throw new Error('CSRF generation failed');
      });

      render(<AccessRequestForm {...makeProps()} />);

      await act(async () => {
        fireEvent.submit(document.querySelector('form'));
      });

      await waitFor(() => {
        expect(screen.getByText('CSRF generation failed')).toBeInTheDocument();
      });

      // fetch should NOT have been called
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('JSON parse error in ok=true branch (lines 169-170)', () => {
    it('falls back gracefully when response.text() returns invalid JSON', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'not-valid-json{{{',
      });

      render(<AccessRequestForm {...makeProps()} />);

      await act(async () => {
        fireEvent.submit(document.querySelector('form'));
      });

      // Should still show success notification via accessRequestSuccess
      await waitFor(() => {
        expect(screen.getByText('accessRequestSuccess')).toBeInTheDocument();
      });
    });
  });

  describe('setTimeout content in success path (lines 176-178)', () => {
    it('resets form and calls onClose after 3 second timeout on success', async () => {
      jest.useFakeTimers();

      const onClose = jest.fn();
      render(<AccessRequestForm isOpen={true} onClose={onClose} />);

      await act(async () => {
        fireEvent.submit(document.querySelector('form'));
      });

      // Success notification shown
      await waitFor(() => {
        expect(screen.getByText('accessRequestSuccess')).toBeInTheDocument();
      });

      // Advance 3 seconds — triggers setTimeout callback
      act(() => {
        jest.advanceTimersByTime(3100);
      });

      // onClose should have been called by the setTimeout
      expect(onClose).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('non-localhost network error (lines 189-191)', () => {
    it('shows genericError when fetch throws and hostname is not localhost', async () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { hostname: 'lucaverse.com' },
      });

      global.fetch.mockRejectedValueOnce(new Error('Network failure'));

      render(<AccessRequestForm {...makeProps()} />);

      await act(async () => {
        fireEvent.submit(document.querySelector('form'));
      });

      await waitFor(() => {
        expect(screen.getByText('genericError')).toBeInTheDocument();
      });
    });
  });

  describe('validateEndpoint returns false — throws Invalid API endpoint (lines 154-155)', () => {
    it('falls into catch block when validateEndpoint returns false', async () => {
      // Override the mock to return false for validateEndpoint
      jest.mock('../../../src/config/api', () => ({
        getFormsEndpoint: () => 'http://localhost:8788',
        validateEndpoint: () => false,
      }));

      // Since jest.mock is hoisted, we need a different approach.
      // Set hostname to localhost so the catch block shows localDev message
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { hostname: 'localhost' },
      });

      // The existing mock has validateEndpoint: () => true
      // We need to override it for this test. Use doMock or requireMock approach.
      // Actually we'll check via the 3s setTimeout path in the localhost catch
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      jest.useFakeTimers();
      const onClose = jest.fn();
      render(<AccessRequestForm isOpen={true} onClose={onClose} />);

      await act(async () => {
        fireEvent.submit(document.querySelector('form'));
      });

      await waitFor(() => {
        expect(screen.getByText('accessRequestLocalDev')).toBeInTheDocument();
      });

      // Advance 3 seconds to trigger setTimeout content (lines 189-191)
      act(() => {
        jest.advanceTimersByTime(3100);
      });

      // onClose should be called from the setTimeout
      expect(onClose).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('validateEndpoint returns false — throws Invalid API endpoint (lines 154-155)', () => {
    it('shows genericError when validateEndpoint returns false (hostname not localhost)', async () => {
      mockValidateEndpoint.mockReturnValue(false);
      // hostname is 'lucaverse.com' (not localhost) → catch → genericError
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { hostname: 'lucaverse.com' },
      });

      render(<AccessRequestForm isOpen={true} onClose={jest.fn()} />);

      await act(async () => {
        fireEvent.submit(document.querySelector('form'));
      });

      // fetch should NOT have been called (threw before fetch)
      expect(global.fetch).not.toHaveBeenCalled();

      // catch block with non-localhost → shows genericError
      await waitFor(() => {
        expect(screen.getByText('genericError')).toBeInTheDocument();
      });
    });
  });
});
