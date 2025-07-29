import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { user, loading, logout } = useAuth();

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

  if (!user) {
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
          <h1>Welcome to the Lucaverse, {user.name}!</h1>
          <div className={styles.userInfo}>
            <img 
              src={user.picture} 
              alt={user.name} 
              className={styles.userAvatar}
            />
            <div className={styles.userDetails}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userEmail}>{user.email}</span>
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
            <strong>Permissions:</strong> {user.permissions?.join(', ')}
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
