#!/usr/bin/env node

/**
 * Comprehensive Test Suite Runner for Lucaverse.com
 * Runs all GUI, unit, and integration tests with detailed reporting
 */

import { execSync, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  unit: {
    command: 'npx vitest run',
    description: 'Unit Tests (React Components & OAuth)',
    timeout: 60000
  },
  gui: {
    command: 'npx playwright test --config=./tests/playwright.config.js',
    description: 'GUI Tests (Comprehensive OAuth & UI)',  
    timeout: 300000
  },
  integration: {
    command: 'npx playwright test ./tests/integration-tests --config=./tests/playwright.config.js',
    description: 'Integration Tests (Auth Journey & Full Flow)',
    timeout: 300000
  },
  oauth: {
    command: 'npx playwright test ./tests/gui-tests/07-comprehensive-oauth-authentication.spec.js --config=./tests/playwright.config.js',
    description: 'OAuth Authentication Tests (Comprehensive)',
    timeout: 300000
  },
  login: {
    command: 'npx playwright test ./tests/gui-tests/07-login-page.spec.js --config=./tests/playwright.config.js',
    description: 'Login Page Tests (Navigation & UI)',
    timeout: 300000
  }
};

class TestRunner {
  constructor() {
    this.results = {};
    this.startTime = Date.now();
  }

  async runTestSuite(suiteName, config) {
    console.log(`\n🧪 Running ${config.description}...`);
    console.log(`Command: ${config.command}`);
    console.log('─'.repeat(60));

    const startTime = Date.now();
    
    try {
      // Run the test command
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
      console.log(result);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results[suiteName] = {
        status: 'FAILED',
        duration,
        output: error.stdout || '',
        error: error.stderr || error.message
      };

      console.log(`❌ ${config.description} FAILED (${Math.round(duration/1000)}s)`);
      console.log('STDOUT:', error.stdout);
      console.log('STDERR:', error.stderr);
    }
  }

  async checkDependencies() {
    console.log('🔍 Checking dependencies...');
    
    const dependencies = [
      { cmd: 'npx playwright --version', name: 'Playwright' },
      { cmd: 'npx vitest --version', name: 'Vitest' }
    ];

    for (const dep of dependencies) {
      try {
        const version = execSync(dep.cmd, { encoding: 'utf8', stdio: 'pipe' });
        console.log(`✅ ${dep.name}: ${version.trim()}`);
      } catch (error) {
        console.log(`❌ ${dep.name}: Not found or not working`);
        console.log(`   Error: ${error.message}`);
      }
    }
  }

  async startDevServer() {
    console.log('🚀 Starting development server...');
    
    return new Promise((resolve, reject) => {
      const devProcess = spawn('npm', ['run', 'dev'], {
        stdio: 'pipe',
        cwd: process.cwd()
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
        console.log('Dev server:', output);
        
        if (output.includes('Local:') || output.includes('localhost:5155') || output.includes('ready')) {
          serverReady = true;
          clearTimeout(timeout);
          console.log('✅ Development server is ready');
          resolve(devProcess);
        }
      });

      devProcess.stderr.on('data', (data) => {
        console.log('Dev server error:', data.toString());
      });

      devProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const passed = Object.values(this.results).filter(r => r.status === 'PASSED').length;
    const failed = Object.values(this.results).filter(r => r.status === 'FAILED').length;
    const total = passed + failed;

    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(80));

    Object.entries(this.results).forEach(([suite, result]) => {
      const icon = result.status === 'PASSED' ? '✅' : '❌';
      const duration = Math.round(result.duration / 1000);
      console.log(`${icon} ${suite.toUpperCase()}: ${result.status} (${duration}s)`);
      
      if (result.status === 'FAILED' && result.error) {
        console.log(`   Error: ${result.error.split('\n')[0]}`);
      }
    });

    console.log('\n' + '-'.repeat(40));
    console.log(`📈 Overall: ${passed}/${total} test suites passed`);
    console.log(`⏱️  Total time: ${Math.round(totalDuration / 1000)}s`);

    if (failed > 0) {
      console.log('\n❌ Some tests failed. Check the output above for details.');
      console.log('💡 Tips:');
      console.log('   - Make sure the development server is running');
      console.log('   - Check browser compatibility');
      console.log('   - Verify test data and selectors');
    } else {
      console.log('\n🎉 All tests passed! Great job!');
    }

    // Save detailed report
    this.saveDetailedReport();
  }

  saveDetailedReport() {
    const reportDir = path.join(process.cwd(), 'tests', 'test-results');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      results: this.results,
      summary: {
        total: Object.keys(this.results).length,
        passed: Object.values(this.results).filter(r => r.status === 'PASSED').length,
        failed: Object.values(this.results).filter(r => r.status === 'FAILED').length
      }
    };

    const reportFile = path.join(reportDir, `test-report-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Detailed report saved: ${reportFile}`);
  }

