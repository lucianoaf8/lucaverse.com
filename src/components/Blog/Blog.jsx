import React from 'react';
import styles from './Blog.module.css';
import BlogCard from './BlogCard';

export default function Blog() {
  const blogPosts = [
    {
      id: 1,
      title: "The Future of Transformer Architecture in Enterprise AI",
      icon: "fas fa-microchip",
      date: "MAY 12, 2023",
      excerpt: "An exploration of how transformer models are revolutionizing natural language processing and their potential applications in enterprise environments.",
      url: "#"
    },
    {
      id: 2,
      title: "Optimizing Neural Networks for Real-Time Applications",
      icon: "fas fa-network-wired",
      date: "APRIL 3, 2023",
      excerpt: "Technical strategies for improving the performance and efficiency of neural networks in resource-constrained environments.",
      url: "#"
    },
    {
      id: 3,
      title: "Ethical Considerations in AI Development",
      icon: "fas fa-shield-alt",
      date: "MARCH 15, 2023",
      excerpt: "A comprehensive look at the ethical implications of AI and practical frameworks for responsible AI development and deployment.",
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
