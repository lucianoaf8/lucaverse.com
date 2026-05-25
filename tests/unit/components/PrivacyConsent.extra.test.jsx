/**
 * Extra PrivacyConsent tests to cover line 21:
 * `analytics: initialConsent?.analytics ?? false`
 * The true branch is when initialConsent is provided and has analytics=true.
 * This initializes the consent state with analytics enabled.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback || key,
    i18n: { changeLanguage: jest.fn(), language: 'en' }
  }),
  Trans: ({ children }) => children,
  initReactI18next: { type: '3rdParty', init: jest.fn() }
}));

import PrivacyConsent from '../../../src/components/PrivacyConsent/PrivacyConsent';

describe('PrivacyConsent — extra coverage (line 21)', () => {
  describe('initialConsent provided — uses actual values (not ?? fallback)', () => {
    it('initializes with analytics=true when initialConsent has analytics:true', () => {
      const onConsentChange = jest.fn();
      const initialConsent = { essential: true, analytics: true, performance: false };

      render(
        <PrivacyConsent
          onConsentChange={onConsentChange}
          onPrivacyPolicyOpen={jest.fn()}
          initialConsent={initialConsent}
        />
      );

      // onConsentChange is called from useEffect on mount with the initialized state
      // The analytics toggle should reflect the initial state (analytics=true)
      expect(onConsentChange).toHaveBeenCalledWith(
        expect.objectContaining({ analytics: true })
      );
    });

    it('initializes with performance=true when initialConsent has performance:true', () => {
      const onConsentChange = jest.fn();
      const initialConsent = { essential: true, analytics: false, performance: true };

      render(
        <PrivacyConsent
          onConsentChange={onConsentChange}
          onPrivacyPolicyOpen={jest.fn()}
          initialConsent={initialConsent}
        />
      );

      expect(onConsentChange).toHaveBeenCalledWith(
        expect.objectContaining({ performance: true })
      );
    });

    it('defaults analytics to false when initialConsent is null (covers ?? false path)', () => {
      const onConsentChange = jest.fn();

      render(
        <PrivacyConsent
          onConsentChange={onConsentChange}
          onPrivacyPolicyOpen={jest.fn()}
          initialConsent={null}
        />
      );

      expect(onConsentChange).toHaveBeenCalledWith(
        expect.objectContaining({ analytics: false })
      );
    });

    it('renders without crashing when initialConsent has all fields', () => {
      expect(() => render(
        <PrivacyConsent
          onConsentChange={jest.fn()}
          onPrivacyPolicyOpen={jest.fn()}
          initialConsent={{ essential: true, analytics: true, performance: true }}
        />
      )).not.toThrow();
    });

    it('uses ?? false when initialConsent is provided but analytics is undefined', () => {
      const onConsentChange = jest.fn();
      // analytics and performance are undefined → ?? false applies
      render(
        <PrivacyConsent
          onConsentChange={onConsentChange}
          onPrivacyPolicyOpen={jest.fn()}
          initialConsent={{ essential: true }}  // analytics/performance undefined
        />
      );

      // analytics=undefined ?? false = false
      expect(onConsentChange).toHaveBeenCalledWith(
        expect.objectContaining({ analytics: false, performance: false })
      );
    });
  });
});
