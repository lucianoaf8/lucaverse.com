import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './CustomGPTs.module.css';
import GPTCard from './GPTCard';

export default function CustomGPTs() {
  const { t } = useTranslation();

  const gpts = [
    {
      id: 1,
      title: t('pythonGptTitle'),
      icon: "fab fa-python",
      tags: [t('gptTags.python'), t('gptTags.coding'), t('gptTags.projectStructure')],
      description: t('pythonGptDescription'),
      links: [
        { icon: "fas fa-external-link-alt", text: t('tryIt'), url: "https://chatgpt.com/g/g-UoHNGZJqK-pythongpt" }
      ]
    },
    {
      id: 2,
      title: t('mysqlGptTitle'),
      icon: "fas fa-database",
      tags: [t('gptTags.mysql'), t('gptTags.databaseDesign'), t('gptTags.queryOptimization')],
      description: t('mysqlGptDescription'),
      links: [
        { icon: "fas fa-external-link-alt", text: t('tryIt'), url: "https://chatgpt.com/g/g-Vo23uO3jp-mysqlgpt" }
      ]
    },
    {
      id: 3,
      title: t('promptMasterGptTitle'),
      icon: "fas fa-comment-dots",
      tags: [t('gptTags.promptEngineering'), t('gptTags.llm'), t('gptTags.validation')],
      description: t('promptMasterGptDescription'),
      links: [
        { icon: "fas fa-external-link-alt", text: t('tryIt'), url: "https://chatgpt.com/g/g-67f2d5956e788191b7a0d944992b82d4-promptmastergpt" }
      ]
    }
  ];

  return (
    <section className={styles.customGPTs} id="custom-gpts">
      <div className={styles.hudFragment}></div>
      
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('customGptsTitle')}</h2>
          <p className={styles.sectionSubtitle}>{t('customGptsSubtitle')}</p>
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
