import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Contact.module.css';
import PrivacyConsent from '../PrivacyConsent/PrivacyConsent';
import PrivacyPolicy from '../PrivacyPolicy/PrivacyPolicy';
import { PrivacyManager, FormDataBuilder, PrivacyHelpers } from '../../utils/privacyUtils';
import { sanitizeFormData, VALIDATION_SCHEMAS } from '../../utils/securityUtils';
import { getFormsEndpoint, validateEndpoint } from '../../config/api';
import { addCSRFTokenToFormData, initializeCSRFProtection } from '../../utils/csrfUtils';
import { initializeHoneypot, trackFormInteraction, addBotDetectionFields } from '../../utils/honeypotUtils';

// Custom Notification Component
const NotificationToast = ({ show, type, message, onClose }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 5000); // Auto-close after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  const isSuccess = type === 'success';
  const isError = type === 'error';

  return (
    <div className={`${styles.toast} ${styles[type]} ${show ? styles.show : ''}`}>
      <div className={styles.toastContent}>
        <div className={styles.toastIcon}>
          {isSuccess && '🚀'}
          {isError && '⚠️'}
          {type === 'loading' && (
            <div className={styles.spinner}></div>
          )}
        </div>
        <div className={styles.toastMessage}>{message}</div>
        {(isSuccess || isError) && (
          <button className={styles.toastClose} onClick={onClose}>×</button>
        )}
      </div>
    </div>
  );
};

