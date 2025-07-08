import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Blog.module.css';
import BlogCard from './BlogCard';

export default function Blog() {
  const { t } = useTranslation();

  const blogPosts = [
    {
      id: 1,
      title: t('comingSoon'),
      icon: "fas fa-microchip",
      date: t('comingSoon'),
      excerpt: t('blogExcerpt'),
      url: "#"
    },
    {
      id: 2,
      title: t('comingSoon'),
      icon: "fas fa-network-wired",
      date: t('comingSoon'),
      excerpt: t('blogExcerpt'),
      url: "#"
    },
    {
      id: 3,
      title: t('comingSoon'),
      icon: "fas fa-shield-alt",
      date: t('comingSoon'),
      excerpt: t('blogExcerpt'),
      url: "#"
    }
  ];

  return (
    <section className={styles.blog} id="blog">
      <div className={styles.hudFragment}></div>
      
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('blogTitle')}</h2>
          <p className={styles.sectionSubtitle}>{t('blogSubtitle')}</p>
        </div>
        
        <div className={styles.blogGrid}>
          {blogPosts.map(post => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}
