import React from 'react';
import TronGridAICircuitBackground from './TronGrid.tsx';
import styles from './Background.module.css';

export default function Background() {
  return (
    <div id="background-wrapper" className={styles.backgroundWrapper}>
      <TronGridAICircuitBackground />
    </div>
  );
}