export default function Contact() {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  const [validationErrors, setValidationErrors] = useState({});
  
  // Privacy consent management
  const [showPrivacyConsent, setShowPrivacyConsent] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(null);
  const [formStartTime] = useState(Date.now());
  
  // Enhanced honeypot system
  const [honeypotSystem, setHoneypotSystem] = useState(null);

  // Check for existing consent and initialize CSRF on component mount
  useEffect(() => {
    // Initialize CSRF protection
    initializeCSRFProtection();
    
    // Initialize enhanced honeypot system
    const honeypot = initializeHoneypot();
    setHoneypotSystem(honeypot);
    
    const existingConsent = PrivacyManager.getConsent();
    if (existingConsent) {
      setPrivacyConsent(existingConsent.preferences);
    } else if (PrivacyHelpers.needsConsentDecision()) {
      setShowPrivacyConsent(true);
    }
  }, []);

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
  };

  const hideNotification = () => {
    setNotification({ show: false, type: '', message: '' });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Track form interactions for bot detection
    if (honeypotSystem) {
      honeypotSystem.trackInteraction();
    }
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handlePrivacyConsentChange = (consent) => {
    setPrivacyConsent(consent);
    PrivacyManager.setConsent(consent);
  };

  const handlePrivacyConsentClose = () => {
    setShowPrivacyConsent(false);
    // If no consent given, set essential only
    if (!PrivacyManager.hasConsent()) {
      const essentialOnly = { essential: true, analytics: false, performance: false };
      handlePrivacyConsentChange(essentialOnly);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate and sanitize form data
    const formDataToValidate = {
      ...formData,
      subject: formData.subject || 'General Inquiry - Lucaverse Portfolio'
    };
    
    const validation = sanitizeFormData(formDataToValidate, VALIDATION_SCHEMAS.contact);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      showNotification('error', 'Please fix the validation errors below');
      return;
    }
    
    setValidationErrors({});
    setLoading(true);
    showNotification('loading', t('sendingMessage'));

    // Use privacy-compliant data collection with sanitized data
    const data = FormDataBuilder.buildFormData(
      validation.sanitizedData,
      'contact',
      formStartTime
    );

    // SECURITY: Add enhanced bot detection fields
    if (honeypotSystem) {
      honeypotSystem.addDetectionFields(data, formStartTime);
      
      // Add honeypot fields to FormData for server validation
      honeypotSystem.fields.forEach(field => {
        data.append(field.name, ''); // Should be empty for legitimate users
      });
    }

    // SECURITY: Add CSRF token to form data
    try {
      addCSRFTokenToFormData(data);
    } catch (csrfError) {
      setLoading(false);
      showNotification('error', csrfError.message);
      return;
    }

    try {
      // SECURITY: Use centralized API configuration
      const formsUrl = getFormsEndpoint();
      
      // SECURITY: Validate endpoint before making request
      if (!validateEndpoint(formsUrl)) {
        throw new Error('Invalid API endpoint');
      }

      const response = await fetch(formsUrl, {
        method: 'POST',
        body: data,
        credentials: 'include', // Include cookies for CSRF validation
      });

      if (response.ok) {
        let result;
        try {
          const text = await response.text();
          result = JSON.parse(text);
        } catch (parseError) {
          result = { message: 'Message sent successfully!' };
        }

        showNotification('success', t('contactSuccess'));
        
        // Reset form after successful submission
        setTimeout(() => {
          setFormData({
            name: '',
            email: '',
            subject: '',
            message: ''
          });
          hideNotification();
        }, 3000);
        
      } else {
        showNotification('error', t('contactError'));
      }
      
    } catch (error) {
      if (window.location.hostname === 'localhost') {
        showNotification('success', t('contactLocalDev'));
        setTimeout(() => {
          setFormData({
            name: '',
            email: '',
            subject: '',
            message: ''
          });
          hideNotification();
        }, 3000);
      } else {
        showNotification('error', t('genericError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NotificationToast 
        show={notification.show} 
        type={notification.type} 
        message={notification.message} 
        onClose={hideNotification} 
      />

      {/* Privacy Consent Modal */}
      {showPrivacyConsent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.9)',
          zIndex: 10000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--card-background, #1a1a1a)',
            borderRadius: '12px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <PrivacyConsent
              onConsentChange={handlePrivacyConsentChange}
              onPrivacyPolicyOpen={() => setShowPrivacyPolicy(true)}
              initialConsent={privacyConsent}
            />
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <button
                onClick={handlePrivacyConsentClose}
                style={{
                  background: 'var(--neon-blue, #00ccff)',
                  color: 'black',
                  border: 'none',
                  padding: '12px 30px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Continue to Contact Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      <PrivacyPolicy
        isOpen={showPrivacyPolicy}
        onClose={() => setShowPrivacyPolicy(false)}
      />
      
      <section className={styles.contact} id="contact">
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('getInTouch')}</h2>
          <p className={styles.sectionSubtitle}>{t('contactSubtitle')}</p>
        </div>
        
        <div className={styles.contactContainer}>
          <div className={styles.contactInfo}>
            <div className={styles.contactText}>
              <h3>{t('contactTitle')}</h3>
              <p>{t('contactParagraph')}</p>
            </div>
            
            <div className={styles.contactItem}>
              <div className={styles.contactIcon}>
                <i className="fas fa-map-marker-alt"></i>
              </div>
              <div className={styles.contactDetails}>
                <h4>{t('address')}</h4>
                <p>{t('canada')} <span className={styles.flag}>🇨🇦</span></p>
              </div>
            </div>
            
            <div className={styles.contactItem}>
              <div className={styles.contactIcon}>
                <i className="fas fa-globe-americas"></i>
              </div>
              <div className={styles.contactDetails}>
                <h4>{t('origin')}</h4>
                <p>{t('brazilianBorn')} <span className={styles.flag}>🇧🇷</span></p>
              </div>
            </div>
            
            <div className={styles.contactItem}>
              <div className={styles.contactIcon}>
                <i className="fas fa-envelope"></i>
              </div>
              <div className={styles.contactDetails}>
                <h4>{t('email')}</h4>
                <p>{t('contactEmail')}</p>
              </div>
            </div>
            
            <div className={styles.socialLinks}>
              <a href="#" className={styles.socialLink} aria-label="GitHub">
                <i className="fab fa-github"></i>
              </a>
              <a href="#" className={styles.socialLink} aria-label="LinkedIn">
                <i className="fab fa-linkedin-in"></i>
              </a>
              <a href="#" className={styles.socialLink} aria-label="Twitter">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className={styles.socialLink} aria-label="Medium">
                <i className="fab fa-medium-m"></i>
              </a>
            </div>
          </div>
          
          <form className={styles.contactForm} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <input 
                type="text" 
                id="name" 
                name="name"
                className={`${styles.formControl} ${validationErrors.name ? styles.error : ''}`} 
                placeholder={t('yourNamePlaceholder')} 
                value={formData.name}
                onChange={handleChange}
                required 
              />
              {validationErrors.name && (
                <div className={styles.errorMessage}>
                  {validationErrors.name.join(', ')}
                </div>
              )}
            </div>
            <div className={styles.formGroup}>
              <input 
                type="email" 
                id="email" 
                name="email"
                className={`${styles.formControl} ${validationErrors.email ? styles.error : ''}`} 
                placeholder={t('yourEmailPlaceholder')} 
                value={formData.email}
                onChange={handleChange}
                required 
              />
              {validationErrors.email && (
                <div className={styles.errorMessage}>
                  {validationErrors.email.join(', ')}
                </div>
              )}
            </div>
            <div className={styles.formGroup}>
              <input 
                type="text" 
                id="subject" 
                name="subject"
                className={`${styles.formControl} ${validationErrors.subject ? styles.error : ''}`} 
                placeholder={t('subjectPlaceholder')} 
                value={formData.subject}
                onChange={handleChange}
                required 
              />
              {validationErrors.subject && (
                <div className={styles.errorMessage}>
                  {validationErrors.subject.join(', ')}
                </div>
              )}
            </div>
            <div className={styles.formGroup}>
              <textarea 
                id="message" 
                name="message"
                className={`${styles.formControl} ${validationErrors.message ? styles.error : ''}`} 
                rows="5" 
                placeholder={t('messagePlaceholder')} 
                value={formData.message}
                onChange={handleChange}
                required
              />
              {validationErrors.message && (
                <div className={styles.errorMessage}>
                  {validationErrors.message.join(', ')}
                </div>
              )}
            </div>
            
            {/* Enhanced Honeypot Fields */}
            {honeypotSystem && honeypotSystem.fields.map((field, index) => (
              <input
                key={`honeypot-${index}`}
                type={field.type}
                name={field.name}
                placeholder={field.placeholder}
                style={field.style}
                tabIndex="-1"
                autoComplete="off"
                aria-hidden="true"
              />
            ))}

            {/* Privacy Notice */}
            {privacyConsent && (
              <div className={styles.privacyNotice}>
                <div className={styles.privacyStatus}>
                  <span className={styles.privacyIcon}>🛡️</span>
                  <div className={styles.privacyText}>
                    <p>
                      <strong>Privacy:</strong> {privacyConsent.analytics 
                        ? 'Analytics enabled for website improvement'
                        : 'Only essential data will be collected'
                      }
                    </p>
                    <div className={styles.privacyActions}>
                      <button
                        type="button"
                        onClick={() => setShowPrivacyConsent(true)}
                        className={styles.privacySettings}
                      >
                        Privacy Settings
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPrivacyPolicy(true)}
                        className={styles.privacyPolicy}
                      >
                        Privacy Policy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              <span>{loading ? 'Sending...' : t('sendMessage')}</span>
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      </div>
    </section>
    </>
  );
}