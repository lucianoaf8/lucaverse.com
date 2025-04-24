import React from 'react';
import styles from './Projects.module.css';

export default function ProjectCard({ project }) {
  const { title, icon, tags, description, links } = project;

  return (
    <div className={styles.projectCard}>
      <div className={styles.projectImageContainer}>
        <div className={styles.projectImagePattern}></div>
        <i className={`${icon} ${styles.projectIcon}`}></i>
      </div>
      <div className={styles.projectContent}>
        <h3 className={styles.projectTitle}>{title}</h3>
        <div className={styles.projectTags}>
          {tags.map((tag, index) => (
            <span key={index} className={styles.projectTag}>{tag}</span>
          ))}
        </div>
        <p className={styles.projectDescription}>{description}</p>
        <div className={styles.projectLinks}>
          {links.map((link, index) => (
            <a 
              key={index} 
              href={link.url} 
              className={styles.projectLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className={link.icon}></i> {link.text}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
