import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Hero.module.css';
import HoloCore from './HoloCore';
import AccessRequestForm from '../AccessRequestForm/AccessRequestForm.jsx';

export default function Hero() {
  const { t } = useTranslation();
  const [accessOpen, setAccessOpen] = useState(false);

  return (
    <>
      <AccessRequestForm isOpen={accessOpen} onClose={() => setAccessOpen(false)} />
      <section className={styles.hero} id="home">
        {/* HUD Fragments */}
        <div className={`${styles.hudFragment} ${styles.hudTopright}`}></div>
        <div className={`${styles.hudFragment} ${styles.hudTopleft}`}></div>
        <div className={styles.heroGrid}>
          <div className={styles.heroContent}>          
            <h1 className={styles.heroTitle}>
              <span className={styles.glowText}>{t('heroWelcome')}</span> {t('heroToThe')} <span className={styles.lucaverseText}>{t('heroLucaverse')}</span>
            </h1>
            <div className={styles.subtitle}>
              <strong>{t('heroMission')}</strong><br />
              {t('heroMissionText')}
              <br /><br />
              <strong>{t('heroVision')}</strong><br />
              {t('heroVisionText')}
            </div>
            <div className={styles.btnGroup}>
              <a href="#login" className={`${styles.btn} ${styles.btnPrimary}`}>
                {t('enterTheLucaverse')}
              </a>
              <button type="button" className={styles.btn} onClick={() => setAccessOpen(true)}>
                {t('requestAccess')} <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>
          {/* HoloCore Component */}
          <div className={styles.holoContainer}>
            <HoloCore />
          </div>
        </div>
      </section>
    </>
  );
}
