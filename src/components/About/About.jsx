import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './About.module.css';

export default function About() {
  const { t } = useTranslation();

  const skills = [
    { name: t('skills.dataAnalysis'), icon: 'fas fa-chart-line' },
    { name: t('skills.python'), icon: 'fab fa-python' },
    { name: t('skills.excel'), icon: 'fas fa-file-excel' },
    { name: t('skills.promptEngineering'), icon: 'fas fa-comment-dots' },
    { name: t('skills.workflowAutomation'), icon: 'fas fa-cogs' },
    { name: t('skills.flask'), icon: 'fas fa-server' },
    { name: t('skills.imageToImage'), icon: 'fas fa-image' },
    { name: t('skills.versionControl'), icon: 'fab fa-git-alt' }
  ];

  return (
    <section className={styles.about} id="about">
      <div className={styles.hudFragment}></div>
      
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('aboutMe')}</h2>
          <p className={styles.sectionSubtitle}>{t('aboutSubtitle')}</p>
        </div>
        
        <div className={styles.aboutContent}>
          <div className={styles.aboutImageContainer}>
            {/* Profile image with enhanced styling */}
            <div className={styles.aboutImage}>
              <img 
                src="/avatars/luca-img.png" 
                alt="Luca" 
                className={styles.profileImg} 
              />
              <div className={styles.tagTop}>[DATA ANALYST]</div>
              <div className={styles.tagBottom}>
                <span className={styles.pulseDot}></span>
              </div>
            </div>
          </div>
          
          <div className={styles.aboutText}>
            <h3>{t('aboutTitle')}</h3>
            <p>{t('aboutParagraph1')}</p>
            <p>{t('aboutParagraph2')}</p>
            
            <div className={styles.skillsContainer}>
              <div className={styles.skillsTitle}>{t('technicalExpertise')}</div>
              <div className={styles.skillsGrid}>
                {skills.map((skill, index) => (
                  <div className={styles.skillItem} key={index}>
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
