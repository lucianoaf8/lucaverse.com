/**
 * 🧪 LUCAVERSE TEST STUDIO - UNIFIED CONFIGURATION
 * ============================================
 * SINGLE SOURCE OF TRUTH FOR ALL SETTINGS
 * Every module MUST import this configuration
 * NO hardcoded values anywhere else
 */

// Function to detect available Chrome/Chromium executable
function detectChromiumExecutable() {
  try {
    const { execSync } = require('child_process');
    
    if (process.platform === 'win32') {
      const windowsPaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Users\\%USERNAME%\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
      ];
      
      for (const path of windowsPaths) {
        try {
          execSync(`if exist "${path}" echo found`, { stdio: 'pipe', timeout: 5000 });
          return path;
        } catch (e) {
          continue;
        }
      }
      return null;
    } else {
      // Linux/macOS - Use simpler detection to avoid WSL issues
      const candidates = [
        'google-chrome',
        'chromium-browser',
        'chromium'
      ];
      
      for (const candidate of candidates) {
        try {
          execSync(`which ${candidate}`, { stdio: 'pipe', timeout: 3000 });
          return candidate;
        } catch (e) {
          continue;
        }
      }
      return null;
    }
  } catch (error) {
    console.log('Warning: Chrome detection failed, running without browser integration');
    return null;
  }
}

export const STUDIO_CONFIG = {
  // ===== NETWORK CONFIGURATION =====
  ports: {
    server: 8090,           // Main server (GUI + WebSocket)
    chromium_debug: 9222    // Chromium remote debugging
  },
  
  // ===== CHROMIUM CONFIGURATION =====
  chromium: {
    executable: null, // Temporarily disabled to prevent browser spam
    // executable: detectChromiumExecutable(), // Re-enable when Chrome detection is fixed
    profile: 'Profile 7',
    autoLaunch: false, // Disable auto-launch for now
    args: [
      '--profile-directory=Profile 7',
      '--remote-debugging-port=9222',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  },
  
  // ===== TEST SUITE CONFIGURATION =====
  tests: {
    suites: {
      unit: {
        name: 'Unit Tests',
        directory: 'unit-tests',
        pattern: '**/*.test.{js,jsx}',
        runner: 'vitest',
        count: 15
      },
      gui: {
        name: 'GUI Tests', 
        directory: 'gui-tests',
        pattern: '**/*.spec.js',
        runner: 'playwright',
        count: 40
      },
      integration: {
        name: 'Integration Tests',
        directory: 'integration-tests', 
        pattern: '**/*.spec.js',
        runner: 'playwright',
        count: 12
      },
      oauth: {
        name: 'OAuth Tests',
        directory: 'gui-tests',
        pattern: '**/oauth*.spec.js',
        runner: 'playwright',
        count: 25
      }
    },
    timeout: 30000,
    retries: 2,
    parallel: false
  },
  
  // ===== SERVER CONFIGURATION =====
  server: {
    host: 'localhost',
    static_files: {
      '/': './gui/index.html',
      '/studio.js': './gui/studio.js', 
      '/styles.css': './gui/styles.css'
    },
    websocket: {
      path: '/ws',
      heartbeat_interval: 30000,
      reconnect_attempts: 5,
      reconnect_delay: 3000
    }
  },
  
  // ===== GUI CONFIGURATION =====
  gui: {
    title: '🧪 Lucaverse Test Studio',
    theme: 'dark',
    features: {
      charts: true,
      history: true,
      export: true,
      chromium_integration: true
    },
    charts: {
      library: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js'
    }
  },
  
  // ===== LOGGING CONFIGURATION =====
  logging: {
    level: 'info',
    format: 'timestamp',
    outputs: ['console', 'websocket']
  },
  
  // ===== PERFORMANCE CONFIGURATION =====
  performance: {
    metrics_retention: 50,
    history_retention: 50,
    chart_data_points: 10
  }
};

// Validation function to ensure configuration integrity
export function validateConfig() {
  const required = [
    'ports.server',
    'ports.chromium_debug', 
    'chromium.executable',
    'chromium.profile',
    'tests.suites'
  ];
  
  for (const path of required) {
    const value = path.split('.').reduce((obj, key) => obj?.[key], STUDIO_CONFIG);
    if (value === undefined) {
      throw new Error(`Missing required configuration: ${path}`);
    }
  }
  
  return true;
}

// Helper functions for easy access
export const getPort = (type) => STUDIO_CONFIG.ports[type];
export const getChromiumConfig = () => STUDIO_CONFIG.chromium;
export const getTestSuites = () => STUDIO_CONFIG.tests.suites;
export const getServerConfig = () => STUDIO_CONFIG.server;

console.log('✅ Studio configuration loaded - Single source of truth established');