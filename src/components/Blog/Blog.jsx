import React from 'react';
import styles from './Blog.module.css';
import BlogCard from './BlogCard';

export default function Blog() {
  const blogPosts = [
    {
      id: 1,
      title: "COMING SOON",
      icon: "fas fa-microchip",
      date: "COMING SOON",
      excerpt: "Exciting content coming soon. Stay tuned for updates on AI, machine learning, and technology topics.",
      url: "#"
    },
    {
      id: 2,
      title: "COMING SOON",
      icon: "fas fa-network-wired",
      date: "COMING SOON",
      excerpt: "Exciting content coming soon. Stay tuned for updates on AI, machine learning, and technology topics.",
      url: "#"
    },
    {
      id: 3,
      title: "COMING SOON",
      icon: "fas fa-shield-alt",
      date: "COMING SOON",
      excerpt: "Exciting content coming soon. Stay tuned for updates on AI, machine learning, and technology topics.",
      url: "#"
    }
  ];

  return (
    <section className={styles.blog} id="blog">
      <div className={styles.hudFragment}></div>
      
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Blog</h2>
          <p className={styles.sectionSubtitle}>Insights and perspectives on AI, machine learning, and data science.</p>
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
