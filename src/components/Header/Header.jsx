import React, { useState } from 'react';
import styles from './Header.module.css';
import AccessRequestForm from '../AccessRequestForm/AccessRequestForm.jsx';

export default function Header() {
  const [accessOpen, setAccessOpen] = useState(false);
  const [language, setLanguage] = useState('EN');
  const [hoveredToggle, setHoveredToggle] = useState(false);
  const [showingFlag, setShowingFlag] = useState(false);
  const [flagToShow, setFlagToShow] = useState(null);

  // Language Toggle Component with Flag Flash
  const LanguageToggle = () => {
    const handleLanguageChange = () => {
      // Determine which flag to show based on target language
      const nextLanguage = language === 'EN' ? 'PT' : 'EN';
      const targetFlag = nextLanguage === 'PT' ? 'BR' : 'US';
      
      // Change language immediately and show flag flash
      setLanguage(nextLanguage);
      setFlagToShow(targetFlag);
      setShowingFlag(true);
      
      // Hide flag after brief flash
      setTimeout(() => {
        setShowingFlag(false);
        setFlagToShow(null);
      }, 250);
    };

    return (
      <div className={styles.toggleContainer}>
        <button
          className={styles.languageToggle}
          onMouseEnter={() => setHoveredToggle(true)}
          onMouseLeave={() => setHoveredToggle(false)}
          onClick={handleLanguageChange}
          title={`Switch to ${language === 'EN' ? 'Portuguese' : 'English'}`}
          data-hovered={hoveredToggle}
          style={{ opacity: showingFlag ? 0 : 1 }}
        >
          {language}
        </button>
        
        {showingFlag && (
          <div className={styles.flagFlash} data-flag={flagToShow}>
            {flagToShow === 'BR' ? (
              <svg width="50" height="30" viewBox="0 0 50 30" className={styles.flagSvg}>
                <rect width="50" height="30" fill="#009639"/>
                <polygon points="25,5 45,15 25,25 5,15" fill="#FEDF00"/>
                <circle cx="25" cy="15" r="6" fill="#002776"/>
                <path d="M19,15 Q25,12 31,15 Q25,18 19,15" fill="#FEDF00" stroke="#FEDF00" strokeWidth="0.5"/>
              </svg>
            ) : (
              <svg width="50" height="30" viewBox="0 0 50 30" className={styles.flagSvg}>
                <rect width="50" height="30" fill="#B22234"/>
                <rect width="50" height="2.3" y="2.3" fill="white"/>
                <rect width="50" height="2.3" y="6.9" fill="white"/>
                <rect width="50" height="2.3" y="11.5" fill="white"/>
                <rect width="50" height="2.3" y="16.1" fill="white"/>
                <rect width="50" height="2.3" y="20.7" fill="white"/>
                <rect width="50" height="2.3" y="25.3" fill="white"/>
                <rect width="20" height="15" fill="#3C3B6E"/>
                <g fill="white" fontSize="1.5">
                  <text x="2" y="3">★</text><text x="6" y="3">★</text><text x="10" y="3">★</text><text x="14" y="3">★</text><text x="18" y="3">★</text>
                  <text x="4" y="6">★</text><text x="8" y="6">★</text><text x="12" y="6">★</text><text x="16" y="6">★</text>
                  <text x="2" y="9">★</text><text x="6" y="9">★</text><text x="10" y="9">★</text><text x="14" y="9">★</text><text x="18" y="9">★</text>
                  <text x="4" y="12">★</text><text x="8" y="12">★</text><text x="12" y="12">★</text><text x="16" y="12">★</text>
                </g>
              </svg>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <AccessRequestForm isOpen={accessOpen} onClose={() => setAccessOpen(false)} />
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <img src="/assets/lv-logo-nobg.png" alt="Lucaverse Logo"/>
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
          <div className={styles.rightSection}>
  <div className={styles.ctas}>
    <a href="#login" className={`${styles.ctaBtn} ${styles.ctaLogin}`}>Lucaverse Login</a>
    <button type="button" className={`${styles.ctaBtn} ${styles.ctaRequest}`} onClick={() => setAccessOpen(true)}>
      Request Access
    </button>
  </div>
  <LanguageToggle />
</div>
        </div>
      </header>
    </>
  );
}
