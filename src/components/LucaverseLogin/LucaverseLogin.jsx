import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import TronGrid from '../Background/TronGrid.tsx';
import { createOAuthSecurityParams, validateMessageSource, oauthStorage } from '../../utils/oauth-security.js';
import { logger } from '../../utils/logger.js';
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

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    try {
      // Generate secure OAuth parameters
      const securityParams = await createOAuthSecurityParams();
      console.log('OAuth security params:', securityParams);
      
      // OAuth popup window specs
      const popupWidth = 500;
      const popupHeight = 600;
      const left = (window.screen.width / 2) - (popupWidth / 2);
      const top = (window.screen.height / 2) - (popupHeight / 2);
      
      // Build secure OAuth URL with state and PKCE parameters
      const oauthUrl = new URL('https://lucaverse-auth.lucianoaf8.workers.dev/auth/google');
      oauthUrl.searchParams.set('state', securityParams.state);
      oauthUrl.searchParams.set('code_challenge', securityParams.codeChallenge);
      oauthUrl.searchParams.set('code_challenge_method', securityParams.codeChallengeMethod || 'S256');
      oauthUrl.searchParams.set('session_id', securityParams.sessionId);
      
      const popup = window.open(
        oauthUrl.toString(),
        'googleAuth',
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );

    
    if (!popup) {
      logger.error('Popup was blocked');
      setIsLoading(false);
      alert('Popup was blocked. Please allow popups for this site.');
      return;
    }

    // Timeout ID for cleanup
    let timeoutId;
    let popupCheckInterval;

    // Check if popup was closed manually (without authentication)
    const checkPopupClosed = () => {
      if (popup && popup.closed) {
        logger.debug('Popup was closed manually');
        clearInterval(popupCheckInterval);
        clearTimeout(timeoutId);
        window.removeEventListener('message', messageHandler);
        setIsLoading(false);
      }
    };

    // Start checking if popup is closed every 1 second
    popupCheckInterval = setInterval(checkPopupClosed, 1000);

      // Listen for messages from the popup
      const messageHandler = (event) => {
        console.log('🎯 Frontend: Message received from popup', {
          origin: event.origin,
          source: event.source === popup ? 'popup' : 'other',
          data: event.data,
          timestamp: new Date().toISOString()
        });

        // Enhanced security validation - check against worker origin  
        const expectedWorkerOrigin = 'https://lucaverse-auth.lucianoaf8.workers.dev';
        
        console.log('🔍 Frontend: Validating message source', {
          receivedOrigin: event.origin,
          expectedOrigin: expectedWorkerOrigin,
          sourceMatches: event.source === popup,
          popupClosed: popup?.closed,
          eventType: event.data?.type
        });

        // Allow messages from worker origin or parent origin for flexibility
        const validOrigins = [expectedWorkerOrigin, window.location.origin];
        if (!validOrigins.includes(event.origin)) {
          logger.security('Invalid message origin', { origin: event.origin, expected: validOrigins });
          console.log('❌ Frontend: Message origin validation failed');
          return;
        }

        // Validate source (popup or parent windows)
        const validSources = [popup, window.parent, window.top].filter(Boolean);
        if (!validSources.includes(event.source)) {
          logger.security('Invalid message source window');
          console.log('❌ Frontend: Message source window validation failed');
          return;
        }

        console.log('✅ Frontend: Message source validation passed');

        // Validate message structure
        if (!event.data || typeof event.data !== 'object') {
          logger.security('Invalid message data', { data: event.data });
          console.log('❌ Frontend: Invalid message data structure');
          return;
        }

        console.log('✅ Frontend: Message data structure valid');

        // Validate message timestamp (prevent replay attacks)
        const messageAge = Date.now() - (event.data.timestamp || 0);
        console.log('⏰ Frontend: Message timing check', { 
          messageTimestamp: event.data.timestamp, 
          currentTime: Date.now(), 
          age: messageAge,
          ageSeconds: Math.round(messageAge / 1000),
          maxAllowed: 300000
        });
        
        if (messageAge > 300000) { // 5 minutes max - more generous for OAuth flow
          logger.security('Message too old', { age: messageAge });
          console.log('❌ Frontend: Message too old', { age: messageAge, ageSeconds: Math.round(messageAge / 1000) });
          return;
        }

        console.log('✅ Frontend: Message timestamp valid', { age: messageAge });

        if (event.data.type === 'OAUTH_SUCCESS') {
          console.log('🎉 Frontend: OAuth success message received!', {
            messageData: event.data,
            popupClosed: popup?.closed,
            debugInfo: event.data.debug
          });
          
          logger.debug('OAuth success message received');
          
          // Authentication successful - tokens will be set as httpOnly cookies by the server
          // No client-side token storage for security
          
          console.log('🧹 Frontend: Starting cleanup process');
          
          // Clean up immediately
          clearInterval(popupCheckInterval);
          clearTimeout(timeoutId);
          window.removeEventListener('message', messageHandler);
          
          console.log('✅ Frontend: Event listeners and intervals cleared');
          
          // Close the popup first
          if (popup && !popup.closed) {
            try {
              console.log('🚪 Frontend: Attempting to close popup');
              popup.close();
              console.log('✅ Frontend: Popup close command sent');
            } catch (error) {
              console.log('⚠️ Frontend: Popup already closed or could not be closed:', error.message);
              logger.debug('Popup already closed or could not be closed');
            }
          } else {
            console.log('ℹ️ Frontend: Popup already closed or not available');
          }
          
          // Clear OAuth storage
          oauthStorage.clear();
          console.log('✅ Frontend: OAuth storage cleared');
          
          // Wait a moment for popup to fully close, then redirect
          setTimeout(() => {
            console.log('🏠 Frontend: Redirecting to dashboard');
            setIsLoading(false);
            logger.debug('Redirecting to dashboard');
            window.location.hash = 'dashboard';
          }, 300);
          
        } else if (event.data.type === 'OAUTH_ERROR') {
          const errorMsg = event.data.error || 'Authentication failed';
          const errorCode = event.data.errorCode || 'unknown';
          
          console.log('❌ Frontend: OAuth error received', {
            error: errorMsg,
            errorCode: errorCode,
            messageData: event.data,
            popupClosed: popup?.closed
          });
          
          logger.error('OAuth error:', errorMsg);
          
          // Close the popup first
          if (popup && !popup.closed) {
            console.log('🚪 Frontend: Closing popup after error');
            popup.close();
          }
          
          clearInterval(popupCheckInterval);
          clearTimeout(timeoutId);
          window.removeEventListener('message', messageHandler);
          
          // Clear OAuth storage
          oauthStorage.clear();
          
          console.log('🧹 Frontend: Cleanup completed after error');
          
          // Wait a moment for popup to fully close, then show error
          setTimeout(() => {
            setIsLoading(false);
            
            // Show user-friendly error message based on error code
            let userError;
            switch (errorCode) {
              case 'access_denied':
                userError = 'Authentication was cancelled. Please try again.';
                break;
              case 'popup_blocked':
                userError = 'Popup was blocked. Please allow popups and try again.';
                break;
              case 'session_expired':
                userError = 'Session expired. Please try authentication again.';
                break;
              case 'not_authorized':
                userError = 'You are not authorized to access this application.';
                break;
              case 'state_mismatch':
                userError = 'Security validation failed. Please try again.';
                break;
              case 'missing_params':
                userError = 'Authentication parameters missing. Please try again.';
                break;
              default:
                userError = errorMsg.includes('access_denied') 
                  ? 'Authentication was cancelled. Please try again.'
                  : errorMsg.includes('popup_blocked')
                  ? 'Popup was blocked. Please allow popups and try again.'
                  : 'Authentication failed. Please try again.';
            }
              
            console.log('🚨 Frontend: Showing error to user:', userError);
            alert(userError);
            logger.debug('OAuth error handled:', { error: errorMsg, errorCode, userError });
          }, 300);
        } else {
          console.log('❓ Frontend: Unknown message type received', {
            type: event.data.type,
            data: event.data
          });
          logger.debug('Unknown message type received:', event.data.type);
        }
      };

    // Add message listener
    window.addEventListener('message', messageHandler);

    // Timeout after 5 minutes
    timeoutId = setTimeout(() => {
      if (popup && !popup.closed) {
        popup.close();
      }
      clearInterval(popupCheckInterval);
      window.removeEventListener('message', messageHandler);
      setIsLoading(false);
      logger.error('OAuth timeout');
    }, 300000);
    
    } catch (error) {
      logger.security('OAuth Security Error:', error);
      setIsLoading(false);
      alert(logger.getUserFriendlyError('authentication'));
      
      // Clean up any stored OAuth parameters
      oauthStorage.clear();
    }
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