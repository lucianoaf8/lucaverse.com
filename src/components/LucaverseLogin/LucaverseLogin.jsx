import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import TronGrid from '../Background/TronGrid.tsx';
import { getAuthEndpoint, validateEndpoint } from '../../config/api';
import { storeAuthTokensSecurely } from '../../hooks/useAuth';
import styles from './LucaverseLogin.module.css';

const LucaverseLogin = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredButton, setHoveredButton] = useState(null);

  const handleLogin = (provider) => {
    if (provider === 'Google') {
      handleGoogleLogin();
    } else {
      // Microsoft or other providers - simulate for now
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
      }, 2000);
    }
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    
    // OAuth popup window specs
    const popupWidth = 500;
    const popupHeight = 600;
    const left = (window.screen.width / 2) - (popupWidth / 2);
    const top = (window.screen.height / 2) - (popupHeight / 2);
    
    // SECURITY: Use centralized API configuration
    const oauthUrl = getAuthEndpoint('/auth/google');
    
    // SECURITY: Validate endpoint before opening popup
    if (!validateEndpoint(oauthUrl)) {
      setIsLoading(false);
      return;
    }
    
    const popup = window.open(
      oauthUrl,
      'googleAuth',
      `width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    
    if (!popup) {
      console.error('❌ Popup was blocked!');
      setIsLoading(false);
      alert('Popup was blocked. Please allow popups for this site.');
      return;
    }

    // Timeout ID for cleanup
    let timeoutId;

    // Listen for messages from the popup
    const messageHandler = async (event) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'OAUTH_SUCCESS') {
        // Store authentication tokens securely
        await storeAuthTokensSecurely(event.data.token, event.data.sessionId);
        
        // DO NOT close popup manually - let popup self-close to avoid COOP race conditions
        // The popup will close itself via window.close() in oauth-callback.html
        
        // Clean up
        clearTimeout(timeoutId);
        window.removeEventListener('message', messageHandler);
        
        // Wait for popup to fully close before redirecting to dashboard
        const checkPopupClosed = () => {
          try {
            // Check if popup still exists and is closed
            if (!popup || popup.closed) {
              setIsLoading(false);
              window.location.hash = 'dashboard';
            } else {
              // If popup still open, check again in 100ms
              setTimeout(checkPopupClosed, 100);
            }
          } catch (error) {
            // If we can't access popup properties (COOP), assume it's closed after reasonable delay
            setTimeout(() => {
              setIsLoading(false);
              window.location.hash = 'dashboard';
            }, 500);
          }
        };
        
        // Start checking after initial delay to allow popup self-close to begin
        setTimeout(checkPopupClosed, 1000);
        
      } else if (event.data.type === 'OAUTH_ERROR') {
        // Handle authentication error
        console.error('OAuth error:', event.data.error);
        
        // DO NOT close popup manually - let popup self-close to avoid COOP race conditions
        // The popup will close itself via window.close() in oauth-callback.html
        
        clearTimeout(timeoutId);
        window.removeEventListener('message', messageHandler);
        
        // Wait for popup to fully close before showing error
        const checkPopupClosedError = () => {
          try {
            // Check if popup still exists and is closed
            if (!popup || popup.closed) {
              setIsLoading(false);
              alert('Authentication failed. Please try again.');
            } else {
              // If popup still open, check again in 100ms
              setTimeout(checkPopupClosedError, 100);
            }
          } catch (error) {
            // If we can't access popup properties (COOP), assume it's closed after reasonable delay
            setTimeout(() => {
              setIsLoading(false);
              alert('Authentication failed. Please try again.');
            }, 500);
          }
        };
        
        // Start checking after initial delay to allow popup self-close to begin
        setTimeout(checkPopupClosedError, 1000);
      }
    };

    // Add message listener
    window.addEventListener('message', messageHandler);

    // Timeout after 5 minutes
    timeoutId = setTimeout(() => {
      // DO NOT attempt to close popup manually on timeout - avoid COOP violations
      // Let popup close naturally or user close it manually
      window.removeEventListener('message', messageHandler);
      setIsLoading(false);
      console.error('OAuth timeout - popup may still be open');
    }, 300000);
  };

  return (
    <div className={styles.container}>
      {/* Background with TronGrid */}
      <TronGrid />

      {/* Background Grid Pattern */}
      <div className={styles.gridPattern} />

      {/* Glow Orbs */}
      <div className={styles.glowOrbCyan} />
      <div className={styles.glowOrbTeal} />

      {/* Main Login Container */}
      <div className={styles.mainContainer}>
        {/* Header */}
        <div className={styles.header}>
          {/* Logo */}
          <div className={styles.logoContainer}>
            <div className={styles.logo}>
              <div className={styles.logoGlow} />
              <div className={styles.logoInner}>
                <img src="/assets/lv-logo-nobg.png" alt="Lucaverse Logo" className={styles.logoImage} />
              </div>
            </div>
          </div>

          <h1 className={styles.title}>
            {t('login.enterThe', 'Enter the')}{' '}
            <span className={styles.titleGradient}>
              {t('login.lucaverse', 'Lucaverse')}
            </span>
          </h1>
        </div>

        {/* Login Card */}
        <div className={styles.loginCard}>
          {/* Holographic border effect */}
          <div className={styles.holographicBorder} />

          <div className={styles.cardContent}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                {t('login.chooseGateway', 'Choose Your Gateway')}
              </h2>
              <p className={styles.cardSubtitle}>
                {t('login.connectWith', 'Connect with your preferred authentication method')}
              </p>
            </div>

            {/* Google Login Button */}
            <button
              onClick={() => handleLogin('Google')}
              onMouseEnter={() => setHoveredButton('google')}
              onMouseLeave={() => setHoveredButton(null)}
              disabled={isLoading}
              className={styles.loginButton}
            >
              <div 
                className={`${styles.buttonContainer} ${
                  hoveredButton === 'google' ? styles.hovered : ''
                } ${isLoading ? styles.loading : ''}`}
              >
                <div className={styles.buttonContent}>
                  <div className={`${styles.buttonIcon} ${styles.googleIcon}`}>
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  <span className={styles.buttonText}>
                    {t('login.continueWithGoogle', 'Continue with Google')}
                  </span>
                </div>
              </div>
            </button>

            {/* Microsoft Login Button - Hidden for now */}
            <button
              onClick={() => handleLogin('Microsoft')}
              onMouseEnter={() => setHoveredButton('microsoft')}
              onMouseLeave={() => setHoveredButton(null)}
              disabled={isLoading}
              className={`${styles.loginButton} ${styles.microsoftButton}`}
            >
              <div 
                className={`${styles.buttonContainer} ${styles.microsoft} ${
                  hoveredButton === 'microsoft' ? styles.hovered : ''
                } ${isLoading ? styles.loading : ''}`}
              >
                <div className={styles.buttonContent}>
                  <div className={styles.buttonIcon}>
                    <svg viewBox="0 0 23 23" width="20" height="20">
                      <path fill="#f25022" d="M0 0h11v11H0z"/>
                      <path fill="#00a4ef" d="M12 0h11v11H12z"/>
                      <path fill="#7fba00" d="M0 12h11v11H0z"/>
                      <path fill="#ffb900" d="M12 12h11v11H12z"/>
                    </svg>
                  </div>
                  <span className={styles.buttonText}>
                    {t('login.continueWithMicrosoft', 'Continue with Microsoft')}
                  </span>
                </div>
              </div>
            </button>

            {/* Loading State */}
            <div className={styles.loadingContainer}>
              {isLoading && (
                <div className={styles.loadingContent}>
                  <div className={styles.loadingSpinner} />
                  <span className={styles.loadingText}>
                    {t('login.initializing', 'Initializing connection...')}
                  </span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className={styles.divider}>
              <div className={styles.dividerLine}>
                <div className={styles.dividerBorder} />
              </div>
              <div className={styles.dividerContent}>
                <span className={styles.dividerText}>
                  {t('login.secureAuth', 'Secure Authentication')}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className={styles.footer}>
              <p className={styles.footerText}>
                {t('login.termsAgreement', 'By continuing, you agree to our Terms of Service')}
              </p>
              <p>
                {t('login.encryption', 'Protected by enterprise-grade encryption')}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom HUD Element */}
        <div className={styles.bottomHud}>
          <div className={styles.hudContent}>
            <div className={`${styles.hudDot} ${styles.hudDotCyan}`} />
            <span>{t('login.secureConnection', 'SECURE CONNECTION ESTABLISHED')}</span>
            <div className={`${styles.hudDot} ${styles.hudDotTeal}`} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LucaverseLogin;