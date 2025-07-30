import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState([
    'Welcome to Lucaverse Terminal v2.1.0',
    'Type "help" for available commands'
  ]);

  // Static activity data
  const activities = [
    { id: 1, icon: '🤖', message: 'AI model processed data analysis', timestamp: new Date() },
    { id: 2, icon: '🚀', message: 'Project deployment completed', timestamp: new Date() },
    { id: 3, icon: '⚡', message: 'System performance optimized', timestamp: new Date() },
    { id: 4, icon: '🔄', message: 'Database synchronized', timestamp: new Date() },
    { id: 5, icon: '⚙️', message: 'New workflow automation created', timestamp: new Date() }
  ];

  // Mock metrics data
  const metrics = {
    cpu: 34,
    memory: 67,
    aiLoad: 45
  };

  // Terminal commands
  const commands = {
    'help': () => 'Available commands: status, projects, clear, help, metrics, time',
    'status': () => 'System: ✅ Operational | AI: 🟢 Active | Projects: 3 Running',
    'projects': () => 'Loading projects... \n- Audio Transcription: Active\n- Screen Scrape: Deployed\n- Finance Analysis: Processing',
    'clear': () => { setTerminalHistory([]); return ''; },
    'metrics': () => 'CPU: 34% | Memory: 67% | Network: 12MB/s | Uptime: 42h',
    'time': () => new Date().toLocaleString()
  };

  // Update time every second
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  const executeCommand = () => {
    if (!terminalInput.trim()) return;
    
    const command = terminalInput.toLowerCase().trim();
    const output = commands[command] ? commands[command]() : `Command not found: ${command}`;
    
    setTerminalHistory(prev => [...prev, `$ ${terminalInput}`, output]);
    setTerminalInput('');
  };

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
          <h1 className={styles.headerTitle}>Welcome to the Lucaverse, {user.name}!</h1>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              <span className={styles.avatarText}>{user.name.charAt(0)}</span>
            </div>
            <div className={styles.userDetails}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userEmail}>{user.email}</span>
            </div>
            <button 
              onClick={logout} 
              className={styles.logoutBtn}
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      
      <main className={styles.dashboardContent}>
        {/* Welcome Section */}
        <div className={styles.welcomeSection}>
          <h2 className={styles.welcomeTitle}>🎉 You're in the Lucaverse!</h2>
          <p className={styles.welcomeText}>Your personalized AI-powered dashboard</p>
          <div className={styles.permissionsInfo}>
            <strong>Permissions:</strong> {user.permissions?.join(', ') || 'AI_ACCESS, PROJECT_MANAGER, ANALYTICS'}
          </div>
          <div className={styles.timeDisplay}>
            {currentTime.toLocaleString()}
          </div>
        </div>

        {/* Widgets Grid */}
        <div className={styles.widgetsGrid}>
          {/* Terminal Widget */}
          <div className={`${styles.widget} ${styles.terminalWidget}`}>
            <div className={styles.terminalHeader}>
              <span className={styles.terminalTitle}>LUCAVERSE_TERMINAL v2.1.0</span>
              <div className={styles.terminalControls}>
                <span className={styles.terminalButton}></span>
                <span className={styles.terminalButton}></span>
                <span className={styles.terminalButton}></span>
              </div>
            </div>
            <div className={styles.terminalBody}>
              {terminalHistory.map((line, i) => (
                <div key={i} className={styles.terminalLine}>
                  {line}
                </div>
              ))}
              <div className={styles.terminalInputLine}>
                <span className={styles.prompt}>luca@verse:~$ </span>
                <input
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && executeCommand()}
                  className={styles.terminalInput}
                  placeholder="Type command..."
                />
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className={styles.widget}>
            <h3 className={styles.widgetTitle}>Activity Stream</h3>
            <div className={styles.activityFeed}>
              {activities.map(activity => (
                <div key={activity.id} className={styles.activityItem}>
                  <span className={styles.activityIcon}>{activity.icon}</span>
                  <div className={styles.activityContent}>
                    <span className={styles.activityMessage}>{activity.message}</span>
                    <span className={styles.activityTime}>
                      {activity.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Metrics */}
          <div className={styles.widget}>
            <h3 className={styles.widgetTitle}>System Performance</h3>
            <div className={styles.metricsContainer}>
              <div className={styles.metricItem}>
                <span className={styles.metricLabel}>CPU</span>
                <div className={styles.metricBar}>
                  <div className={styles.metricFill} style={{width: `${metrics.cpu}%`}}></div>
                </div>
                <span className={styles.metricValue}>{metrics.cpu}%</span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricLabel}>Memory</span>
                <div className={styles.metricBar}>
                  <div className={styles.metricFill} style={{width: `${metrics.memory}%`, backgroundColor: '#00FFCC'}}></div>
                </div>
                <span className={styles.metricValue}>{metrics.memory}%</span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricLabel}>AI Load</span>
                <div className={styles.metricBar}>
                  <div className={styles.metricFill} style={{width: `${metrics.aiLoad}%`, backgroundColor: '#2AF598'}}></div>
                </div>
                <span className={styles.metricValue}>{metrics.aiLoad}%</span>
              </div>
            </div>
          </div>

          {/* Holographic Data Visualization */}
          <div className={styles.widget}>
            <h3 className={styles.widgetTitle}>Data Visualization</h3>
            <div className={styles.holoContainer}>
              <div className={styles.holoGrid}>
                {[1,2,3,4,5,6,7,8,9].map(i => (
                  <div
                    key={i}
                    className={styles.holoBar}
                    style={{
                      height: `${Math.random() * 80 + 20}%`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  ></div>
                ))}
              </div>
              <div className={styles.holoText}>Real-time Data Processing</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={styles.widget}>
            <h3 className={styles.widgetTitle}>Quick Actions</h3>
            <div className={styles.quickActions}>
              <button className={styles.actionButton}>
                <span className={styles.actionIcon}>🚀</span>
                Deploy Project
              </button>
              <button className={styles.actionButton}>
                <span className={styles.actionIcon}>📊</span>
                Generate Report
              </button>
              <button className={styles.actionButton}>
                <span className={styles.actionIcon}>🔧</span>
                System Config
              </button>
              <button className={styles.actionButton}>
                <span className={styles.actionIcon}>🎯</span>
                Run Analysis
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
