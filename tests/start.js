#!/usr/bin/env node

/**
 * 🧪 LUCAVERSE TEST STUDIO - SINGLE ENTRY POINT
 * ============================================
 * THE ONLY WAY TO START THE TEST STUDIO
 * Replaces ALL other launchers
 */

import { StudioServer } from './core/server.js';
import { ChromiumManager } from './core/chromium-manager.js';
import { STUDIO_CONFIG, validateConfig } from './config/studio-config.js';

class StudioLauncher {
  constructor() {
    this.server = null;
    this.chromium = null;
    this.shuttingDown = false;
  }
  
  async start() {
    try {
      console.log('🧪 LUCAVERSE TEST STUDIO - UNIFIED LAUNCHER');
      console.log('==========================================');
      console.log('✨ Single entry point - No duplication - Unified architecture\n');
      
      // Validate configuration
      console.log('🔍 Validating unified configuration...');
      validateConfig();
      console.log('✅ Configuration validated\n');
      
      // Kill any existing processes on our ports
      await this.cleanupPorts();
      
      // Start unified server
      console.log('🚀 Step 1: Starting unified server...');
      this.server = new StudioServer();
      await this.server.start();
      console.log('✅ Unified server ready\n');
      
      // Launch Chromium with debug support
      console.log('🟦 Step 2: Launching Chromium with debug integration...');
      this.chromium = new ChromiumManager();
      const chromiumLaunched = await this.chromium.launch();
      
      if (chromiumLaunched) {
        console.log('✅ Chromium launched with debug support\n');
      } else {
        console.log('⚠️ Chromium not available - GUI will work without browser integration\n');
      }
      
      // Final status
      this.showStatus();
      
      // Setup graceful shutdown
      this.setupShutdownHandlers();
      
      console.log('📝 Press Ctrl+C to stop the studio\n');
      
      // Keep process alive
      process.stdin.resume();
      
    } catch (error) {
      console.error(`❌ Failed to start Test Studio: ${error.message}`);
      
      if (error.code === 'EADDRINUSE') {
        console.log('💡 Another process is using the port. Cleaning up...');
        await this.cleanupPorts();
        console.log('🔄 Try running the command again.');
      }
      
      process.exit(1);
    }
  }
  
  async cleanupPorts() {
    const port = STUDIO_CONFIG.ports.server;
    
    try {
      console.log(`🧹 Cleaning up port ${port}...`);
      
      // Try to kill processes on our port
      const { execSync } = await import('child_process');
      try {
        execSync(`npx kill-port ${port}`, { stdio: 'ignore' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ Port cleanup completed');
      } catch (error) {
        console.log('ℹ️  No existing processes found on port');
      }
      
    } catch (error) {
      console.log(`⚠️ Port cleanup warning: ${error.message}`);
    }
  }
  
  showStatus() {
    const config = STUDIO_CONFIG;
    
    console.log('🎯 STUDIO STATUS');
    console.log('================');
    console.log(`🌐 GUI URL:        http://${config.server.host}:${config.ports.server}`);
    console.log(`🔌 WebSocket:      ws://${config.server.host}:${config.ports.server}${config.server.websocket.path}`);
    
    if (config.chromium.executable) {
      console.log(`🟦 Chromium Debug: http://localhost:${config.ports.chromium_debug}`);
      console.log(`📁 Profile:        ${config.chromium.profile}`);
    } else {
      console.log(`🟦 Chromium:       Not available (install Chrome/Chromium for debugging)`);
    }
    console.log('');
    console.log('🧪 AVAILABLE TEST SUITES:');
    Object.entries(config.tests.suites).forEach(([key, suite]) => {
      console.log(`   📋 ${suite.name} (${suite.count} tests)`);
    });
    console.log('');
    console.log('✨ FEATURES ENABLED:');
    Object.entries(config.gui.features).forEach(([feature, enabled]) => {
      console.log(`   ${enabled ? '✅' : '❌'} ${feature.replace('_', ' ')}`);
    });
    console.log('');
  }
  
  setupShutdownHandlers() {
    const shutdown = async (signal) => {
      if (this.shuttingDown) return;
      this.shuttingDown = true;
      
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      
      try {
        // Stop Chromium manager
        if (this.chromium) {
          console.log('🟦 Stopping Chromium manager...');
          this.chromium.stop();
        }
        
        // Stop server
        if (this.server) {
          console.log('🌐 Stopping unified server...');
          await this.server.stop();
        }
        
        console.log('✅ Test Studio shutdown complete');
        process.exit(0);
        
      } catch (error) {
        console.error(`❌ Error during shutdown: ${error.message}`);
        process.exit(1);
      }
    };
    
    // Handle various shutdown signals
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGUSR1', () => shutdown('SIGUSR1'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      shutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  // Handle help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧪 Lucaverse Test Studio - Unified Launcher

USAGE:
  node start.js              Start the complete test studio
  node start.js --help       Show this help message

FEATURES:
  ✨ Single entry point - no confusion
  🔧 Unified configuration - single source of truth  
  🌐 Built-in GUI server with WebSocket support
  🟦 Chromium integration with debugging
  📊 Real-time test monitoring and analytics
  📈 Test history and reporting
  
ARCHITECTURE:
  📁 config/studio-config.js  - Single source of truth
  🚀 core/server.js           - Unified server (GUI + WebSocket)
  🟦 core/chromium-manager.js - Browser management
  🧪 core/test-runner.js      - Unified test execution
  
URL:
  http://localhost:${STUDIO_CONFIG.ports.server}
`);
    process.exit(0);
  }
  
  // Start the studio
  const launcher = new StudioLauncher();
  await launcher.start();
}

// Export for testing
export { StudioLauncher };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Startup failed:', error.message);
    process.exit(1);
  });
}