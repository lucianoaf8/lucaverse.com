// src/components/AccessRequestForm/AccessRequestForm.js
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './AccessRequestForm.module.css';

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

const AccessRequestForm = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    reason: ''
  });
  const formRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const firstInputRef = useRef(null);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  
  // Phase 2: Form interaction analytics
  const [formStartTime] = useState(Date.now());
  const [fieldFocusOrder, setFieldFocusOrder] = useState([]);
  const [fieldsModified, setFieldsModified] = useState([]);
  const [sessionStartTime] = useState(Date.now());

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
  };

  const hideNotification = () => {
    setNotification({ show: false, type: '', message: '' });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (formRef.current && !formRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
    showNotification('loading', t('submittingAccessRequest'));

    const data = new FormData();
    data.append('name', formData.name);
    data.append('email', formData.email);
    data.append('message', formData.reason); // Reason maps to "message" in Worker
    data.append('subject', 'Lucaverse Access Request'); // Add subject for better email formatting
    data.append('formType', 'access_request'); // Identify form type
    data.append('formTitle', 'Access Request from Lucaverse Portfolio'); // Add context
    data.append('website', ''); // Honeypot field
    
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
      console.warn('Error collecting enhanced data:', error);
    }

    // Debug: Log all form data being sent
    console.log('Form Data being sent:');
    for (let [key, value] of data.entries()) {
      console.log(`${key}: ${value}`);
    }

    try {
      const response = await fetch('https://summer-heart.lucianoaf8.workers.dev', {
        method: 'POST',
        body: data,
      });

      if (response.ok) {
        let result;
        try {
          const text = await response.text();
          result = JSON.parse(text);
        } catch (parseError) {
          result = { message: 'Your request was submitted successfully!' };
        }

        showNotification('success', t('accessRequestSuccess'));
        
        // Reset form after successful submission
        setTimeout(() => {
          setFormData({ name: '', email: '', reason: '' });
          onClose();
          hideNotification();
        }, 3000);
        
      } else {
        console.error('Response not ok:', response.status, response.statusText);
        showNotification('error', t('accessRequestError'));
      }
      
    } catch (error) {
      // Only log errors in production
      if (window.location.hostname !== 'localhost') {
        console.error('Network or parsing error:', error);
      }
      
      if (window.location.hostname === 'localhost') {
        showNotification('success', t('accessRequestLocalDev'));
        setTimeout(() => {
          setFormData({ name: '', email: '', reason: '' });
          onClose();
          hideNotification();
        }, 3000);
      } else {
        showNotification('error', t('genericError'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <NotificationToast 
        show={notification.show} 
        type={notification.type} 
        message={notification.message} 
        onClose={hideNotification} 
      />
      
      {isOpen && (
        <div className={styles['access-form-overlay']}>
          <div className={styles['access-form-container']} ref={formRef}>
        <div className={styles['form-header']}>
          <h2 className="font-orbitron text-xl text-[color:var(--neon-blue)] text-glow-blue">{t('requestAccess')}</h2>
          <button className={styles['close-button']} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles['access-request-form']}>
          <div className={styles['form-group']}>
            <label htmlFor="name">{t('yourName')}</label>
            <input
              ref={firstInputRef}
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onFocus={() => handleFieldFocus('name')}
              required
              placeholder={t('enterYourName')}
            />
          </div>

          <div className={styles['form-group']}>
            <label htmlFor="email">{t('emailAddress')}</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onFocus={() => handleFieldFocus('email')}
              required
              placeholder={t('yourEmailPlaceholder')}
            />
          </div>

          <div className={styles['form-group']}>
            <label htmlFor="reason">{t('accessReason')}</label>
            <textarea
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              onFocus={() => handleFieldFocus('reason')}
              rows="3"
              required
              placeholder={t('accessReasonPlaceholder')}
            />
          </div>

          {/* Hidden honeypot */}
          <input type="text" name="website" style={{ display: 'none' }} tabIndex="-1" autoComplete="off" />

          <button type="submit" className={styles['submit-button']} disabled={loading}>
            {loading ? t('submitting') : t('submitRequest')}
          </button>
        </form>
      </div>
    </div>
      )}
    </>
  );
};

export default AccessRequestForm;