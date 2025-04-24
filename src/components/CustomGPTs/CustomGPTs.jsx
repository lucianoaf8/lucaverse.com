import React from 'react';
import styles from './CustomGPTs.module.css';
import GPTCard from './GPTCard';

export default function CustomGPTs() {
  const gpts = [
    {
      id: 1,
      title: "AI Strategy Advisor",
      icon: "fas fa-robot",
      tags: ["Business Strategy", "AI Consulting", "GPT-4"],
      description: "An intelligent assistant that provides actionable strategies for AI implementation in various business contexts, backed by research and industry best practices.",
      links: [
        { icon: "fas fa-external-link-alt", text: "Try It", url: "#" },
        { icon: "fas fa-info-circle", text: "Learn More", url: "#" }
      ]
    },
    {
      id: 2,
      title: "Code Companion",
      icon: "fas fa-code",
      tags: ["Coding", "Debugging", "Documentation"],
      description: "Your personal coding assistant that helps with code generation, debugging, and creating comprehensive documentation for software projects.",
      links: [
        { icon: "fas fa-external-link-alt", text: "Try It", url: "#" },
        { icon: "fas fa-info-circle", text: "Learn More", url: "#" }
      ]
    },
    {
      id: 3,
      title: "Research Navigator",
      icon: "fas fa-search",
      tags: ["Academic Research", "Literature Review", "Citation"],
      description: "A specialized GPT designed to assist with academic research, literature reviews, and proper citation formatting across various academic disciplines.",
      links: [
        { icon: "fas fa-external-link-alt", text: "Try It", url: "#" },
        { icon: "fas fa-info-circle", text: "Learn More", url: "#" }
      ]
    }
  ];

  return (
    <section className={styles.customGPTs} id="custom-gpts">
      <div className={styles.hudFragment}></div>
      
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Custom GPTs</h2>
          <p className={styles.sectionSubtitle}>Specialized AI assistants designed to enhance productivity and solve specific challenges.</p>
        </div>
        
        <div className={styles.gptsGrid}>
          {gpts.map(gpt => (
            <GPTCard key={gpt.id} gpt={gpt} />
          ))}
        </div>
      </div>
    </section>
  );
}
