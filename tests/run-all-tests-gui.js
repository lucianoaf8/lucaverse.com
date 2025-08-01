#!/usr/bin/env node

/**
 * 🧪 Enhanced Test Suite Runner with GUI for Lucaverse.com
 * Features: Real-time GUI, WebSocket communication, comprehensive reporting
 */

import { execSync, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
// Using WHATWG URL API instead of deprecated url.parse

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  unit: {
    command: 'npx vitest run',
    description: 'Unit Tests (React Components & OAuth)',
    timeout: 60000,
    testCount: 15
  },
  gui: {
    command: 'npx playwright test --config=./tests/playwright.config.js',
    description: 'GUI Tests (Comprehensive OAuth & UI)',  
    timeout: 300000,
    testCount: 40
  },
  integration: {
    command: 'npx playwright test ./tests/integration-tests --config=./tests/playwright.config.js',
    description: 'Integration Tests (Auth Journey & Full Flow)',
    timeout: 300000,
    testCount: 12
  },
  oauth: {
    command: 'npx playwright test ./tests/gui-tests/07-comprehensive-oauth-authentication.spec.js --config=./tests/playwright.config.js',
    description: 'OAuth Authentication Tests (Comprehensive)',
    timeout: 300000,
    testCount: 25
  },
  login: {
    command: 'npx playwright test ./tests/gui-tests/07-login-page.spec.js --config=./tests/playwright.config.js',
    description: 'Login Page Tests (Navigation & UI)',
    timeout: 300000,
    testCount: 20
  }
};

class EnhancedTestRunner {
  constructor() {
    this.results = {};
    this.startTime = Date.now();
    this.wss = null;
    this.clients = new Set();
    this.httpServer = null;
    this.devProcess = null;
    this.reportDir = path.join(__dirname, 'test-reports');
    
    // Ensure reports directory exists
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  async startWebServer() {
    return new Promise((resolve, reject) => {
      // Create HTTP server to serve the GUI
      this.httpServer = createServer((req, res) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;
        
        let filePath;
        if (pathname === '/' || pathname === '/index.html') {
          filePath = path.join(__dirname, 'test-runner-gui.html');
        } else if (pathname === '/test-runner-styles.css') {
          filePath = path.join(__dirname, 'test-runner-styles.css');
        } else if (pathname === '/test-runner-script.js') {
          filePath = path.join(__dirname, 'test-runner-script.js');
        } else if (pathname === '/favicon.ico') {
          res.writeHead(204); // No content
          res.end();
          return;
        } else {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }

        try {
          const content = fs.readFileSync(filePath);
          const ext = path.extname(filePath);
          let contentType = 'text/html';
          
          if (ext === '.css') contentType = 'text/css';
          if (ext === '.js') contentType = 'application/javascript';
          
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content);
        } catch (error) {
          res.writeHead(500);
          res.end('Server Error');
        }
      });

      // Create WebSocket server
      this.wss = new WebSocketServer({ server: this.httpServer });
      
      this.wss.on('connection', (ws) => {
        this.clients.add(ws);
        console.log('📱 GUI client connected');
        
        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message);
            this.handleClientMessage(data, ws);
          } catch (error) {
            console.error('❌ Invalid message from client:', error);
          }
        });
        
