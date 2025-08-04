// src/components/AccessRequestForm/AccessRequestForm.js
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './AccessRequestForm.module.css';
import { PrivacyManager, FormDataBuilder } from '../../utils/privacyUtils';
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
  const [formStartTime] = useState(Date.now());
  
  // Enhanced honeypot system
  const [honeypotSystem, setHoneypotSystem] = useState(null);

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
      // Initialize CSRF protection when form opens
      initializeCSRFProtection();
      
      // Initialize enhanced honeypot system
      const honeypot = initializeHoneypot();
      setHoneypotSystem(honeypot);
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
    
    // Track form interactions for bot detection
    if (honeypotSystem) {
      honeypotSystem.trackInteraction();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    showNotification('loading', t('submittingAccessRequest'));

    // Use privacy-compliant data collection
    const data = FormDataBuilder.buildFormData(
      {
        name: formData.name,
        email: formData.email,
        message: formData.reason, // Reason maps to "message" in Worker
        subject: 'Lucaverse Access Request'
      },
      'access_request',
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
        showNotification('error', t('accessRequestError'));
      }
      
    } catch (error) {
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
              rows="3"
              required
              placeholder={t('accessReasonPlaceholder')}
            />
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