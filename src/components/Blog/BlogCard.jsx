import React from 'react';
import styles from './Blog.module.css';

export default function BlogCard({ post }) {
  const { title, icon, date, excerpt, url } = post;

  return (
    <div className={styles.blogCard}>
      <div className={styles.blogImageContainer}>
        <div className={styles.blogImagePattern}></div>
        <i className={`${icon} ${styles.blogIcon}`}></i>
      </div>
      <div className={styles.blogContent}>
        <div className={styles.blogDate}>{date}</div>
        <h3 className={styles.blogTitle}>{title}</h3>
        <p className={styles.blogExcerpt}>{excerpt}</p>
        <a 
          href={url} 
          className={styles.readMore}
          target="_blank"
          rel="noopener noreferrer"
        >
          Read Article <i className="fas fa-arrow-right"></i>
        </a>
      </div>
    </div>
  );
}
