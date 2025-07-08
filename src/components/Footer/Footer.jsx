import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Footer.module.css';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>
            <img src="/assets/lv-logo-nobg.png" alt="Lucaverse Logo" />
          </div>
          
          <nav className={styles.footerNav}>
            <a className={styles.footerLink} href="#home">{t('footerHome')}</a>
            <a className={styles.footerLink} href="#about">{t('footerAbout')}</a>
            <a className={styles.footerLink} href="#projects">{t('footerProjects')}</a>
            <a className={styles.footerLink} href="#custom-gpts">{t('footerCustomGpts')}</a>
            <a className={styles.footerLink} href="#blog">{t('footerBlog')}</a>
            <a className={styles.footerLink} href="#contact">{t('footerContact')}</a>
            <a className={styles.footerLink} href="https://newsletter.lucaverse.com" target="_blank" rel="noopener noreferrer">
              {t('newsletter')} <i className="fas fa-external-link-alt"></i>
            </a>
          </nav>
          
          <div className={styles.footerSocial}>
            <a href="#" className={styles.socialIcon} aria-label="GitHub">
              <i className="fab fa-github"></i>
            </a>
            <a href="#" className={styles.socialIcon} aria-label="LinkedIn">
              <i className="fab fa-linkedin-in"></i>
            </a>
            <a href="#" className={styles.socialIcon} aria-label="Twitter">
              <i className="fab fa-twitter"></i>
            </a>
            <a href="#" className={styles.socialIcon} aria-label="Medium">
              <i className="fab fa-medium-m"></i>
            </a>
          </div>
        </div>
        
          <p className={styles.copyright}>
            {t('copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
    </footer>
  );
}
