import React from 'react';
import styles from './About.module.css';

export default function About() {
  const skills = [
    { name: 'Data Analysis', icon: 'fas fa-chart-line' },
    { name: 'Model Training', icon: 'fas fa-brain' },
    { name: 'Fine-tuning', icon: 'fas fa-sliders-h' },
    { name: 'Computer Vision', icon: 'fas fa-eye' },
    { name: 'NLP', icon: 'fas fa-language' },
    { name: 'Reinforcement Learning', icon: 'fas fa-sync-alt' },
    { name: 'Neural Networks', icon: 'fas fa-network-wired' },
    { name: 'Data Pipeline', icon: 'fas fa-project-diagram' }
  ];

  return (
    <section className={styles.about} id="about">
      <div className={styles.hudFragment}></div>
      
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>About Me</h2>
          <p className={styles.sectionSubtitle}>Where algorithms meet intuition and data transforms into actionable insights.</p>
        </div>
        
        <div className={styles.aboutContent}>
          <div className={styles.aboutImageContainer}>
            {/* Profile image with enhanced styling */}
            <div className={styles.aboutImage}>
              <div className={styles.imageGradient}></div>
              <div className={styles.imageOverlay}></div>
              <div className={styles.tagTop}>[DATA ARCHITECT]</div>
              <div className={styles.tagBottom}>
                NEURAL NETWORK SPECIALIST <span className={styles.pulseDot}></span>
              </div>
            </div>
          </div>
          
          <div className={styles.aboutText}>
            <h3>Transforming Complex Data into Intelligent Solutions</h3>
            <p>With over 7 years of experience in AI engineering and data science, I specialize in developing innovative solutions that leverage the power of machine learning and data analytics to solve complex business challenges.</p>
            <p>My expertise spans across deep learning architectures, computer vision systems, natural language processing, and predictive modeling. I thrive in bridging the gap between theoretical concepts and practical implementations, ensuring that AI solutions deliver real business value.</p>
            
            <div className={styles.skillsContainer}>
              <div className={styles.skillsTitle}>Technical Expertise</div>
              <div className={styles.skillsGrid}>
                {skills.map((skill, index) => (
                  <div className={styles.skillItem} key={index}>
                    <div className={styles.skillIcon}>
                      <i className={skill.icon}></i>
                    </div>
                    <div className={styles.skillName}>{skill.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