  async run() {
    console.log('🎯 Lucaverse.com Comprehensive Test Suite');
    console.log('==========================================\n');

    // Check dependencies
    await this.checkDependencies();

    // Start development server for E2E tests
    let devProcess = null;
    try {
      devProcess = await this.startDevServer();
      console.log('✅ Development server started successfully');
      
      // Wait a bit for server to fully initialize
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.log('⚠️  Failed to start development server:', error.message);
      console.log('   GUI and Integration tests may fail');
    }

    try {
      // Run all test suites
      for (const [suiteName, config] of Object.entries(TEST_CONFIG)) {
        await this.runTestSuite(suiteName, config);
      }

      // Generate final report
      this.generateReport();

    } finally {
      // Cleanup: Kill development server
      if (devProcess) {
        console.log('\n🛑 Stopping development server...');
        devProcess.kill();
      }
    }

    // Exit with appropriate code
    const hasFailures = Object.values(this.results).some(r => r.status === 'FAILED');
    process.exit(hasFailures ? 1 : 0);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🧪 Lucaverse.com Comprehensive Test Suite Runner

Usage: node run-all-tests.js [options]

Options:
  --help, -h       Show this help message
  --unit-only      Run only unit tests
  --gui-only       Run only GUI/E2E tests  
  --int-only       Run only integration tests
  --oauth-only     Run only OAuth authentication tests
  --login-only     Run only login page tests

Examples:
  node run-all-tests.js                # Run all tests
  node run-all-tests.js --unit-only    # Run only unit tests
  node run-all-tests.js --oauth-only   # Run only OAuth tests
  node run-all-tests.js --gui-only     # Run all GUI tests

Test Types:
  📦 Unit Tests       - React component testing with Vitest (includes OAuth component tests)
  🖥️  GUI Tests        - End-to-end browser testing with Playwright (comprehensive coverage)
  🔄 Integration Tests - Full user authentication journey testing
  🔐 OAuth Tests      - Comprehensive Google OAuth authentication flow testing
  🏠 Login Tests      - Login page navigation, responsiveness, and interaction testing

Authentication Testing Coverage:
  ✅ Google OAuth popup flow with security parameter validation
  ✅ OAuth error handling (access denied, popup blocked, timeouts)
  ✅ Message origin validation and security checks
  ✅ Authentication state management and cleanup
  ✅ Cross-browser OAuth compatibility testing
  ✅ End-to-end authentication user journey
  ✅ Login page responsiveness and accessibility
  ✅ Keyboard navigation and focus management

Reports are saved to: tests/test-results/
  `);
  process.exit(0);
}

// Filter tests based on arguments
if (args.includes('--unit-only')) {
  delete TEST_CONFIG.gui;
  delete TEST_CONFIG.integration;
  delete TEST_CONFIG.oauth;
  delete TEST_CONFIG.login;
}

if (args.includes('--gui-only')) {
  delete TEST_CONFIG.unit;
  delete TEST_CONFIG.integration;
  // Keep oauth and login as they are GUI tests
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

// Run the test suite
const runner = new TestRunner();
runner.run().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});