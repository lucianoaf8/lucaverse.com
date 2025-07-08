import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Contact.module.css';

export default function Contact() {
  const { t } = useTranslation();

  return (
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
          
          <form className={styles.contactForm}>
            <div className={styles.formGroup}>
              <input type="text" id="name" className={styles.formControl} placeholder={t('yourNamePlaceholder')} required />
            </div>
            <div className={styles.formGroup}>
              <input type="email" id="email" className={styles.formControl} placeholder={t('yourEmailPlaceholder')} required />
            </div>
            <div className={styles.formGroup}>
              <input type="text" id="subject" className={styles.formControl} placeholder={t('subjectPlaceholder')} required />
            </div>
            <div className={styles.formGroup}>
              <textarea id="message" className={styles.formControl} rows="5" placeholder={t('messagePlaceholder')} required></textarea>
            </div>
            <button type="submit" className={styles.submitBtn}>
              {t('sendMessage')} <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
