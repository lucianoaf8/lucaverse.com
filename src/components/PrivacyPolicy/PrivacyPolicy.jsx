import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './PrivacyPolicy.module.css';

const PrivacyPolicy = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>{t('privacyPolicy')}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.content}>
          <div className={styles.lastUpdated}>
            <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
          </div>

          <section className={styles.section}>
            <h3>1. Information We Collect</h3>
            <h4>Essential Information (Required for Service)</h4>
            <ul>
              <li><strong>Contact Forms:</strong> Name, email address, and message content when you voluntarily submit contact forms</li>
              <li><strong>Access Requests:</strong> Name, email, and reason for access when requesting portfolio access</li>
            </ul>
            
            <h4>Optional Analytics (With Your Consent)</h4>
            <ul>
              <li><strong>Basic Usage:</strong> Language preference and approximate location (country only)</li>
              <li><strong>Technical Context:</strong> Device type, screen size (for responsive design improvement)</li>
              <li><strong>Form Analytics:</strong> Time to complete forms and interaction patterns (for UX improvement)</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h3>2. How We Use Your Information</h3>
            <ul>
              <li><strong>Essential Data:</strong> To respond to your inquiries and process access requests</li>
              <li><strong>Analytics Data:</strong> To improve website performance and user experience (only with consent)</li>
              <li><strong>Technical Data:</strong> To ensure website compatibility across devices</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h3>3. Data Retention</h3>
            <ul>
              <li><strong>Contact Messages:</strong> Retained for 2 years for communication history</li>
              <li><strong>Analytics Data:</strong> Anonymized after 6 months, deleted after 1 year</li>
              <li><strong>Session Data:</strong> Cleared when you close your browser</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h3>4. Your Rights</h3>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate personal data</li>
              <li><strong>Erasure:</strong> Request deletion of your personal data</li>
              <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
              <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
              <li><strong>Withdraw Consent:</strong> Revoke consent for analytics at any time</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h3>5. Data Security</h3>
            <p>We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.</p>
          </section>

          <section className={styles.section}>
            <h3>6. Third-Party Services</h3>
            <ul>
              <li><strong>Cloudflare:</strong> CDN and security services (processes IP addresses for protection)</li>
              <li><strong>Resend:</strong> Email delivery service (processes contact form submissions)</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h3>7. International Transfers</h3>
            <p>Your data may be processed in countries outside your jurisdiction. We ensure appropriate safeguards are in place for such transfers.</p>
          </section>

          <section className={styles.section}>
            <h3>8. Children's Privacy</h3>
            <p>This website is not intended for children under 13. We do not knowingly collect personal information from children under 13.</p>
          </section>

          <section className={styles.section}>
            <h3>9. Contact Information</h3>
            <p>For any privacy-related questions or to exercise your rights, contact us at:</p>
            <ul>
              <li><strong>Email:</strong> privacy@lucaverse.com</li>
              <li><strong>Subject:</strong> Privacy Rights Request</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h3>10. Changes to This Policy</h3>
            <p>We may update this privacy policy from time to time. Material changes will be communicated through the website or via email if you have provided your contact information.</p>
          </section>
        </div>
        
        <div className={styles.footer}>
          <button className={styles.acceptButton} onClick={onClose}>
            {t('understood')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;