import React, { useState } from 'react';
import styles from './Header.module.css';
import AccessRequestForm from '../AccessRequestForm/AccessRequestForm.jsx';

export default function Header() {
  const [accessOpen, setAccessOpen] = useState(false);

  return (
    <>
      <AccessRequestForm isOpen={accessOpen} onClose={() => setAccessOpen(false)} />
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <span>Lucaverse</span>
          </div>
          <nav className={styles.nav}>
            <a className={styles.navLink} href="#home">Home</a>
            <a className={styles.navLink} href="#about">About</a>
            <a className={styles.navLink} href="#projects">Projects</a>
            <a className={styles.navLink} href="#custom-gpts">Custom GPTs</a>
            <a className={styles.navLink} href="#blog">Blog</a>
            <a className={styles.navLink} href="#contact">Contact Me</a>
            <a className={`${styles.navLink} ${styles.newsletter}`} href="https://newsletter.lucaverse.com" target="_blank" rel="noopener noreferrer">
              Newsletter
              <span className={styles.newsletterArrow}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </span>
            </a>
          </nav>
          <div className={styles.ctas}>
            <a href="#login" className={`${styles.ctaBtn} ${styles.ctaLogin}`}>Lucaverse Login</a>
            <button type="button" className={`${styles.ctaBtn} ${styles.ctaRequest}`} onClick={() => setAccessOpen(true)}>
              Request Access
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
