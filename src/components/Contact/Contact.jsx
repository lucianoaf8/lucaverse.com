import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { httpClient, handleApiResponse } from '../../utils/httpClient.js';
import { logger } from '../../utils/logger.js';
import { SpamProtection } from '../../utils/spamProtection.js';
import { csrfProtection } from '../../utils/csrfProtection.js';
import styles from './Contact.module.css';

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
  
  // Phase 2: Form interaction analytics
  const [formStartTime] = useState(Date.now());
  
  // Enhanced spam protection
  const [spamProtection] = useState(() => new SpamProtection(formStartTime));
  const [fieldFocusOrder, setFieldFocusOrder] = useState([]);
  const [fieldsModified, setFieldsModified] = useState([]);
  const [sessionStartTime] = useState(Date.now());

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
  };

  const hideNotification = () => {
    setNotification({ show: false, type: '', message: '' });
  };

  // Cleanup spam protection on unmount
  useEffect(() => {
    return () => {
      if (spamProtection) {
        spamProtection.destroy();
      }
    };
  }, [spamProtection]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Track modified fields
    if (!fieldsModified.includes(name)) {
      setFieldsModified(prev => [...prev, name]);
    }
  };
  
  const handleFieldFocus = (fieldName) => {
    if (!fieldFocusOrder.includes(fieldName)) {
      setFieldFocusOrder(prev => [...prev, fieldName]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    showNotification('loading', t('sendingMessage'));

    // Enhanced spam protection validation
    const spamValidation = await spamProtection.validateSubmission(formData);
    if (!spamValidation.passed) {
      const errorMessage = spamProtection.getErrorMessage(spamValidation, t);
      showNotification('error', errorMessage);
      setLoading(false);
      return;
    }

    // CSRF protection validation
    try {
      const csrfValidation = await csrfProtection.validate();
      if (!csrfValidation.valid) {
        const errorMessage = csrfProtection.getErrorMessage(csrfValidation, t);
        showNotification('error', errorMessage);
        setLoading(false);
        return;
      }
    } catch (error) {
      logger.error('CSRF validation failed:', error);
      showNotification('error', 'Security validation failed. Please refresh the page and try again.');
      setLoading(false);
      return;
    }

    let data = new FormData();
    data.append('name', formData.name);
    data.append('email', formData.email);
    data.append('subject', formData.subject || 'General Inquiry - Lucaverse Portfolio'); // Ensure subject is always present
    data.append('message', formData.message);
    data.append('formType', 'contact'); // Identify form type
    data.append('formTitle', `Contact Message: ${formData.subject || 'General Inquiry'}`); // Add formatted context

    // Add CSRF protection to form data
    try {
      data = await csrfProtection.protectFormData(data);
    } catch (error) {
      logger.error('Failed to add CSRF protection to form data:', error);
      showNotification('error', 'Security protection failed. Please refresh the page and try again.');
      setLoading(false);
      return;
    }
    
    // Add honeypot fields (they should all be empty for legitimate submissions)
    SpamProtection.getHoneypotFields().forEach(field => {
      data.append(field.name, '');
    });
    
    // Add spam protection metadata
    data.append('spamProtectionScore', spamValidation.checks?.behavior?.score || 0);
    data.append('behaviorAnalysis', JSON.stringify(spamValidation.checks?.behavior || {}));
    data.append('timingAnalysis', JSON.stringify(spamValidation.checks?.timing || {}));
    
    // Phase 1: Enhanced data collection
    try {
      // Language detection with better fallbacks
      const siteLanguage = i18n.language || localStorage.getItem('i18nextLng') || 'en';
      const browserLanguage = navigator.language || navigator.userLanguage || 'en-US';
      data.append('siteLanguage', siteLanguage);
      data.append('browserLanguage', browserLanguage);
      
      // Timezone information with multiple detection methods
      let timezone = 'UTC';
      let timezoneOffset = '0';
      try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        timezoneOffset = new Date().getTimezoneOffset().toString();
      } catch (e) {
        // Fallback for older browsers
        const offset = new Date().getTimezoneOffset();
        timezoneOffset = offset.toString();
        const hours = Math.floor(Math.abs(offset) / 60);
        const minutes = Math.abs(offset) % 60;
        const sign = offset > 0 ? '-' : '+';
        timezone = `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
      data.append('timezone', timezone);
      data.append('timezoneOffset', timezoneOffset);
      
      // Enhanced device type detection
      const ua = navigator.userAgent || '';
      const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);
      const deviceType = isTablet ? 'tablet' : (isMobile ? 'mobile' : 'desktop');
      data.append('deviceType', deviceType);
      
      // Screen and viewport with validation
      const screenWidth = screen.width || window.screen.width || 0;
      const screenHeight = screen.height || window.screen.height || 0;
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      data.append('screenSize', `${screenWidth}x${screenHeight}`);
      data.append('viewportSize', `${viewportWidth}x${viewportHeight}`);
      
      // Page context information
      data.append('referrer', document.referrer || 'direct');
      data.append('currentUrl', window.location.href);
      data.append('pageTitle', document.title || 'Lucaverse');
      
      // Phase 2: Form interaction analytics
      const formCompletionTime = Date.now() - formStartTime;
      data.append('timeToComplete', formCompletionTime.toString());
      data.append('fieldFocusOrder', fieldFocusOrder.length > 0 ? JSON.stringify(fieldFocusOrder) : '[]');
      data.append('fieldsModified', fieldsModified.length > 0 ? JSON.stringify(fieldsModified) : '[]');
      
      // Phase 2: Technical environment with better detection
      const getConnectionType = () => {
        if (navigator.connection) {
          return navigator.connection.effectiveType || navigator.connection.type || '4g';
        }
        // Estimate based on performance timing
        if (window.performance && window.performance.timing) {
          const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
          if (loadTime < 1000) return '4g';
          if (loadTime < 3000) return '3g';
          return '2g';
        }
        return '4g'; // Default assumption
      };
      
      const techInfo = {
        connectionType: getConnectionType(),
        touchSupport: ('ontouchstart' in window || navigator.maxTouchPoints > 0).toString(),
        cookieEnabled: (navigator.cookieEnabled !== undefined ? navigator.cookieEnabled : true).toString(),
        colorDepth: (screen.colorDepth || 24).toString(),
        pixelRatio: (window.devicePixelRatio || 1).toString()
      };
      Object.entries(techInfo).forEach(([key, value]) => {
        data.append(key, value);
      });
      
      // Phase 2: Session context with better calculations
      const sessionDuration = Date.now() - sessionStartTime;
      const docHeight = Math.max(
        document.body.scrollHeight || 0,
        document.body.offsetHeight || 0,
        document.documentElement.clientHeight || 0,
        document.documentElement.scrollHeight || 0,
        document.documentElement.offsetHeight || 0
      );
      const windowHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      const scrollableHeight = Math.max(0, docHeight - windowHeight);
      const scrollDepth = scrollableHeight > 0 ? Math.round((scrollTop / scrollableHeight) * 100) : 0;
      
      data.append('sessionDuration', sessionDuration.toString());
      data.append('scrollDepth', Math.min(100, Math.max(0, scrollDepth)).toString());
    } catch (error) {
      // Silently handle any data collection errors
    }

    try {
      // Create CSRF-protected headers
      const protectedHeaders = await csrfProtection.protectHeaders();
      
      // Use secure HTTP client with timeout, retry, and signing
      const response = await httpClient.post('https://summer-heart.lucianoaf8.workers.dev', data, {
        timeout: 15000, // 15 second timeout for form submissions
        retries: 2, // Reduced retries for form submissions
        enableSigning: true, // Enable request signing for authentication
        headers: protectedHeaders, // Include CSRF protection headers
        retryCondition: (error, response) => {
          // Only retry on network errors or 5xx server errors
          // Don't retry on 4xx client errors (bad request, validation, etc.)
          if (error && error.code === 'TIMEOUT') return false; // Don't retry timeouts
          return !response || (response.status >= 500 && response.status < 600);
        }
      });

      // Handle response with proper error checking
      const result = await handleApiResponse(response);
      
      logger.info('Form submission successful:', {
        formType: 'contact',
        responseStatus: response.status
      });

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
      
    } catch (error) {
      // Enhanced error handling with specific error types
      logger.error('Form submission failed:', {
        formType: 'contact',
        error: error.message,
        status: error.status,
        code: error.code
      });

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
        // Show specific error messages based on error type
        let errorMessage = t('genericError');
        
        if (error.code === 'TIMEOUT') {
          errorMessage = 'Request timeout. Please check your connection and try again.';
        } else if (error.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (error.status >= 400 && error.status < 500) {
          errorMessage = t('contactError');
        } else {
          errorMessage = 'Service temporarily unavailable. Please try again later.';
        }
        
        showNotification('error', errorMessage);
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
                className={styles.formControl} 
                placeholder={t('yourNamePlaceholder')} 
                value={formData.name}
                onChange={handleChange}
                onFocus={() => handleFieldFocus('name')}
                required 
              />
            </div>
            <div className={styles.formGroup}>
              <input 
                type="email" 
                id="email" 
                name="email"
                className={styles.formControl} 
                placeholder={t('yourEmailPlaceholder')} 
                value={formData.email}
                onChange={handleChange}
                onFocus={() => handleFieldFocus('email')}
                required 
              />
            </div>
            <div className={styles.formGroup}>
              <input 
                type="text" 
                id="subject" 
                name="subject"
                className={styles.formControl} 
                placeholder={t('subjectPlaceholder')} 
                value={formData.subject}
                onChange={handleChange}
                onFocus={() => handleFieldFocus('subject')}
                required 
              />
            </div>
            <div className={styles.formGroup}>
              <textarea 
                id="message" 
                name="message"
                className={styles.formControl} 
                rows="5" 
                placeholder={t('messagePlaceholder')} 
                value={formData.message}
                onChange={handleChange}
                onFocus={() => handleFieldFocus('message')}
                required
              />
            </div>
            
            {/* Enhanced honeypot fields for spam protection */}
            {SpamProtection.getHoneypotFields().map((field, index) => (
              <input
                key={field.name}
                type={field.type}
                name={field.name}
                style={field.style}
                tabIndex={field.attributes.tabIndex}
                autoComplete={field.attributes.autoComplete}
                aria-hidden="true"
                value=""
                onChange={() => {}} // Prevent React warnings
              />
            ))}
            
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