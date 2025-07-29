import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
  };

  const hideNotification = () => {
    setNotification({ show: false, type: '', message: '' });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    showNotification('loading', t('sendingMessage'));

    const data = new FormData();
    data.append('name', formData.name);
    data.append('email', formData.email);
    data.append('subject', formData.subject || 'General Inquiry - Lucaverse Portfolio'); // Ensure subject is always present
    data.append('message', formData.message);
    data.append('formType', 'contact'); // Identify form type
    data.append('formTitle', `Contact Message: ${formData.subject || 'General Inquiry'}`); // Add formatted context
    data.append('website', ''); // Honeypot field

    try {
      console.log('Submitting contact form...');
      
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
          result = { message: 'Message sent successfully!' };
        }

        showNotification('success', result.message || t('contactSuccess'));
        
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
        console.error('Response not ok:', response.status, response.statusText);
        showNotification('error', t('contactError'));
      }
      
    } catch (error) {
      console.error('Network or parsing error:', error);
      
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
                required
              />
            </div>
            
            {/* Honeypot field */}
            <input 
              type="text" 
              name="website" 
              style={{ display: 'none' }} 
              tabIndex="-1" 
              autoComplete="off" 
            />
            
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