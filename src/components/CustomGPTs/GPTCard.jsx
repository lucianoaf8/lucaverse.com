import React from 'react';
import styles from './CustomGPTs.module.css';

export default function GPTCard({ gpt }) {
  const { title, icon, tags, description, links } = gpt;

  return (
    <div className={styles.gptCard}>
      <div className={styles.gptImageContainer}>
        <div className={styles.gptImagePattern}></div>
        <i className={`${icon} ${styles.gptIcon}`}></i>
      </div>
      <div className={styles.gptContent}>
        <h3 className={styles.gptTitle}>{title}</h3>
        <div className={styles.gptTags}>
          {tags.map((tag, index) => (
            <span key={index} className={styles.gptTag}>{tag}</span>
          ))}
        </div>
        <p className={styles.gptDescription}>{description}</p>
        <div className={styles.gptLinks}>
          {links.map((link, index) => (
            <a 
              key={index} 
              href={link.url} 
              className={styles.gptLink}
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
