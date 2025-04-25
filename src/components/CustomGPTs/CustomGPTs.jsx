import React from 'react';
import styles from './CustomGPTs.module.css';
import GPTCard from './GPTCard';

export default function CustomGPTs() {
  const gpts = [
    {
      id: 1,
      title: "PythonGPT",
      icon: "fab fa-python",
      tags: ["Python", "Coding", "Project Structure"],
      description: "Python coding expert providing comprehensive solutions and project structure guidance.",
      links: [
        { icon: "fas fa-external-link-alt", text: "Try It", url: "https://chatgpt.com/g/g-UoHNGZJqK-pythongpt" }
      ]
    },
    {
      id: 2,
      title: "MysqlGPT",
      icon: "fas fa-database",
      tags: ["MySQL", "Database Design", "Query Optimization"],
      description: "User-friendly MySQL 8 expert offering database design, query creation, and optimization solutions.",
      links: [
        { icon: "fas fa-external-link-alt", text: "Try It", url: "https://chatgpt.com/g/g-Vo23uO3jp-mysqlgpt" }
      ]
    },
    {
      id: 3,
      title: "PromptMasterGPT",
      icon: "fas fa-comment-dots",
      tags: ["Prompt Engineering", "LLM", "Validation"],
      description: "Helps craft, validate, and score prompts for LLMs without performing the task itself.",
      links: [
        { icon: "fas fa-external-link-alt", text: "Try It", url: "https://chatgpt.com/g/g-67f2d5956e788191b7a0d944992b82d4-promptmastergpt" }
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
