import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './PrivacyConsent.module.css';

const PrivacyConsent = ({ onConsentChange, onPrivacyPolicyOpen, initialConsent = null }) => {
  const { t } = useTranslation();
  const [consent, setConsent] = useState({
    essential: true, // Always true, cannot be disabled
    analytics: initialConsent?.analytics ?? false,
    performance: initialConsent?.performance ?? false
  });

  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Notify parent component of consent changes
    onConsentChange(consent);
  }, [consent, onConsentChange]);

  const handleConsentChange = (category, value) => {
    if (category === 'essential') return; // Essential cannot be disabled
    
    setConsent(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const handleAcceptAll = () => {
    const allConsent = {
      essential: true,
      analytics: true,
      performance: true
    };
    setConsent(allConsent);
  };

  const handleAcceptEssentialOnly = () => {
    const essentialOnly = {
      essential: true,
      analytics: false,
      performance: false
    };
    setConsent(essentialOnly);
  };

  return (
    <div className={styles.consentContainer}>
      <div className={styles.consentHeader}>
        <h3 className={styles.consentTitle}>
          🛡️ {t('dataPrivacyConsent', 'Data Privacy & Consent')}
        </h3>
        <p className={styles.consentSubtitle}>
          {t('consentDescription', 'Choose how your data is used. You can change these preferences at any time.')}
        </p>
      </div>

      <div className={styles.consentOptions}>
        {/* Essential Data - Always Required */}
        <div className={styles.consentItem}>
          <div className={styles.consentItemHeader}>
            <div className={styles.consentToggle}>
              <input
                type="checkbox"
                id="essential"
                checked={consent.essential}
                disabled={true}
                className={styles.consentCheckbox}
              />
              <label htmlFor="essential" className={styles.consentLabel}>
                <span className={styles.consentCategory}>
                  ✅ {t('essentialData', 'Essential Data')}
                </span>
                <span className={styles.consentRequired}>
                  {t('required', 'Required')}
                </span>
              </label>
            </div>
          </div>
          <div className={styles.consentDescription}>
            <p>{t('essentialDataDesc', 'Name, email, and message content needed to process your contact requests and provide our services.')}</p>
            <div className={styles.dataItems}>
              <span className={styles.dataItem}>📧 Contact information</span>
              <span className={styles.dataItem}>💬 Message content</span>
              <span className={styles.dataItem}>🔐 Session tokens</span>
            </div>
          </div>
        </div>

        {/* Analytics Data - Optional */}
        <div className={styles.consentItem}>
          <div className={styles.consentItemHeader}>
            <div className={styles.consentToggle}>
              <input
                type="checkbox"
                id="analytics"
                checked={consent.analytics}
                onChange={(e) => handleConsentChange('analytics', e.target.checked)}
                className={styles.consentCheckbox}
              />
              <label htmlFor="analytics" className={styles.consentLabel}>
                <span className={styles.consentCategory}>
                  📊 {t('analyticsData', 'Usage Analytics')}
                </span>
                <span className={styles.consentOptional}>
                  {t('optional', 'Optional')}
                </span>
              </label>
            </div>
          </div>
          <div className={styles.consentDescription}>
            <p>{t('analyticsDataDesc', 'Help us improve the website by sharing anonymous usage patterns and form interaction data.')}</p>
            <div className={styles.dataItems}>
              <span className={styles.dataItem}>🌍 Country (not precise location)</span>
              <span className={styles.dataItem}>🕒 Form completion time</span>
              <span className={styles.dataItem}>📱 Device type (mobile/desktop)</span>
              <span className={styles.dataItem}>🎯 Form interaction patterns</span>
            </div>
          </div>
        </div>

        {/* Performance Data - Optional */}
        <div className={styles.consentItem}>
          <div className={styles.consentItemHeader}>
            <div className={styles.consentToggle}>
              <input
                type="checkbox"
                id="performance"
                checked={consent.performance}
                onChange={(e) => handleConsentChange('performance', e.target.checked)}
                className={styles.consentCheckbox}
              />
              <label htmlFor="performance" className={styles.consentLabel}>
                <span className={styles.consentCategory}>
                  ⚡ {t('performanceData', 'Performance Data')}
                </span>
                <span className={styles.consentOptional}>
                  {t('optional', 'Optional')}
                </span>
              </label>
            </div>
          </div>
          <div className={styles.consentDescription}>
            <p>{t('performanceDataDesc', 'Technical information to optimize website performance and ensure compatibility across devices.')}</p>
            <div className={styles.dataItems}>
              <span className={styles.dataItem}>📏 Screen size (for responsive design)</span>
              <span className={styles.dataItem}>🌐 Browser language preference</span>
              <span className={styles.dataItem}>📡 Connection type</span>
              <span className={styles.dataItem}>⏱️ Page load performance</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.consentActions}>
        <div className={styles.consentButtons}>
          <button
            type="button"
            onClick={handleAcceptEssentialOnly}
            className={`${styles.consentButton} ${styles.essentialOnly}`}
          >
            {t('acceptEssentialOnly', 'Essential Only')}
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className={`${styles.consentButton} ${styles.acceptAll}`}
          >
            {t('acceptAll', 'Accept All')}
          </button>
        </div>
        
        <div className={styles.privacyLinks}>
          <button
            type="button"
            onClick={onPrivacyPolicyOpen}
            className={styles.privacyPolicyLink}
          >
            📋 {t('readPrivacyPolicy', 'Read Privacy Policy')}
          </button>
          <span className={styles.linkSeparator}>•</span>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className={styles.detailsToggle}
          >
            {showDetails ? '🔼' : '🔽'} {t('technicalDetails', 'Technical Details')}
          </button>
        </div>
      </div>

      {showDetails && (
        <div className={styles.technicalDetails}>
          <h4>{t('technicalDetailsTitle', 'What Data We Collect & Why')}</h4>
          <div className={styles.detailsGrid}>
            <div className={styles.detailsSection}>
              <h5>🛡️ Data Protection</h5>
              <ul>
                <li>All data encrypted in transit and at rest</li>
                <li>No data sold to third parties</li>
                <li>Minimal data retention periods</li>
                <li>GDPR & CCPA compliant</li>
              </ul>
            </div>
            <div className={styles.detailsSection}>
              <h5>🎯 Purpose Limitation</h5>
              <ul>
                <li>Contact data: Respond to inquiries only</li>
                <li>Analytics: Website improvement only</li>
                <li>Performance: Technical optimization only</li>
                <li>No profiling or automated decisions</li>
              </ul>
            </div>
            <div className={styles.detailsSection}>
              <h5>⏳ Data Retention</h5>
              <ul>
                <li>Contact messages: 2 years maximum</li>
                <li>Analytics data: 1 year, then anonymized</li>
                <li>Session data: Browser session only</li>
                <li>You can request deletion anytime</li>
              </ul>
            </div>
            <div className={styles.detailsSection}>
              <h5>👤 Your Rights</h5>
              <ul>
                <li>Access your data anytime</li>
                <li>Correct inaccurate information</li>
                <li>Delete your data (right to erasure)</li>
                <li>Data portability (machine-readable format)</li>
              </ul>
            </div>
          </div>
          <div className={styles.contactInfo}>
            <p>
              <strong>Privacy Questions?</strong> Contact us at{' '}
              <a href="mailto:privacy@lucaverse.com" className={styles.emailLink}>
                privacy@lucaverse.com
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivacyConsent;