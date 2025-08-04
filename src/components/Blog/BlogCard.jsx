import React from 'react';
import { htmlEncode, isValidImageUrl } from '../../utils/securityUtils';
import styles from './Blog.module.css';

export default function BlogCard({ post }) {
  const { title, icon, date, excerpt, url } = post;
  
  // Simple fallback render for trusted content (no security validation needed for static translations)
  const trustedRender = (content, fallback = '') => {
    if (typeof content !== 'string' || !content) return fallback;
    return htmlEncode(content); // Basic HTML encoding only
  };

  return (
    <div className={styles.blogCard}>
      <div className={styles.blogImageContainer}>
        <div className={styles.blogImagePattern}></div>
        <i className={`${trustedRender(icon, 'fas fa-blog')} ${styles.blogIcon}`}></i>
      </div>
      <div className={styles.blogContent}>
        <div className={styles.blogDate}>{trustedRender(date, 'No date')}</div>
        <h3 className={styles.blogTitle}>{trustedRender(title, 'Untitled Post')}</h3>
        <p className={styles.blogExcerpt}>{trustedRender(excerpt, 'No excerpt available')}</p>
        <div className={styles.blogLinks} style={{ marginTop: 'auto' }}>
          <a 
            href={url && isValidImageUrl(url.replace(/^https?:\/\//, 'https://')) ? trustedRender(url, '#') : '#'} 
            className={styles.readMore}
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="fas fa-clock"></i> Coming Soon
          </a>
        </div>
      </div>
    </div>
  );
}