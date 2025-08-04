import React from 'react';
import { htmlEncode, isValidImageUrl } from '../../utils/securityUtils';
import styles from './Projects.module.css';

export default function ProjectCard({ project }) {
  const { title, icon, tags, description, links } = project;
  
  // Simple fallback render for trusted content (no security validation needed for static translations)
  const trustedRender = (content, fallback = '') => {
    if (typeof content !== 'string' || !content) return fallback;
    return htmlEncode(content); // Basic HTML encoding only
  };

  return (
    <div className={styles.projectCard}>
      <div className={styles.projectImageContainer}>
        <div className={styles.projectImagePattern}></div>
        <i className={`${icon} ${styles.projectIcon}`}></i>
      </div>
      <div className={styles.projectContent}>
        <h3 className={styles.projectTitle}>{trustedRender(title, 'Untitled Project')}</h3>
        <div className={styles.projectTags}>
          {Array.isArray(tags) ? tags.map((tag, index) => (
            <span key={index} className={styles.projectTag}>{trustedRender(tag, '')}</span>
          )) : null}
        </div>
        <p className={styles.projectDescription}>{trustedRender(description, 'No description available')}</p>
        <div className={styles.projectLinks}>
          {Array.isArray(links) ? links.map((link, index) => {
            // Validate URL before rendering
            const isValidUrl = link.url && typeof link.url === 'string' && isValidImageUrl(link.url.replace(/^https?:\/\//, 'https://'));
            if (!isValidUrl) return null;
            
            return (
              <a 
                key={index} 
                href={trustedRender(link.url, '#')} 
                className={styles.projectLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className={`${trustedRender(link.icon, 'fas fa-link')} ${styles.projectLinkIcon}`}></i> {trustedRender(link.text, 'View Project')}
              </a>
            );
          }) : null}
        </div>
      </div>
    </div>
  );
}
