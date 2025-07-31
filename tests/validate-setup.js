#!/usr/bin/env node

/**
 * Test Setup Validation Script
 * Validates that all testing dependencies and configurations are working correctly
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TestSetupValidator {
  constructor() {
    this.results = [];
    this.errors = [];
  }

  log(message, type = 'info') {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    
    console.log(`${icons[type]} ${message}`);
    
    if (type === 'error') {
      this.errors.push(message);
    }
  }

  async checkFile(filePath, description) {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (fs.existsSync(fullPath)) {
      this.log(`${description}: Found`, 'success');
      return true;
    } else {
      this.log(`${description}: Missing at ${filePath}`, 'error');
      return false;
    }
  }

  async checkCommand(command, description) {
    try {
      execSync(command, { stdio: 'pipe', encoding: 'utf8' });
      this.log(`${description}: Available`, 'success');
      return true;
    } catch (error) {
      this.log(`${description}: Not available or not working`, 'error');
      this.log(`  Command tried: ${command}`, 'info');
      return false;
    }
  }

  async checkTestFiles() {
    this.log('\n🔍 Checking test files...', 'info');

    const testFiles = [
      'tests/playwright.config.js',
      'tests/vitest.config.js', 
      'tests/setup.js',
      'tests/run-all-tests.js',
      'tests/utils/test-helpers.js',
      'tests/gui-tests/01-navigation.spec.js',
      'tests/gui-tests/02-hero-section.spec.js',
      'tests/gui-tests/03-contact-form.spec.js',
      'tests/gui-tests/04-access-request-modal.spec.js',
      'tests/gui-tests/05-projects-section.spec.js',
      'tests/gui-tests/06-custom-gpts-section.spec.js',
      'tests/gui-tests/07-login-page.spec.js',
      'tests/gui-tests/08-responsive-design.spec.js',
      'tests/unit-tests/Header.test.jsx',
      'tests/unit-tests/Contact.test.jsx',
      'tests/integration-tests/form-submission.spec.js',
      'tests/integration-tests/navigation-flow.spec.js'
    ];

    let allFilesExist = true;
    for (const file of testFiles) {
      const exists = await this.checkFile(file, `Test file: ${file}`);
      if (!exists) allFilesExist = false;
    }

    return allFilesExist;
  }

  async checkDependencies() {
    this.log('\n📦 Checking dependencies...', 'info');

    const commands = [
      { cmd: 'npx playwright --version', desc: 'Playwright' },
      { cmd: 'npx vitest --version', desc: 'Vitest' },
      { cmd: 'node --version', desc: 'Node.js' },
      { cmd: 'npm --version', desc: 'npm' }
    ];

    let allDepsAvailable = true;
    for (const { cmd, desc } of commands) {
      const available = await this.checkCommand(cmd, desc);
      if (!available) allDepsAvailable = false;
    }

    return allDepsAvailable;
  }

  async checkPackageJson() {
    this.log('\n📄 Checking package.json scripts...', 'info');

    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const testScripts = [
        'test',
        'test:unit', 
        'test:gui',
        'test:integration'
      ];

      let allScriptsExist = true;
      for (const script of testScripts) {
        if (packageJson.scripts && packageJson.scripts[script]) {
          this.log(`Script "${script}": Found`, 'success');
        } else {
          this.log(`Script "${script}": Missing`, 'error');
          allScriptsExist = false;
        }
      }

      // Check test dependencies
      const testDeps = [
        '@playwright/test',
        'vitest',
        '@testing-library/react',
        '@testing-library/jest-dom',
        '@testing-library/user-event'
      ];

      for (const dep of testDeps) {
        if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
          this.log(`Dependency "${dep}": Found`, 'success');
        } else {
          this.log(`Dependency "${dep}": Missing`, 'error');
          allScriptsExist = false;
        }
      }

      return allScriptsExist;
    } catch (error) {
      this.log('Failed to read package.json', 'error');
      return false;
    }
  }

  async checkSourceFiles() {
    this.log('\n🎯 Checking source files for testing...', 'info');

    const sourceFiles = [
      'src/App.jsx',
      'src/components/Header/Header.jsx',
      'src/components/Contact/Contact.jsx',
      'src/components/Hero/Hero.jsx',
      'src/components/Projects/Projects.jsx',
      'src/components/CustomGPTs/CustomGPTs.jsx'
    ];

    let allSourceExists = true;
    for (const file of sourceFiles) {
      const exists = await this.checkFile(file, `Source file: ${file}`);
      if (!exists) allSourceExists = false;
    }

    return allSourceExists;
  }

  async runQuickTests() {
    this.log('\n🧪 Running quick validation tests...', 'info');

    try {
      // Test Vitest can run
      this.log('Testing Vitest configuration...', 'info');
      execSync('npx vitest --version', { stdio: 'pipe' });
      
      // Test Playwright can run
      this.log('Testing Playwright configuration...', 'info');
      execSync('npx playwright --version', { stdio: 'pipe' });

      this.log('Quick tests passed', 'success');
      return true;
    } catch (error) {
      this.log('Quick tests failed', 'error');
      this.log(`Error: ${error.message}`, 'info');
      return false;
    }
  }

  async generateReport() {
    const hasErrors = this.errors.length > 0;
    
    this.log('\n' + '='.repeat(60), 'info');
    this.log('🎯 TEST SETUP VALIDATION RESULTS', 'info');
    this.log('='.repeat(60), 'info');

    if (hasErrors) {
      this.log(`❌ Found ${this.errors.length} issues:`, 'error');
      this.errors.forEach((error, index) => {
        this.log(`   ${index + 1}. ${error}`, 'info');
      });

      this.log('\n💡 Suggested fixes:', 'info');
      this.log('   1. Run: npm install', 'info');
      this.log('   2. Run: npx playwright install', 'info');
      this.log('   3. Verify all test files are present', 'info');
      this.log('   4. Check that dependencies are correctly installed', 'info');
    } else {
      this.log('🎉 All checks passed! Test setup is ready.', 'success');
      this.log('\n🚀 You can now run:', 'info');
      this.log('   npm test              - Run all tests', 'info');
      this.log('   npm run test:unit     - Run unit tests only', 'info');
      this.log('   npm run test:gui      - Run GUI tests only', 'info');
      this.log('   npm run test:integration - Run integration tests only', 'info');
    }

    return !hasErrors;
  }

  async validate() {
    this.log('🔧 Lucaverse.com Test Setup Validator', 'info');
    this.log('=====================================\n', 'info');

    const checks = [
      await this.checkDependencies(),
      await this.checkPackageJson(),
      await this.checkTestFiles(),
      await this.checkSourceFiles(),
      await this.runQuickTests()
    ];

    const allPassed = await this.generateReport();
    
    process.exit(allPassed ? 0 : 1);
  }
}

// Run validation
const validator = new TestSetupValidator();
validator.validate().catch(error => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});