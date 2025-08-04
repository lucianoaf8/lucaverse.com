import React, { useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { sanitizeOAuthUserData, safeRender, isValidImageUrl } from '../../utils/securityUtils';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  
  // Sanitize user data from OAuth provider
  const sanitizedUser = useMemo(() => {
    if (!user) return null;
    return sanitizeOAuthUserData(user);
  }, [user]);

  if (loading) {
    return (
      <div className={styles.dashboardLoading}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!sanitizedUser) {
    return (
      <div className={styles.dashboardError}>
        <div className={styles.errorContainer}>
          <h2>Access Denied</h2>
          <p>Please log in to access the Lucaverse.</p>
          <a href="/" className={styles.btn}>Return Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.dashboardHeader}>
        <div className={styles.headerContent}>
          <h1>Welcome to the Lucaverse, {safeRender(sanitizedUser.name, 'User')}!</h1>
          <div className={styles.userInfo}>
            {sanitizedUser.picture && isValidImageUrl(sanitizedUser.picture) ? (
              <img 
                src={sanitizedUser.picture} 
                alt={safeRender(sanitizedUser.name, 'User avatar')} 
                className={styles.userAvatar}
                onError={(e) => {
                  // Fallback to default avatar on image load error
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div className={`${styles.userAvatar} ${styles.defaultAvatar}`}>
                <span>{sanitizedUser.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div className={styles.userDetails}>
              <span className={styles.userName}>{safeRender(sanitizedUser.name, 'Unknown User')}</span>
              <span className={styles.userEmail}>{safeRender(sanitizedUser.email, 'No email')}</span>
            </div>
            <button 
              onClick={logout} 
              className={`${styles.btn} ${styles.btnSecondary}`}
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      
      <main className={styles.dashboardContent}>
        <div className={styles.welcomeSection}>
          <h2>🎉 You're in the Lucaverse!</h2>
          <p>This is your protected dashboard.</p>
          <div className={styles.permissionsInfo}>
            <strong>Permissions:</strong> {sanitizedUser.permissions?.length > 0 
              ? sanitizedUser.permissions.join(', ') 
              : 'Basic access'}
          </div>
        </div>
        
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <h3>AI Assistants</h3>
            <p>Access your personalized AI tools and workflows.</p>
          </div>
          
          <div className={styles.featureCard}>
            <h3>Projects</h3>
            <p>Manage and collaborate on your innovative projects.</p>
          </div>
          
          <div className={styles.featureCard}>
            <h3>Analytics</h3>
            <p>Track your progress and insights across all platforms.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
