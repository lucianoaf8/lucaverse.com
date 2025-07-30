import React from 'react';
import { logger } from '../../utils/logger.js';
import styles from './ErrorBoundary.module.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error securely
    logger.error('React Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // In production, you might want to send error to monitoring service
    if (import.meta.env.PROD) {
      // Send to error monitoring service (placeholder)
      this.reportErrorToService(error, errorInfo);
    }
  }

  reportErrorToService = (error, errorInfo) => {
    // Placeholder for error reporting service integration
    // This would typically send sanitized error data to services like Sentry, LogRocket, etc.
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Store in sessionStorage for now (in real app, send to monitoring service)
    try {
      const existingErrors = JSON.parse(sessionStorage.getItem('error_reports') || '[]');
      existingErrors.push(errorReport);
      
      // Keep only last 5 errors
      const recentErrors = existingErrors.slice(-5);
      sessionStorage.setItem('error_reports', JSON.stringify(recentErrors));
    } catch (e) {
      // Silent fail if storage is full
    }
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI with Lucaverse styling
      return (
        <div className={styles.errorContainer}>
          <div className={styles.errorCard}>
            <div className={styles.errorIcon}>
              <div className={styles.circuitError}>
                <div className={styles.errorGlow} />
                ⚠️
              </div>
            </div>
            
            <h2 className={styles.errorTitle}>
              System Malfunction Detected
            </h2>
            
            <p className={styles.errorMessage}>
              {import.meta.env.PROD 
                ? 'An unexpected error occurred. Our systems are working to resolve this issue.'
                : `Error: ${this.state.error?.message}`
              }
            </p>
            
            <div className={styles.errorActions}>
              <button 
                onClick={this.handleReset}
                className={styles.retryButton}
              >
                <span className={styles.buttonText}>Retry Connection</span>
                <div className={styles.buttonGlow} />
              </button>
              
              <button 
                onClick={() => window.location.reload()}
                className={`${styles.retryButton} ${styles.reloadButton}`}
              >
                <span className={styles.buttonText}>Reload System</span>
                <div className={styles.buttonGlow} />
              </button>
            </div>
            
            {!import.meta.env.PROD && this.state.errorInfo && (
              <details className={styles.errorDetails}>
                <summary className={styles.errorSummary}>
                  Technical Details (Development Only)
                </summary>
                <pre className={styles.errorStack}>
                  {this.state.error?.stack}
                </pre>
                <pre className={styles.componentStack}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
          
          {/* Background effects */}
          <div className={styles.backgroundGrid} />
          <div className={styles.errorGlowEffect} />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;