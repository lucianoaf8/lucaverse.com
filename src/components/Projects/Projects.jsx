import React from 'react';
import styles from './Projects.module.css';
import ProjectCard from './ProjectCard';

export default function Projects() {
  const projects = [
    {
      id: 1,
      title: 'NeuralVision',
      icon: 'fas fa-brain',
      tags: ['Computer Vision', 'CNN', 'TensorFlow'],
      description: 'Advanced object detection system with real-time processing capabilities. Achieved 98.3% accuracy on benchmark datasets using optimized convolutional neural networks.',
      links: [
        { icon: 'fab fa-github', text: 'View Code', url: '#' },
        { icon: 'fas fa-external-link-alt', text: 'Live Demo', url: '#' }
      ]
    },
    {
      id: 2,
      title: 'SyntaxSage',
      icon: 'fas fa-language',
      tags: ['NLP', 'Transformers', 'BERT'],
      description: 'Natural language processing system for sentiment analysis and entity recognition. Implemented transformer architecture for enhanced contextual understanding.',
      links: [
        { icon: 'fab fa-github', text: 'View Code', url: '#' },
        { icon: 'fas fa-external-link-alt', text: 'Research Paper', url: '#' }
      ]
    },
    {
      id: 3,
      title: 'QuantumMetrics',
      icon: 'fas fa-chart-line',
      tags: ['Predictive Analytics', 'Time Series', 'Prophet'],
      description: 'Predictive analytics platform for financial markets using advanced time-series modeling. Achieved 25% improvement in forecasting accuracy compared to traditional models.',
      links: [
        { icon: 'fab fa-github', text: 'View Code', url: '#' },
        { icon: 'fas fa-external-link-alt', text: 'Case Study', url: '#' }
      ]
    }
  ];

  return (
    <section className={styles.projects} id="projects">
      <div className={styles.hudFragment}></div>
      
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Featured Projects</h2>
          <p className={styles.sectionSubtitle}>A showcase of my most impactful work in AI and data analytics.</p>
        </div>
        
        <div className={styles.projectsGrid}>
          {projects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}
