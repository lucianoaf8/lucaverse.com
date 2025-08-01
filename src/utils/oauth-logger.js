// OAuth Debug Logger - Saves all logs to files for analysis
// This logger captures both frontend and popup window logs

class OAuthLogger {
  constructor() {
    this.logs = [];
    this.sessionId = Date.now().toString();
    this.startTime = Date.now();
  }

  log(level, component, message, data = {}) {
    const timestamp = new Date().toISOString();
    const relativeTime = Date.now() - this.startTime;
    
    const logEntry = {
      timestamp,
      relativeTime,
      level,
      component,
      message,
      data: this.sanitizeData(data),
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.logs.push(logEntry);
    
    // Also log to console with enhanced formatting
    const consoleMessage = `🔍 [${level.toUpperCase()}] [${component}] ${message}`;
    console.log(consoleMessage, data);
    
    // Save logs every 10 entries
    if (this.logs.length % 10 === 0) {
      this.saveLogs();
    }
  }

  sanitizeData(data) {
    // Remove sensitive information but keep structure
    if (typeof data !== 'object' || data === null) return data;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && value.length > 50 && 
          (key.includes('token') || key.includes('code') || key.includes('secret'))) {
        sanitized[key] = value.substring(0, 10) + '...[TRUNCATED]';
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  async saveLogs() {
    try {
      const logData = {
        sessionId: this.sessionId,
        startTime: this.startTime,
        endTime: Date.now(),
        duration: Date.now() - this.startTime,
        totalLogs: this.logs.length,
        logs: this.logs
      };

      // Save to localStorage as backup
      localStorage.setItem(`oauth_debug_${this.sessionId}`, JSON.stringify(logData));
      
      // Try to save to server
      await this.saveToServer(logData);
      
    } catch (error) {
      console.error('Failed to save OAuth logs:', error);
    }
  }

  async saveToServer(logData) {
    try {
      // Convert logs to simple TXT format
      const txtContent = this.convertToTxtFormat(logData);
      
      // Save TXT file via worker
      const response = await fetch('https://lucaverse-auth.lucianoaf8.workers.dev/debug/save-txt-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: txtContent
      });
      
      if (!response.ok) {
        console.warn('Could not save TXT logs to server:', response.status);
      } else {
        console.log('✅ OAuth logs saved as TXT file');
      }
    } catch (error) {
      console.warn('Failed to save TXT logs:', error);
    }
  }

  convertToTxtFormat(logData) {
    const lines = [];
    lines.push('='.repeat(80));
    lines.push(`OAUTH DEBUG LOG - Session ${logData.sessionId}`);
    lines.push(`Started: ${new Date(logData.startTime).toISOString()}`);
    lines.push(`Duration: ${Math.round(logData.duration / 1000)} seconds`);
    lines.push(`Total Entries: ${logData.totalLogs}`);
    lines.push('='.repeat(80));
    lines.push('');

    logData.logs.forEach((log, index) => {
      const timestamp = new Date(log.timestamp).toISOString();
      const relativeTime = `+${Math.round(log.relativeTime / 1000)}s`;
      
      lines.push(`[${index + 1}] ${timestamp} (${relativeTime}) [${log.level.toUpperCase()}] [${log.component}]`);
      lines.push(`    ${log.message}`);
      
      if (Object.keys(log.data).length > 0) {
        lines.push(`    Data: ${JSON.stringify(log.data, null, 2).replace(/\n/g, '\n    ')}`);
      }
      lines.push('');
    });

    return lines.join('\n');
  }

  // Force save all logs immediately
  async forceSave() {
    await this.saveLogs();
  }

  // Export logs as downloadable file
  downloadLogs() {
    const logData = {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime: Date.now(),
      duration: Date.now() - this.startTime,
      totalLogs: this.logs.length,
      logs: this.logs
    };

    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `oauth-debug-${this.sessionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Get all logs from localStorage
  static getAllStoredLogs() {
    const logs = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('oauth_debug_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          logs.push(data);
        } catch (error) {
          console.warn('Failed to parse stored log:', key, error);
        }
      }
    }
    return logs.sort((a, b) => b.startTime - a.startTime);
  }

  // Clean up old logs (keep last 5 sessions)
  static cleanupOldLogs() {
    const allLogs = this.getAllStoredLogs();
    if (allLogs.length > 5) {
      const toDelete = allLogs.slice(5);
      toDelete.forEach(log => {
        localStorage.removeItem(`oauth_debug_${log.sessionId}`);
      });
    }
  }
}

// Global logger instance
export const oauthLogger = new OAuthLogger();

// Convenience methods
export const logOAuth = {
  debug: (component, message, data) => oauthLogger.log('debug', component, message, data),
  info: (component, message, data) => oauthLogger.log('info', component, message, data),
  warn: (component, message, data) => oauthLogger.log('warn', component, message, data),
  error: (component, message, data) => oauthLogger.log('error', component, message, data),
  success: (component, message, data) => oauthLogger.log('success', component, message, data)
};

// Auto-cleanup on page load
OAuthLogger.cleanupOldLogs();

// Force save on page unload
window.addEventListener('beforeunload', () => {
  oauthLogger.forceSave();
});

export default OAuthLogger;