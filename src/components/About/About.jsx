import React from 'react';
import styles from './About.module.css';

export default function About() {
  const skills = [
    { name: 'Data Analysis & Transformation', icon: 'fas fa-chart-line' },
    { name: 'Python', icon: 'fab fa-python' },
    { name: 'Excel Office Scripts & VBA', icon: 'fas fa-file-excel' },
    { name: 'Prompt Engineering', icon: 'fas fa-comment-dots' },
    { name: 'Workflow Automation', icon: 'fas fa-cogs' },
    { name: 'Flask Apps & PythonAnywhere', icon: 'fas fa-server' },
    { name: 'Image-to-Image Tools', icon: 'fas fa-image' },
    { name: 'Version Control', icon: 'fab fa-git-alt' }
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
            <h3>Transforming Complex Data into Intelligent Solutions</h3>
            <p>I'm Luca — a data analyst and AI enthusiast with a passion for automation and a strong dislike for repetitive tasks. I thrive in analytical thinking and precise execution, constantly experimenting with AI tools and workflows to push what's possible.</p>
            <p>My work blends curiosity with structure: I explore, test, and refine systems to make them faster, smarter, and more efficient. Whether it's scripting smarter spreadsheets or integrating large language models into daily workflows, I'm driven by a desire to simplify complexity through intelligent automation.</p>
            
            <div className={styles.skillsContainer}>
              <div className={styles.skillsTitle}>Technical Expertise</div>
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
