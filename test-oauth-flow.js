/**
 * Puppeteer OAuth Flow Validation Script
 * Tests the complete Google OAuth authentication flow
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class OAuthFlowTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.popupPage = null;
    this.results = {
      startTime: new Date().toISOString(),
      tests: [],
      errors: [],
      screenshots: [],
      logs: []
    };
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, type };
    this.results.logs.push(logEntry);
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  }

  async screenshot(name, page = null) {
    try {
      const targetPage = page || this.page;
      const filename = `oauth-test-${name}-${Date.now()}.png`;
      const filepath = path.join(__dirname, 'test-screenshots', filename);
      
      // Ensure screenshots directory exists
      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      await targetPage.screenshot({ 
        path: filepath, 
        fullPage: true 
      });
      
      this.results.screenshots.push({
        name,
        filename,
        filepath,
        url: await targetPage.url(),
        timestamp: new Date().toISOString()
      });
      
      await this.log(`Screenshot saved: ${filename}`);
    } catch (error) {
      await this.log(`Screenshot failed: ${error.message}`, 'error');
    }
  }

  async addTest(name, passed, details = {}) {
    this.results.tests.push({
      name,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    await this.log(`${status}: ${name}`, passed ? 'info' : 'error');
    
    if (!passed && details.error) {
      this.results.errors.push({
        test: name,
        error: details.error,
        timestamp: new Date().toISOString()
      });
    }
  }

  async setup() {
    await this.log('🚀 Starting OAuth flow test');
    
    // Launch browser with debugging
    this.browser = await puppeteer.launch({
      headless: false, // Keep visible for debugging
      devtools: true,
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Set viewport
    await this.page.setViewport({ width: 1280, height: 720 });
    
    // Enable console logging
    this.page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Frontend:') || text.includes('OAuth')) {
        this.log(`Browser Console: ${text}`, 'debug');
      }
    });

    // Enable error logging
    this.page.on('pageerror', (error) => {
      this.log(`Page Error: ${error.message}`, 'error');
    });

    // Enable request/response logging
    this.page.on('request', (request) => {
      if (request.url().includes('lucaverse') || request.url().includes('google')) {
        this.log(`Request: ${request.method()} ${request.url()}`, 'debug');
      }
    });

    this.page.on('response', (response) => {
      if (response.url().includes('lucaverse') || response.url().includes('google')) {
        this.log(`Response: ${response.status()} ${response.url()}`, 'debug');
      }
    });

    await this.log('✅ Browser setup complete');
  }

  async testSiteLoad() {
    await this.log('🌐 Testing site load');
    
    try {
      await this.page.goto('https://lucaverse.com', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      await this.screenshot('01-site-loaded');
      
      const title = await this.page.title();
      await this.addTest('Site loads successfully', title.includes('Lucaverse'), {
        title,
        url: await this.page.url()
      });
      
    } catch (error) {
      await this.addTest('Site loads successfully', false, {
        error: error.message
      });
    }
  }

  async testLoginButtonClick() {
    await this.log('🔘 Testing login button click');
    
    try {
      // Look for the login/enter button
      const enterButton = await this.page.$('a[href="#login"], button:contains("Enter"), .enter-button, .login-button');
      
      if (!enterButton) {
        // Try to find any button that might lead to login
        await this.page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, a, .button'));
          const loginBtn = buttons.find(btn => 
            btn.textContent.toLowerCase().includes('enter') ||
            btn.textContent.toLowerCase().includes('login') ||
            btn.href?.includes('login')
          );
          if (loginBtn) loginBtn.click();
        });
      } else {
        await enterButton.click();
      }
      
      await this.page.waitForTimeout(2000);
      await this.screenshot('02-after-login-click');
      
      // Check if we're now on a login page or if login modal appeared
      const currentUrl = await this.page.url();
      const hasLoginForm = await this.page.$('.login-button, button:contains("Continue with Google")') !== null;
      
      await this.addTest('Login button navigates correctly', 
        currentUrl.includes('login') || hasLoginForm, {
        url: currentUrl,
        hasLoginForm
      });
      
    } catch (error) {
      await this.addTest('Login button navigates correctly', false, {
        error: error.message
      });
    }
  }

  async testGoogleOAuthFlow() {
    await this.log('🔐 Testing Google OAuth flow');
    
    try {
      // Find and click the Google login button
      const googleButton = await this.page.waitForSelector(
        'button:contains("Continue with Google"), .google-login, [class*="google"]', 
        { timeout: 10000 }
      );
      
      if (!googleButton) {
        throw new Error('Google login button not found');
      }
      
      await this.screenshot('03-before-google-click');
      
      // Set up popup detection
      const popupPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Popup did not appear within 10 seconds'));
        }, 10000);
        
        this.page.on('popup', async (popup) => {
          clearTimeout(timeout);
          this.popupPage = popup;
          await this.log('🎉 OAuth popup detected!');
          resolve(popup);
        });
      });
      
      // Click the Google button
      await googleButton.click();
      await this.log('🖱️ Google login button clicked');
      
      // Wait for popup
      await popupPromise;
      await this.screenshot('04-popup-appeared', this.popupPage);
      
      await this.addTest('OAuth popup appears', true, {
        popupUrl: await this.popupPage.url()
      });
      
      // Monitor popup navigation
      await this.monitorPopupFlow();
      
    } catch (error) {
      await this.addTest('Google OAuth flow starts', false, {
        error: error.message
      });
      await this.screenshot('04-oauth-failed');
    }
  }

  async monitorPopupFlow() {
    await this.log('👀 Monitoring popup OAuth flow');
    
    if (!this.popupPage) {
      throw new Error('No popup page to monitor');
    }
    
    let flowCompleted = false;
    let flowTimeout;
    
    // Set up monitoring
    const flowPromise = new Promise((resolve, reject) => {
      flowTimeout = setTimeout(() => {
        reject(new Error('OAuth flow timeout after 60 seconds'));
      }, 60000);
      
      // Monitor popup closure
      this.popupPage.on('close', () => {
        clearTimeout(flowTimeout);
        flowCompleted = true;
        this.log('🚪 Popup closed - OAuth flow completed');
        resolve({ success: true, reason: 'popup_closed' });
      });
      
      // Monitor URL changes
      this.popupPage.on('framenavigated', async (frame) => {
        if (frame === this.popupPage.mainFrame()) {
          const url = frame.url();
          await this.log(`🔄 Popup navigated to: ${url}`);
          await this.screenshot(`05-popup-nav-${Date.now()}`, this.popupPage);
          
          // Check for success/error indicators
          if (url.includes('lucaverse.com') && !url.includes('oauth-callback')) {
            clearTimeout(flowTimeout);
            this.log('❌ Popup unexpectedly navigated to main site');
            resolve({ success: false, reason: 'unexpected_redirect', url });
          }
        }
      });
    });
    
    try {
      const result = await flowPromise;
      
      await this.addTest('OAuth popup flow completes correctly', result.success, {
        reason: result.reason,
        url: result.url
      });
      
      if (!result.success) {
        await this.screenshot('06-oauth-flow-failed', this.popupPage);
      }
      
      // Check main page state after OAuth
      await this.page.waitForTimeout(2000);
      await this.screenshot('07-main-page-after-oauth');
      
      const finalUrl = await this.page.url();
      const isDashboard = finalUrl.includes('dashboard') || finalUrl.includes('#dashboard');
      
      await this.addTest('Main page redirects to dashboard after OAuth', isDashboard, {
        finalUrl,
        expectedDashboard: true
      });
      
    } catch (error) {
      await this.addTest('OAuth popup flow completes correctly', false, {
        error: error.message
      });
      
      if (this.popupPage && !this.popupPage.isClosed()) {
        await this.screenshot('06-oauth-timeout', this.popupPage);
      }
    }
  }

  async generateReport() {
    const endTime = new Date().toISOString();
    const duration = Date.now() - new Date(this.results.startTime).getTime();
    
    const report = {
      ...this.results,
      endTime,
      duration: `${Math.round(duration / 1000)}s`,
      summary: {
        totalTests: this.results.tests.length,
        passed: this.results.tests.filter(t => t.passed).length,
        failed: this.results.tests.filter(t => !t.passed).length,
        errors: this.results.errors.length,
        screenshots: this.results.screenshots.length
      }
    };
    
    const reportPath = path.join(__dirname, `oauth-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    await this.log(`📊 Test report saved: ${reportPath}`);
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('🔍 OAUTH FLOW TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Duration: ${report.summary.duration}`);
    console.log(`Tests: ${report.summary.passed}/${report.summary.totalTests} passed`);
    console.log(`Errors: ${report.summary.errors}`);
    console.log(`Screenshots: ${report.summary.screenshots}`);
    
    if (report.summary.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.tests.filter(t => !t.passed).forEach(test => {
        console.log(`  - ${test.name}: ${test.details.error || 'Unknown error'}`);
      });
    }
    
    if (this.results.errors.length > 0) {
      console.log('\n🚨 ERRORS:');
      this.results.errors.forEach(error => {
        console.log(`  - ${error.test}: ${error.error}`);
      });
    }
    
    console.log(`\n📁 Report: ${reportPath}`);
    console.log('='.repeat(60));
    
    return report;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      await this.log('🧹 Browser closed');
    }
  }

  async run() {
    try {
      await this.setup();
      await this.testSiteLoad();
      await this.testLoginButtonClick();
      await this.testGoogleOAuthFlow();
      
    } catch (error) {
      await this.log(`💥 Critical error: ${error.message}`, 'error');
      this.results.errors.push({
        test: 'Critical Error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      const report = await this.generateReport();
      await this.cleanup();
      return report;
    }
  }
}

// Add contains selector for Puppeteer
const addContainsSelector = `
  (() => {
    if (!window.customSelectors) {
      window.customSelectors = true;
      const originalQuerySelector = document.querySelector;
      const originalQuerySelectorAll = document.querySelectorAll;
      
      function queryByText(selector, root = document) {
        if (selector.includes(':contains(')) {
          const match = selector.match(/(.*?):contains\\(['"](.+?)['"]\\)(.*)/);
          if (match) {
            const [, before, text, after] = match;
            const elements = Array.from(root.querySelectorAll(before + after));
            return elements.find(el => el.textContent.includes(text));
          }
        }
        return originalQuerySelector.call(root, selector);
      }
      
      document.querySelector = queryByText;
    }
  })();
`;

// Run the test
async function main() {
  const tester = new OAuthFlowTester();
  
  // Add custom selectors to pages
  const addSelectors = async (page) => {
    await page.evaluateOnNewDocument(addContainsSelector);
  };
  
  try {
    console.log('🧪 Starting OAuth Flow Validation Test');
    console.log('📝 This will test the complete authentication flow');
    console.log('⚠️  Make sure you have a valid Google account for testing');
    console.log();
    
    const report = await tester.run();
    
    if (report.summary.failed === 0) {
      console.log('🎉 All tests passed! OAuth flow is working correctly.');
      process.exit(0);
    } else {
      console.log('💔 Some tests failed. Check the report for details.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { OAuthFlowTester };