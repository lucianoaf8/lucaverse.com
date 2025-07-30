/**
 * Session Warning Component
 * LUCI-012: Displays session timeout warnings and provides session extension
 */

import React, { useState, useEffect } from 'react';
import styles from './SessionWarning.module.css';
import { logger } from '../../utils/logger.js';
import sessionManager from '../../utils/sessionManager.js';

const SessionWarning = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [message, setMessage] = useState('');
  const [isExtending, setIsExtending] = useState(false);

  useEffect(() => {
    // Register for session warning events
    const handleWarning = (event) => {
      logger.info('Session warning received:', event);
      setMessage(event.message);
      setTimeRemaining(event.timeRemaining);
      setIsVisible(true);
      
      // Start countdown timer
      startCountdown(event.timeRemaining);
    };

    const handleTimeout = (event) => {
      logger.warn('Session timeout received:', event);
      setIsVisible(false);
      // SessionManager will handle logout
    };

    // Register callbacks
    sessionManager.onWarning(handleWarning);
    sessionManager.onTimeout(handleTimeout);

    // Cleanup on unmount
    return () => {
      // Note: SessionManager doesn't provide unsubscribe methods
      // This is handled by the cleanup method when component unmounts
    };
  }, []);

  const startCountdown = (initialTime) => {
    let remaining = initialTime;
    
    const countdown = setInterval(() => {
      remaining -= 1000;
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        clearInterval(countdown);
        setIsVisible(false);
      }
    }, 1000);

    // Store interval ID for cleanup
    return countdown;
  };

  const handleExtendSession = async () => {
    setIsExtending(true);
    
    try {
      const result = await sessionManager.extendSession();
      
      if (result.success) {
        logger.info('Session extended successfully');
        setIsVisible(false);
        setTimeRemaining(0);
      } else {
        logger.error('Failed to extend session:', result.error);
        // Show error message but keep warning visible
        setMessage('Failed to extend session. Please save your work.');
      }
    } catch (error) {
      logger.error('Session extension error:', error);
      setMessage('Failed to extend session. Please save your work.');
    } finally {
      setIsExtending(false);
    }
  };

  const handleDismiss = () => {
    // Allow user to dismiss warning but session will still timeout
    setIsVisible(false);
    logger.info('Session warning dismissed by user');
  };

  const formatTime = (milliseconds) => {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isVisible) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>⏰ Session Expiring</h3>
        </div>
        
        <div className={styles.content}>
          <div className={styles.message}>
            {message}
          </div>
          
          <div className={styles.countdown}>
            <div className={styles.timeDisplay}>
              Time remaining: <span className={styles.time}>{formatTime(timeRemaining)}</span>
            </div>
            
            <div className={styles.progressBar}>
              <div 
                className={styles.progress}
                style={{
                  width: `${(timeRemaining / (5 * 60 * 1000)) * 100}%`
                }}
              />
            </div>
          </div>
        </div>
        
        <div className={styles.actions}>
          <button
            className={`${styles.button} ${styles.primaryButton}`}
            onClick={handleExtendSession}
            disabled={isExtending}
          >
            {isExtending ? (
              <>
                <span className={styles.spinner}></span>
                Extending...
              </>
            ) : (
              'Extend Session'
            )}
          </button>
          
          <button
            className={`${styles.button} ${styles.secondaryButton}`}
            onClick={handleDismiss}
            disabled={isExtending}
          >
            Dismiss
          </button>
        </div>
        
        <div className={styles.footer}>
          <p className={styles.footerText}>
            Your session will automatically expire if no action is taken.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SessionWarning;