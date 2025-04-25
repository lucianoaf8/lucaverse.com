import React, { useState } from 'react';
import styles from './Hero.module.css';
import HoloCore from './HoloCore';
import AccessRequestForm from '../AccessRequestForm/AccessRequestForm.jsx';

export default function Hero() {
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
              <span className={styles.glowText}>Welcome</span> to the <span className={styles.lucaverseText}>Lucaverse</span>
            </h1>
            <div className={styles.subtitle}>
              <strong>Mission</strong><br />
              To share my knowledge, creations, automations, and discoveries — helping others navigate and build with AI, data, and open technologies.
              <br /><br />
              <strong>Vision</strong><br />
              To make Lucaverse the central hub of my mind — a dynamic space for tools, prompts, workflows, and insights focused on AI, data, and automation. A universe powered by curiosity, built on free and open-source foundations.
            </div>
            <div className={styles.btnGroup}>
              <a href="#" className={`${styles.btn} ${styles.btnPrimary}`}>
                Enter the Lucaverse
              </a>
              <button type="button" className={styles.btn} onClick={() => setAccessOpen(true)}>
                Request Access <i className="fas fa-arrow-right"></i>
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
