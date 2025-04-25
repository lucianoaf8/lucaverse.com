import React from 'react';
import styles from './Projects.module.css';
import ProjectCard from './ProjectCard';

export default function Projects() {
  const projects = [
    {
      id: 1,
      title: 'Audio Transcription Project',
      icon: 'fas fa-waveform',
      tags: ['OpenAI', 'Whisper', 'Audio'],
      description: "Transcribes audio files to text using OpenAI's Whisper model.",
      links: [
        { icon: 'fab fa-github', text: 'View on GitHub', url: 'https://github.com/lucianoaf8/audio-transcript' }
      ]
    },
    {
      id: 2,
      title: 'Screen Scrape',
      icon: 'fas fa-clapperboard',
      tags: ['Web Scraping', 'TMDB', 'Database'],
      description: 'Retrieves movie data from TMDB and stores it in a database.',
      links: [
        { icon: 'fab fa-github', text: 'View on GitHub', url: 'https://github.com/lucianoaf8/screen-scrape' }
      ]
    },
    {
      id: 3,
      title: 'Finance Deep Analysis',
      icon: 'fas fa-chart-pie',
      tags: ['Finance', 'Data Analysis', 'Banking'],
      description: 'Analyzes financial data from multiple bank accounts to provide insights into balances, income, expenses, and spending patterns.',
      links: [
        { icon: 'fab fa-github', text: 'View on GitHub', url: 'https://github.com/lucianoaf8/finance-deep-analysis' }
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
