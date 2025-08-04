import React from 'react';
import { htmlEncode, isValidImageUrl } from '../../utils/securityUtils';
import styles from './CustomGPTs.module.css';

export default function GPTCard({ gpt }) {
  const { title, icon, tags, description, links } = gpt;
  
  // Simple fallback render for trusted content (no security validation needed for static translations)
  const trustedRender = (content, fallback = '') => {
    if (typeof content !== 'string' || !content) return fallback;
    return htmlEncode(content); // Basic HTML encoding only
  };

  return (
    <div className={styles.gptCard}>
      <div className={styles.gptImageContainer}>
        <div className={styles.gptImagePattern}></div>
        <i className={`${trustedRender(icon, 'fas fa-robot')} ${styles.gptIcon}`}></i>
      </div>
      <div className={styles.gptContent}>
        <h3 className={styles.gptTitle}>{trustedRender(title, 'Untitled GPT')}</h3>
        <div className={styles.gptTags}>
          {Array.isArray(tags) ? tags.map((tag, index) => (
            <span key={index} className={styles.gptTag}>{trustedRender(tag, '')}</span>
          )) : null}
        </div>
        <p className={styles.gptDescription}>{trustedRender(description, 'No description available')}</p>
        <div className={styles.gptLinks}>
          {Array.isArray(links) ? links.map((link, index) => {
            // Validate URL before rendering
            const isValidUrl = link.url && typeof link.url === 'string' && isValidImageUrl(link.url.replace(/^https?:\/\//, 'https://'));
            if (!isValidUrl) return null;
            
            return (
              <a 
                key={index} 
                href={trustedRender(link.url, '#')} 
                className={styles.gptLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className={`${trustedRender(link.icon, 'fas fa-link')} ${styles.gptLinkIcon}`}></i> {trustedRender(link.text, 'View GPT')}
              </a>
            );
          }) : null}
        </div>
      </div>
    </div>
  );
}
