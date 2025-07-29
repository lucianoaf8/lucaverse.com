// src/components/AccessRequestForm/AccessRequestForm.js
import React, { useState, useEffect, useRef } from 'react';
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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    reason: ''
  });
  const formRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const firstInputRef = useRef(null);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    showNotification('loading', 'Submitting your access request...');

    const data = new FormData();
    data.append('name', formData.name);
    data.append('email', formData.email);
    data.append('message', formData.reason); // Reason maps to "message" in Worker
    data.append('subject', 'Lucaverse Access Request'); // Add subject for better email formatting
    data.append('formType', 'access_request'); // Identify form type
    data.append('formTitle', 'Access Request from Lucaverse Portfolio'); // Add context
    data.append('website', ''); // Honeypot field

    try {
      console.log('Submitting access request...');
      
      const response = await fetch('https://summer-heart.lucianoaf8.workers.dev', {
        method: 'POST',
        body: data,
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        let result;
        try {
          const text = await response.text();
          console.log('Response text:', text);
          result = JSON.parse(text);
        } catch (parseError) {
          console.log('Response is not JSON, treating as success');
          result = { message: 'Your request was submitted successfully!' };
        }

        showNotification('success', result.message || 'Thanks for your interest to be part of Lucaverse, the boss will get back to you soon!');
        
        // Reset form after successful submission
        setTimeout(() => {
          setFormData({ name: '', email: '', reason: '' });
          onClose();
          hideNotification();
        }, 3000);
        
      } else {
        console.error('Response not ok:', response.status, response.statusText);
        showNotification('error', 'Request submitted! If you don\'t receive a confirmation email, please try again.');
      }
      
    } catch (error) {
      console.error('Network or parsing error:', error);
      
      if (window.location.hostname === 'localhost') {
        showNotification('success', 'Thanks for your interest! (Local development - the boss will get back to you soon)');
        setTimeout(() => {
          setFormData({ name: '', email: '', reason: '' });
          onClose();
          hideNotification();
        }, 3000);
      } else {
        showNotification('error', 'An error occurred. Please try again later.');
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
          <h2 className="font-orbitron text-xl text-[color:var(--neon-blue)] text-glow-blue">Request Access</h2>
          <button className={styles['close-button']} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles['access-request-form']}>
          <div className={styles['form-group']}>
            <label htmlFor="name">Your Name</label>
            <input
              ref={firstInputRef}
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your name"
            />
          </div>

          <div className={styles['form-group']}>
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
            />
          </div>

          <div className={styles['form-group']}>
            <label htmlFor="reason">Why do you want access?</label>
            <textarea
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows="3"
              required
              placeholder="Briefly explain why you'd like to enter the Lucaverse..."
            />
          </div>

          {/* Hidden honeypot */}
          <input type="text" name="website" style={{ display: 'none' }} tabIndex="-1" autoComplete="off" />

          <button type="submit" className={styles['submit-button']} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
      )}
    </>
  );
};

export default AccessRequestForm;