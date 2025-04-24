import React from 'react';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>
            <span>Lucaverse</span>
          </div>
          
          <nav className={styles.footerNav}>
            <a className={styles.footerLink} href="#home">Home</a>
            <a className={styles.footerLink} href="#about">About</a>
            <a className={styles.footerLink} href="#projects">Projects</a>
            <a className={styles.footerLink} href="#custom-gpts">Custom GPTs</a>
            <a className={styles.footerLink} href="#blog">Blog</a>
            <a className={styles.footerLink} href="#contact">Contact Me</a>
            <a className={styles.footerLink} href="https://newsletter.lucaverse.com" target="_blank" rel="noopener noreferrer">
              Newsletter <i className="fas fa-external-link-alt"></i>
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
            &copy; {new Date().getFullYear()} Lucaverse. All rights reserved.
          </p>
        </div>
    </footer>
  );
}
