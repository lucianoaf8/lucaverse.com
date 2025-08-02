/**
 * 🧪 LUCAVERSE TEST STUDIO - CHROMIUM MANAGER
 * =========================================
 * Unified browser management with debugging integration
 * Eliminates ALL connection issues
 */

import { spawn } from 'child_process';
import { STUDIO_CONFIG } from '../config/studio-config.js';

export class ChromiumManager {
  constructor() {
    this.config = STUDIO_CONFIG;
    this.process = null;
    this.isRunning = false;
    this.debugConnected = false;
    this.tabs = [];
    this.healthCheckInterval = null;
  }
  
  async launch() {
    try {
      this.log('🟦 Launching Chromium with unified configuration', 'info');
      
      const chromiumConfig = this.config.chromium;
      
      // Check if Chrome/Chromium is available
      if (!chromiumConfig.executable) {
        this.log('⚠️ Chrome/Chromium not found on system', 'warning');
        this.log('📝 GUI will work without browser integration', 'info');
        this.log('💡 Install Chrome or Chromium for full debugging features', 'info');
        this.isRunning = false;
        return false;
      }
      
      const serverUrl = `http://${this.config.server.host}:${this.config.ports.server}`;
      
      // Build complete argument list
      const args = [
        ...chromiumConfig.args,
        serverUrl
      ];
      
      this.log(`🟦 Command: ${chromiumConfig.executable}`, 'info');
      this.log(`🟦 Args: ${args.join(' ')}`, 'info');
      
      // Launch Chromium (only once)
      if (this.isRunning) {
        this.log('⚠️ Chromium already running, skipping launch', 'warning');
        return true;
      }
      
      this.process = spawn(chromiumConfig.executable, args, {
        detached: false,  // Changed to false to prevent detached processes
        stdio: ['ignore', 'ignore', 'pipe']  // Capture stderr for debugging
      });
      
      this.process.on('error', (error) => {
        this.log(`❌ Chromium process error: ${error.message}`, 'error');
        this.isRunning = false;
      });
      
      this.process.on('exit', (code) => {
        this.log(`🟦 Chromium process exited with code: ${code}`, 'info');
        this.isRunning = false;
      });
      
      // Don't unref the process to keep better control
      this.isRunning = true;
      
      this.log('✅ Chromium launched successfully', 'success');
      
      // Wait for debug port to be ready
      await this.waitForDebugPort();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      return true;
      
    } catch (error) {
      this.log(`❌ Failed to launch Chromium: ${error.message}`, 'error');
      this.log('📝 GUI will continue without browser integration', 'info');
      this.isRunning = false;
      return false;
    }
  }
  
  async waitForDebugPort(maxAttempts = 20) {
    this.log('⏳ Waiting for Chromium debug port to be ready...', 'info');
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`http://localhost:${this.config.ports.chromium_debug}/json/version`);
        
        if (response.ok) {
          const versionInfo = await response.json();
          this.debugConnected = true;
          this.log(`✅ Chromium debug port ready: ${versionInfo.Browser}`, 'success');
          
          // Get initial tab information
          await this.updateTabInfo();
          return true;
        }
      } catch (error) {
        // Debug port not ready yet, continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.log('⚠️ Chromium debug port not responding, continuing without debug features', 'warning');
    return false;
  }
  
  async updateTabInfo() {
    try {
      const response = await fetch(`http://localhost:${this.config.ports.chromium_debug}/json`);
      if (response.ok) {
        this.tabs = await response.json();
        this.log(`📊 Found ${this.tabs.length} browser tabs`, 'info');
        return this.tabs;
      }
    } catch (error) {
      this.log(`Warning: Could not fetch tab info: ${error.message}`, 'warning');
    }
    return [];
  }
  
  startHealthMonitoring() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:${this.config.ports.chromium_debug}/json/version`);
        
        if (response.ok && !this.debugConnected) {
          this.debugConnected = true;
          this.log('🔄 Chromium debug connection restored', 'success');
        } else if (!response.ok && this.debugConnected) {
          this.debugConnected = false;
          this.log('⚠️ Chromium debug connection lost', 'warning');
        }
        
        // Update tab information
        await this.updateTabInfo();
        
      } catch (error) {
        if (this.debugConnected) {
          this.debugConnected = false;
          this.log('⚠️ Chromium debug connection lost', 'warning');
        }
      }
    }, 10000); // Check every 10 seconds
  }
  
  getStatus() {
    return {
      isRunning: this.isRunning,
      debugConnected: this.debugConnected,
      tabCount: this.tabs.length,
      profile: this.config.chromium.profile,
      debugPort: this.config.ports.chromium_debug
    };
  }
  
  async getStudioTab() {
    const studioUrl = `http://${this.config.server.host}:${this.config.ports.server}`;
    return this.tabs.find(tab => 
      tab.url && tab.url.startsWith(studioUrl)
    );
  }
  
  async closeTab(tabId) {
    try {
      const response = await fetch(`http://localhost:${this.config.ports.chromium_debug}/json/close/${tabId}`, {
        method: 'GET'
      });
      
      if (response.ok) {
        this.log(`🗑️ Closed tab: ${tabId}`, 'info');
        await this.updateTabInfo();
        return true;
      }
    } catch (error) {
      this.log(`Failed to close tab ${tabId}: ${error.message}`, 'error');
    }
    return false;
  }
  
  async activateTab(tabId) {
    try {
      const response = await fetch(`http://localhost:${this.config.ports.chromium_debug}/json/activate/${tabId}`, {
        method: 'GET'
      });
      
      if (response.ok) {
        this.log(`🎯 Activated tab: ${tabId}`, 'info');
        return true;
      }
    } catch (error) {
      this.log(`Failed to activate tab ${tabId}: ${error.message}`, 'error');
    }
    return false;
  }
  
  stop() {
    this.log('🛑 Stopping Chromium manager', 'info');
    
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // Note: We don't kill the Chromium process intentionally
    // Users might want to keep it running
    this.isRunning = false;
    this.debugConnected = false;
    
    this.log('✅ Chromium manager stopped', 'info');
  }
  
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [CHROMIUM] [${level.toUpperCase()}] ${message}`);
  }
}

export default ChromiumManager;