        ws.on('close', () => {
          this.clients.delete(ws);
          console.log('📱 GUI client disconnected');
        });
      });

      this.httpServer.listen(8090, () => {
        console.log('🌐 Test Runner GUI server started at http://localhost:8090');
        resolve();
      });

      this.httpServer.on('error', reject);
    });
  }

  handleClientMessage(data, ws) {
    switch (data.type) {
      case 'start-tests':
        this.runSelectedTests(data.suites);
        break;
      case 'stop-tests':
        this.stopTests();
        break;
    }
  }

  broadcastToClients(message) {
    const data = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(data);
      }
    });
  }

  async runSelectedTests(selectedSuites) {
    console.log('\n🎯 Starting GUI-controlled test execution...');
    this.broadcastToClients({ type: 'log', message: 'Starting test execution...', level: 'info' });

    try {
      // Start development server if needed
      this.devProcess = await this.startDevServer();
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Run each selected test suite
      for (const suiteName of selectedSuites) {
        if (TEST_CONFIG[suiteName]) {
          await this.runTestSuiteWithGUI(suiteName, TEST_CONFIG[suiteName]);
        }
      }

      // Generate and send final report
      const report = this.generateReport();
      this.broadcastToClients({ type: 'final-report', ...report });

    } catch (error) {
      console.error('❌ Test execution failed:', error);
      this.broadcastToClients({ type: 'log', message: `Test execution failed: ${error.message}`, level: 'error' });
    } finally {
      this.cleanup();
    }
  }

  async runTestSuiteWithGUI(suiteName, config) {
    console.log(`\n🧪 Running ${config.description}...`);
    
    this.broadcastToClients({
      type: 'test-suite-start',
      suiteName,
      description: config.description
    });

    this.broadcastToClients({
      type: 'log',
      message: `Starting ${config.description}`,
      level: 'info'
    });

    const startTime = Date.now();
    
    try {
      // Actually run the test command instead of simulating
      console.log(`Executing: ${config.command}`);
      
      this.broadcastToClients({
        type: 'log',
        message: `Executing: ${config.command}`,
        level: 'info'
      });

      // Create a child process to run the actual tests
      const testProcess = spawn('powershell.exe', ['-Command', config.command], {
        cwd: path.dirname(__dirname), // Run from main project directory
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let outputBuffer = '';
      let errorBuffer = '';
      let testsPassed = 0;
      let testsFailed = 0;
      let currentTest = 0;

      // Process stdout
      testProcess.stdout.on('data', (data) => {
        const output = data.toString();
        outputBuffer += output;
        
        // Parse test output for real-time updates
        const lines = output.split('\n');
        for (const line of lines) {
          // Look for test execution patterns
          if (line.includes('✓') || line.includes('✔') || line.includes('PASS')) {
            testsPassed++;
            currentTest++;
            this.broadcastToClients({
              type: 'test-complete',
              testName: `${suiteName}/test-${currentTest}`,
              status: 'passed',
              duration: 100
            });
          } else if (line.includes('✗') || line.includes('✖') || line.includes('FAIL')) {
            testsFailed++;
            currentTest++;
            this.broadcastToClients({
              type: 'test-complete',
              testName: `${suiteName}/test-${currentTest}`,
              status: 'failed',
              duration: 100,
              error: line
            });
          }
          
          // Broadcast log line
          if (line.trim()) {
            this.broadcastToClients({
              type: 'log',
              message: line,
              level: 'info'
            });
          }
        }

        // Update progress
        if (currentTest > 0) {
          this.broadcastToClients({
            type: 'progress',
            completed: currentTest,
            total: config.testCount
          });
        }
      });

      // Process stderr
      testProcess.stderr.on('data', (data) => {
        const error = data.toString();
        errorBuffer += error;
        
        this.broadcastToClients({
          type: 'log',
          message: error,
          level: 'error'
        });
      });

      // Wait for process to complete
      await new Promise((resolve, reject) => {
        testProcess.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Test process exited with code ${code}`));
          }
        });

        testProcess.on('error', reject);

        // Timeout handling
        setTimeout(() => {
          testProcess.kill();
          reject(new Error('Test execution timed out'));
        }, config.timeout);
      });

      const duration = Date.now() - startTime;
      
      this.results[suiteName] = {
        status: testsFailed === 0 ? 'PASSED' : 'FAILED',
        duration,
        testCount: config.testCount,
        output: outputBuffer,
        error: errorBuffer || null,
        actualPassed: testsPassed,
        actualFailed: testsFailed
      };

      this.broadcastToClients({
        type: 'test-suite-complete',
        suiteName,
        duration
      });

      console.log(`${testsFailed === 0 ? '✅' : '❌'} ${config.description} ${testsFailed === 0 ? 'PASSED' : 'FAILED'} (${Math.round(duration/1000)}s)`);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results[suiteName] = {
        status: 'FAILED',
        duration,
        testCount: config.testCount,
        output: error.stdout || '',
        error: error.stderr || error.message
      };

      console.log(`❌ ${config.description} FAILED (${Math.round(duration/1000)}s)`);
      
      this.broadcastToClients({
        type: 'log',
        message: `${config.description} failed: ${error.message}`,
        level: 'error'
      });
    }
  }

  async startDevServer() {
    console.log('🚀 Starting development server...');
    
    return new Promise((resolve, reject) => {
      const devProcess = spawn('powershell.exe', ['-Command', 'npm run dev'], {
        stdio: 'pipe',
        cwd: path.dirname(__dirname) // Go up one level to main project directory
      });

      let serverReady = false;
      const timeout = setTimeout(() => {
        if (!serverReady) {
          devProcess.kill();
          reject(new Error('Development server failed to start within timeout'));
        }
      }, 60000);

      devProcess.stdout.on('data', (data) => {
        const output = data.toString();
        
        if (output.includes('Local:') || output.includes('localhost:5155') || output.includes('ready')) {
          serverReady = true;
          clearTimeout(timeout);
          console.log('✅ Development server is ready');
          resolve(devProcess);
        }
      });

      devProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  stopTests() {
    console.log('🛑 Stopping tests...');
    this.broadcastToClients({ type: 'log', message: 'Tests stopped by user', level: 'warning' });
    this.cleanup();
  }

  cleanup() {
    if (this.devProcess) {
      console.log('🛑 Stopping development server...');
      this.devProcess.kill();
      this.devProcess = null;
    }
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const passed = Object.values(this.results).filter(r => r.status === 'PASSED').length;
    const failed = Object.values(this.results).filter(r => r.status === 'FAILED').length;
    const total = passed + failed;

    const report = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      results: this.results,
      summary: {
        total,
        passed,
        failed,
        successRate: total > 0 ? Math.round((passed / total) * 100) : 0
      }
    };

    // Save to reports directory
    const reportFile = path.join(this.reportDir, `test-report-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Detailed report saved: ${reportFile}`);
    
    return report;
  }

  async runTraditionalMode() {
    console.log('🎯 Lucaverse.com Comprehensive Test Suite');
    console.log('==========================================\n');

    // Start development server for E2E tests
    try {
      this.devProcess = await this.startDevServer();
      console.log('✅ Development server started successfully');
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.log('⚠️  Failed to start development server:', error.message);
    }

    try {
      // Run all test suites
      for (const [suiteName, config] of Object.entries(TEST_CONFIG)) {
        await this.runTestSuite(suiteName, config);
      }

      // Generate final report
      this.generateReport();

    } finally {
      this.cleanup();
    }

    // Exit with appropriate code
    const hasFailures = Object.values(this.results).some(r => r.status === 'FAILED');
    process.exit(hasFailures ? 1 : 0);
  }

  async runTestSuite(suiteName, config) {
    console.log(`\n🧪 Running ${config.description}...`);
    console.log(`Command: ${config.command}`);
    console.log('─'.repeat(60));

    const startTime = Date.now();
    
    try {
      const result = execSync(config.command, {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: process.cwd(),
        timeout: config.timeout,
        encoding: 'utf8'
      });

      const duration = Date.now() - startTime;
      
      this.results[suiteName] = {
        status: 'PASSED',
        duration,
        output: result,
        error: null
      };

      console.log(`✅ ${config.description} PASSED (${Math.round(duration/1000)}s)`);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results[suiteName] = {
        status: 'FAILED',
        duration,
        output: error.stdout || '',
        error: error.stderr || error.message
      };

      console.log(`❌ ${config.description} FAILED (${Math.round(duration/1000)}s)`);
    }
  }

  async run() {
    const args = process.argv.slice(2);
    
    if (args.includes('--gui')) {
      console.log('🖥️  Starting GUI mode...');
      await this.startWebServer();
      console.log('✨ GUI server is ready at http://localhost:8090');
      
      console.log('📝 Press Ctrl+C to stop the server');
      
      // Keep the server running
      process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down...');
        this.cleanup();
        if (this.httpServer) {
          this.httpServer.close();
        }
        process.exit(0);
      });
      
    } else {
      await this.runTraditionalMode();
    }
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🧪 Lucaverse.com Enhanced Test Suite Runner

Usage: node run-all-tests.js [options]

Options:
  --help, -h       Show this help message
  --gui            Start GUI mode with web interface
  --unit-only      Run only unit tests (traditional mode)
  --gui-only       Run only GUI/E2E tests (traditional mode)
  --int-only       Run only integration tests (traditional mode)
  --oauth-only     Run only OAuth authentication tests (traditional mode)
  --login-only     Run only login page tests (traditional mode)

Modes:
  🖥️  GUI Mode        - Interactive web-based test runner with real-time monitoring
  📋 Traditional Mode - Command-line test execution with detailed reporting

GUI Features:
  ✨ Real-time test progress monitoring
  📊 Live test result visualization
  🕒 Individual test timing
  📋 Live logs and error reporting
  🌑 Beautiful dark mode interface
  📄 Detailed report generation
  🎯 Selective test suite execution

Examples:
  node run-all-tests.js --gui          # Start GUI mode
  node run-all-tests.js                # Run all tests (traditional)
  node run-all-tests.js --unit-only    # Run only unit tests
  node run-all-tests.js --oauth-only   # Run only OAuth tests

GUI Access: http://localhost:8090

Test Types:
  📦 Unit Tests       - React component testing with Vitest (15 tests)
  🖥️  GUI Tests        - End-to-end browser testing with Playwright (40 tests)
  🔄 Integration Tests - Full user authentication journey testing (12 tests)
  🔐 OAuth Tests      - Comprehensive Google OAuth authentication flow (25 tests)
  🏠 Login Tests      - Login page navigation and interaction testing (20 tests)

Reports are saved to: tests/test-reports/
  `);
  process.exit(0);
}

// Filter tests based on arguments for traditional mode
if (!args.includes('--gui')) {
  if (args.includes('--unit-only')) {
    delete TEST_CONFIG.gui;
    delete TEST_CONFIG.integration;
    delete TEST_CONFIG.oauth;
    delete TEST_CONFIG.login;
  }

  if (args.includes('--gui-only')) {
    delete TEST_CONFIG.unit;
    delete TEST_CONFIG.integration;
  }

  if (args.includes('--int-only')) {
    delete TEST_CONFIG.unit;
    delete TEST_CONFIG.gui;
    delete TEST_CONFIG.oauth;
    delete TEST_CONFIG.login;
  }

  if (args.includes('--oauth-only')) {
    delete TEST_CONFIG.unit;
    delete TEST_CONFIG.gui;
    delete TEST_CONFIG.integration;
    delete TEST_CONFIG.login;
  }

  if (args.includes('--login-only')) {
    delete TEST_CONFIG.unit;
    delete TEST_CONFIG.gui;
    delete TEST_CONFIG.integration;
    delete TEST_CONFIG.oauth;
  }
}

// Run the enhanced test suite
const runner = new EnhancedTestRunner();
runner.run().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});