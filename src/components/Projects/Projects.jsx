import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Projects.module.css';
import ProjectCard from './ProjectCard';

export default function Projects() {
  const { t } = useTranslation();

  const projects = [
    {
      id: 1,
      title: t('audioTranscriptionTitle'),
      icon: 'fas fa-headphones',
      tags: [t('tags.openAI'), t('tags.whisper'), t('tags.audio')],
      description: t('audioTranscriptionDescription'),
      links: [
        { icon: 'fab fa-github', text: t('viewOnGithub'), url: 'https://github.com/lucianoaf8/audio-transcript' }
      ]
    },
    {
      id: 2,
      title: t('screenScrapeTitle'),
      icon: 'fas fa-film',
      tags: [t('tags.webScraping'), t('tags.tmdb'), t('tags.database')],
      description: t('screenScrapeDescription'),
      links: [
        { icon: 'fab fa-github', text: t('viewOnGithub'), url: 'https://github.com/lucianoaf8/screen-scrape' }
      ]
    },
    {
      id: 3,
      title: t('financeAnalysisTitle'),
      icon: 'fas fa-chart-line',
      tags: [t('tags.finance'), t('tags.dataAnalysis'), t('tags.banking')],
      description: t('financeAnalysisDescription'),
      links: [
        { icon: 'fab fa-github', text: t('viewOnGithub'), url: 'https://github.com/lucianoaf8/finance-deep-analysis' }
      ]
    }
  ];

  return (
    <section className={styles.projects} id="projects">
      <div className={styles.hudFragment}></div>
      
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('myProjects')}</h2>
          <p className={styles.sectionSubtitle}>{t('projectsSubtitle')}</p>
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
