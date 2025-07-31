/**
 * OAuth Flow Test Suite - Main Testing Framework
 * 
 * This is the primary OAuth authentication flow test suite that validates:
 * 1. Site navigation and login button functionality
 * 2. Google OAuth popup handling and interaction
 * 3. Cross-origin message communication
 * 4. Authentication state validation
 * 5. Dashboard redirect verification
 * 
 * Uses Puppeteer for browser automation with comprehensive logging and screenshot capture.
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class OAuthFlowTester {
  constructor(options = {}) {
    this.options = {
      headless: options.headless !== false, // Default to headless
      slowMo: options.slowMo || 100,
      timeout: options.timeout || 30000,
      screenshotOnError: options.screenshotOnError !== false,
      baseUrl: options.baseUrl || 'https://lucaverse.com',
      workerUrl: options.workerUrl || 'https://lucaverse-auth.lucianoaf8.workers.dev',
      screenshotDir: options.screenshotDir || path.join(__dirname, '../screenshots'),
      ...options
    };
    
    this.browser = null;
    this.page = null;
    this.popup = null;
    this.testResults = [];
    this.networkRequests = [];
    this.consoleMessages = [];
    this.currentTestName = '';
  }

  /**
   * Initialize the testing environment
   */
  async initialize() {
    console.log('🚀 Initializing OAuth Flow Tester...');
    
    // Ensure screenshot directory exists
    await this.ensureDirectoryExists(this.options.screenshotDir);
    
    // Launch browser with specific configuration for OAuth testing
    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      slowMo: this.options.slowMo,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security', // Allow cross-origin for OAuth testing
        '--disable-features=VizDisplayCompositor'
      ],
      defaultViewport: {
        width: 1280,
        height: 720
      }
    });

    // Create main page
    this.page = await this.browser.newPage();
    
    // Set longer timeout for OAuth operations
    this.page.setDefaultTimeout(this.options.timeout);
    this.page.setDefaultNavigationTimeout(this.options.timeout);

    // Setup comprehensive monitoring
    await this.setupMonitoring();
    
    console.log('✅ OAuth Flow Tester initialized successfully');
  }

  /**
   * Setup comprehensive monitoring for network requests, console messages, and errors
   */
  async setupMonitoring() {
    // Monitor network requests
    await this.page.setRequestInterception(true);
    
    this.page.on('request', (request) => {
      this.networkRequests.push({
        timestamp: new Date().toISOString(),
        type: 'request',
        method: request.method(),
        url: request.url(),
        headers: request.headers(),
        resourceType: request.resourceType()
      });
      request.continue();
    });

    this.page.on('response', (response) => {
      this.networkRequests.push({
        timestamp: new Date().toISOString(),
        type: 'response',
        status: response.status(),
        url: response.url(),
        headers: response.headers()
      });
    });

    // Monitor console messages
    this.page.on('console', (message) => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        type: message.type(),
        text: message.text(),
        location: message.location()
      };
      
      this.consoleMessages.push(logEntry);
      
      // Log important messages to console
      if (message.type() === 'error' || message.text().includes('OAuth') || message.text().includes('🎯')) {
        console.log(`📝 Console ${logEntry.type.toUpperCase()}: ${logEntry.text}`);
      }
    });

    // Monitor page errors
    this.page.on('pageerror', (error) => {
      console.error('💥 Page Error:', error.message);
      this.consoleMessages.push({
        timestamp: new Date().toISOString(),
        type: 'pageerror',
        text: error.message,
        stack: error.stack
      });
    });

    // Monitor popup creation
    this.browser.on('targetcreated', async (target) => {
      if (target.type() === 'page') {
        console.log('🪟 New popup window detected:', target.url());
        
        try {
          this.popup = await target.page();
          await this.setupPopupMonitoring();
        } catch (error) {
          console.error('❌ Failed to setup popup monitoring:', error.message);
        }
      }
    });
  }

  /**
   * Setup monitoring for OAuth popup window
   */
  async setupPopupMonitoring() {
    if (!this.popup) return;

    console.log('🔍 Setting up popup monitoring...');

    // Monitor popup console messages
    this.popup.on('console', (message) => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        source: 'popup',
        type: message.type(),
        text: message.text(),
        location: message.location()
      };
      
      this.consoleMessages.push(logEntry);
      console.log(`🪟 Popup Console ${logEntry.type.toUpperCase()}: ${logEntry.text}`);
    });

    // Monitor popup errors
    this.popup.on('pageerror', (error) => {
      console.error('💥 Popup Error:', error.message);
      this.consoleMessages.push({
        timestamp: new Date().toISOString(),
        source: 'popup',
        type: 'pageerror',
        text: error.message,
        stack: error.stack
      });
    });

    // Monitor popup close
    this.popup.on('close', () => {
      console.log('🚪 Popup window closed');
      this.popup = null;
    });
  }

  /**
   * Run the complete OAuth flow test
   */
  async runCompleteTest() {
    console.log('🎯 Starting Complete OAuth Flow Test');
    const testStartTime = Date.now();
    
    try {
      // Test 1: Navigate to site and validate initial state
      await this.testStep('Site Navigation', async () => {
        await this.navigateToSite();
        await this.validateInitialState();
      });

      // Test 2: Navigate to login page
      await this.testStep('Login Navigation', async () => {
        await this.navigateToLogin();
        await this.validateLoginPage();
      });

      // Test 3: Initiate OAuth flow
      await this.testStep('OAuth Initiation', async () => {
        await this.initiateGoogleOAuth();
        await this.validatePopupCreation();
      });

      // Test 4: Handle OAuth popup
      await this.testStep('OAuth Popup Handling', async () => {
        await this.handleOAuthPopup();
        await this.monitorOAuthFlow();
      });

      // Test 5: Validate authentication completion
      await this.testStep('Authentication Validation', async () => {
        await this.validateAuthenticationComplete();
        await this.validateDashboardRedirect();
      });

      const testDuration = Date.now() - testStartTime;
      console.log(`✅ Complete OAuth Flow Test completed in ${testDuration}ms`);
      
      return this.generateTestReport();

    } catch (error) {
      console.error('💥 OAuth Flow Test failed:', error.message);
      
      if (this.options.screenshotOnError) {
        await this.captureErrorScreenshots(error);
      }
      
      throw error;
    }
  }

  /**
   * Execute a test step with proper error handling and logging
   */
  async testStep(stepName, testFunction) {
    this.currentTestName = stepName;
    console.log(`\n🔄 Starting test step: ${stepName}`);
    
    const stepStartTime = Date.now();
    
    try {
      await testFunction();
      
      const stepDuration = Date.now() - stepStartTime;
      console.log(`✅ Test step "${stepName}" completed in ${stepDuration}ms`);
      
      this.testResults.push({
        name: stepName,
        status: 'passed',
        duration: stepDuration,
        timestamp: new Date().toISOString()
      });
      
      // Capture success screenshot
      await this.captureScreenshot(`${stepName}_success`);
      
    } catch (error) {
      const stepDuration = Date.now() - stepStartTime;
      console.error(`❌ Test step "${stepName}" failed after ${stepDuration}ms:`, error.message);
      
      this.testResults.push({
        name: stepName,
        status: 'failed',
        duration: stepDuration,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      // Capture failure screenshot
      await this.captureScreenshot(`${stepName}_failure`);
      
      throw error;
    }
  }

  /**
   * Navigate to the main site
   */
  async navigateToSite() {
    console.log(`🌐 Navigating to ${this.options.baseUrl}...`);
    
    const response = await this.page.goto(this.options.baseUrl, {
      waitUntil: 'networkidle2',
      timeout: this.options.timeout
    });
    
    if (!response.ok()) {
      throw new Error(`Failed to load site: ${response.status()} ${response.statusText()}`);
    }
    
    console.log('✅ Site loaded successfully');
    await this.captureScreenshot('site_loaded');
  }

  /**
   * Validate initial site state
   */
  async validateInitialState() {
    console.log('🔍 Validating initial site state...');
    
    // Wait for site to be fully loaded
    await this.page.waitForSelector('body', { timeout: 10000 });
    
    // Check if React app is loaded
    await this.page.waitForFunction(
      () => window.React || document.querySelector('[data-reactroot]') || document.querySelector('#root'),
      { timeout: 15000 }
    );
    
    const title = await this.page.title();
    console.log(`📄 Page title: ${title}`);
    
    const url = this.page.url();
    console.log(`🔗 Current URL: ${url}`);
    
    // Validate that the site loaded correctly
    const hasContent = await this.page.evaluate(() => {
      return document.body.textContent.trim().length > 0;
    });
    
    if (!hasContent) {
      throw new Error('Site appears to be empty or not loaded properly');
    }
    
    console.log('✅ Initial site state validated');
  }

  /**
   * Navigate to login page
   */
  async navigateToLogin() {
    console.log('🔐 Navigating to login page...');
    
    // Try hash-based navigation first (since it's a React SPA)
    const loginUrl = `${this.options.baseUrl}#login`;
    console.log(`🔗 Navigating to: ${loginUrl}`);
    
    await this.page.goto(loginUrl, {
      waitUntil: 'networkidle2',
      timeout: this.options.timeout
    });
    
    // Wait for login page to load
    await this.page.waitForTimeout(2000);
    
    console.log('✅ Login navigation completed');
    await this.captureScreenshot('login_page_loaded');
  }

  /**
   * Validate login page is properly loaded
   */
  async validateLoginPage() {
    console.log('🔍 Validating login page...');
    
    // Wait for login page elements to be present
    const loginElements = [
      'text="Continue with Google"',
      'text="Enter the"',
      'text="Lucaverse"'
    ];
    
    for (const selector of loginElements) {
      try {
        await this.page.waitForSelector(selector, { timeout: 10000 });
        console.log(`✅ Found element: ${selector}`);
      } catch (error) {
        console.warn(`⚠️ Element not found: ${selector}`);
      }
    }
    
    // Check if Google login button is present and clickable
    const googleButton = await this.page.$('[data-testid="google-login"], button:has-text("Continue with Google"), button[class*="loginButton"]');
    
    if (!googleButton) {
      // Try alternative selectors
      const alternativeSelectors = [
        'button:has-text("Google")',
        '[class*="google"]',
        'button[onclick*="Google"]',
        'button[onclick*="handleLogin"]'
      ];
      
      let found = false;
      for (const selector of alternativeSelectors) {
        const element = await this.page.$(selector);
        if (element) {
          console.log(`✅ Found Google button with selector: ${selector}`);
          found = true;
          break;
        }
      }
      
      if (!found) {
        throw new Error('Google login button not found on login page');
      }
    } else {
      console.log('✅ Google login button found and ready');
    }
    
    await this.captureScreenshot('login_page_validated');
  }

  /**
   * Initiate Google OAuth flow
   */
  async initiateGoogleOAuth() {
    console.log('🔑 Initiating Google OAuth flow...');
    
    // Find and click the Google login button
    const googleButtonSelectors = [
      'button:has-text("Continue with Google")',
      'button:has-text("Google")',
      '[data-testid="google-login"]',
      'button[class*="loginButton"]',
      'button[onclick*="Google"]',
      'button[onclick*="handleLogin"]'
    ];
    
    let googleButton = null;
    for (const selector of googleButtonSelectors) {
      try {
        googleButton = await this.page.$(selector);
        if (googleButton) {
          console.log(`✅ Found Google button with selector: ${selector}`);
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!googleButton) {
      throw new Error('Could not find Google login button');
    }
    
    // Wait for any loading states to complete
    await this.page.waitForTimeout(1000);
    
    console.log('🖱️ Clicking Google login button...');
    
    // Click the button and wait for popup
    const [popup] = await Promise.all([
      new Promise(resolve => {
        this.browser.once('targetcreated', async target => {
          if (target.type() === 'page') {
            console.log('🪟 Popup detected!');
            resolve(await target.page());
          }
        });
        
        // Timeout fallback
        setTimeout(() => resolve(null), 10000);
      }),
      googleButton.click()
    ]);
    
    if (popup) {
      this.popup = popup;
      console.log('✅ OAuth popup created successfully');
    } else {
      throw new Error('OAuth popup was not created - possibly blocked');
    }
    
    await this.captureScreenshot('oauth_initiated');
  }

  /**
   * Validate popup creation
   */
  async validatePopupCreation() {
    console.log('🔍 Validating popup creation...');
    
    if (!this.popup) {
      throw new Error('OAuth popup was not created');
    }
    
    // Wait for popup to load
    await this.popup.waitForLoadState('networkidle', { timeout: this.options.timeout });
    
    const popupUrl = this.popup.url();
    console.log(`🔗 Popup URL: ${popupUrl}`);
    
    // Validate popup URL is correct
    if (!popupUrl.includes('accounts.google.com') && !popupUrl.includes('lucaverse-auth')) {
      console.warn(`⚠️ Unexpected popup URL: ${popupUrl}`);
    }
    
    // Take screenshot of popup
    await this.capturePopupScreenshot('popup_created');
    
    console.log('✅ Popup creation validated');
  }

  /**
   * Handle OAuth popup interactions
   */
  async handleOAuthPopup() {
    if (!this.popup) {
      throw new Error('No popup available for OAuth handling');
    }
    
    console.log('🔄 Handling OAuth popup...');
    
    const popupUrl = this.popup.url();
    console.log(`🔗 Current popup URL: ${popupUrl}`);
    
    // Check if popup is showing Google OAuth page
    if (popupUrl.includes('accounts.google.com')) {
      console.log('🔍 Google OAuth page detected');
      await this.handleGoogleOAuthPage();
    } 
    // Check if popup is showing our worker's response
    else if (popupUrl.includes('lucaverse-auth')) {
      console.log('🔍 Auth worker response page detected');
      await this.handleWorkerResponsePage();
    }
    else {
      console.warn(`⚠️ Unexpected popup content: ${popupUrl}`);
      await this.capturePopupScreenshot('unexpected_popup_content');
    }
  }

  /**
   * Handle Google OAuth page in popup
   */
  async handleGoogleOAuthPage() {
    console.log('🔍 Handling Google OAuth page...');
    
    try {
      // Wait for Google OAuth page to load
      await this.popup.waitForSelector('body', { timeout: 10000 });
      await this.capturePopupScreenshot('google_oauth_page');
      
      // Look for email selection or login elements
      const emailSelectors = [
        '[data-identifier]', // Google email selection
        'input[type="email"]',
        '[jscontroller="pxq3x"]', // Google account selector
        '.BHzsHc' // Account selection container
      ];
      
      for (const selector of emailSelectors) {
        try {
          const element = await this.popup.$(selector);
          if (element) {
            console.log(`✅ Found OAuth element: ${selector}`);
            await this.capturePopupScreenshot('oauth_element_found');
            break;
          }
        } catch (error) {
          // Continue to next selector
        }
      }
      
      // Monitor for OAuth completion (popup navigation to callback)
      await this.monitorPopupNavigation();
      
    } catch (error) {
      console.error('❌ Error handling Google OAuth page:', error.message);
      await this.capturePopupScreenshot('google_oauth_error');
      throw error;
    }
  }

  /**
   * Handle worker response page in popup
   */
  async handleWorkerResponsePage() {
    console.log('🔍 Handling auth worker response page...');
    
    try {
      // Wait for worker response page to load
      await this.popup.waitForSelector('body', { timeout: 5000 });
      await this.capturePopupScreenshot('worker_response_page');
      
      // Check page content for success or error indicators
      const pageContent = await this.popup.evaluate(() => {
        return {
          title: document.title,
          body: document.body.textContent,
          url: window.location.href
        };
      });
      
      console.log('📄 Worker response page content:', pageContent);
      
      // Look for success or error indicators
      if (pageContent.body.includes('Authentication successful') || 
          pageContent.body.includes('successful')) {
        console.log('✅ Authentication success page detected');
      } else if (pageContent.body.includes('Authentication failed') || 
                 pageContent.body.includes('error')) {
        console.log('❌ Authentication error page detected');
      }
      
      // Monitor popup close
      await this.monitorPopupClose();
      
    } catch (error) {
      console.error('❌ Error handling worker response page:', error.message);
      await this.capturePopupScreenshot('worker_response_error');
      throw error;
    }
  }

  /**
   * Monitor popup navigation
   */
  async monitorPopupNavigation() {
    console.log('👀 Monitoring popup navigation...');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Popup navigation monitoring timeout'));
      }, 30000);
      
      const navigationHandler = () => {
        const url = this.popup.url();
        console.log(`🔄 Popup navigated to: ${url}`);
        
        if (url.includes('/auth/google/callback') || url.includes('lucaverse-auth')) {
          console.log('✅ Popup navigated to callback URL');
          clearTimeout(timeout);
          this.popup.off('framenavigated', navigationHandler);
          resolve();
        }
      };
      
      this.popup.on('framenavigated', navigationHandler);
    });
  }

  /**
   * Monitor popup close
   */
  async monitorPopupClose() {
    console.log('👀 Monitoring popup close...');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Popup close monitoring timeout'));
      }, 15000);
      
      const checkClosed = () => {
        if (this.popup.isClosed()) {
          console.log('✅ Popup closed successfully');
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve();
        }
      };
      
      const checkInterval = setInterval(checkClosed, 500);
      checkClosed(); // Initial check
    });
  }

  /**
   * Monitor OAuth flow messages and completion
   */
  async monitorOAuthFlow() {
    console.log('👀 Monitoring OAuth flow completion...');
    
    // Set up message listener on main page
    await this.page.evaluate(() => {
      window.oauthMessages = [];
      
      const messageHandler = (event) => {
        console.log('🎯 OAuth message received:', event.data);
        window.oauthMessages.push({
          timestamp: Date.now(),
          origin: event.origin,
          data: event.data
        });
      };
      
      window.addEventListener('message', messageHandler);
      window.oauthMessageHandler = messageHandler;
    });
    
    // Wait for OAuth completion messages
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const messages = await this.page.evaluate(() => window.oauthMessages || []);
      
      for (const message of messages) {
        console.log('📨 OAuth Flow Message:', message);
        
        if (message.data && message.data.type === 'OAUTH_SUCCESS') {
          console.log('🎉 OAuth success message detected!');
          return { status: 'success', message: message.data };
        } else if (message.data && message.data.type === 'OAUTH_ERROR') {
          console.log('❌ OAuth error message detected!');
          return { status: 'error', message: message.data };
        }
      }
      
      await this.page.waitForTimeout(500);
    }
    
    throw new Error('OAuth flow monitoring timeout - no completion message received');
  }

  /**
   * Validate authentication completion
   */
  async validateAuthenticationComplete() {
    console.log('🔍 Validating authentication completion...');
    
    // Wait a moment for any redirects to complete
    await this.page.waitForTimeout(2000);
    
    const currentUrl = this.page.url();
    console.log(`🔗 Current URL after OAuth: ${currentUrl}`);
    
    // Check if redirected to dashboard
    if (currentUrl.includes('#dashboard') || currentUrl.includes('/dashboard')) {
      console.log('✅ Successfully redirected to dashboard');
    } else {
      console.warn(`⚠️ Not redirected to dashboard. Current URL: ${currentUrl}`);
    }
    
    // Check for authentication cookies or tokens
    const cookies = await this.page.cookies();
    const authCookies = cookies.filter(cookie => 
      cookie.name.includes('auth') || 
      cookie.name.includes('session') ||
      cookie.name.includes('token')
    );
    
    console.log(`🍪 Authentication cookies found: ${authCookies.length}`);
    authCookies.forEach(cookie => {
      console.log(`  - ${cookie.name}: ${cookie.value.substring(0, 20)}...`);
    });
    
    await this.captureScreenshot('authentication_complete');
  }

  /**
   * Validate dashboard redirect
   */
  async validateDashboardRedirect() {
    console.log('🔍 Validating dashboard redirect...');
    
    // Wait for potential redirects
    await this.page.waitForTimeout(3000);
    
    const finalUrl = this.page.url();
    console.log(`🔗 Final URL: ${finalUrl}`);
    
    // Check for dashboard elements or content
    const isDashboard = finalUrl.includes('dashboard') || 
                       await this.page.$('text="Dashboard"') ||
                       await this.page.$('text="Welcome"');
    
    if (isDashboard) {
      console.log('✅ Dashboard redirect validated');
    } else {
      console.warn('⚠️ Dashboard redirect not confirmed');
    }
    
    await this.captureScreenshot('final_state');
  }

  /**
   * Capture screenshot of main page
   */
  async captureScreenshot(name) {
    try {
      const filename = `${Date.now()}_${name}.png`;
      const filepath = path.join(this.options.screenshotDir, filename);
      
      await this.page.screenshot({
        path: filepath,
        fullPage: true
      });
      
      console.log(`📸 Screenshot saved: ${filename}`);
    } catch (error) {
      console.error('❌ Screenshot capture failed:', error.message);
    }
  }

  /**
   * Capture screenshot of popup
   */
  async capturePopupScreenshot(name) {
    if (!this.popup || this.popup.isClosed()) {
      console.log('⚠️ No popup available for screenshot');
      return;
    }
    
    try {
      const filename = `${Date.now()}_popup_${name}.png`;
      const filepath = path.join(this.options.screenshotDir, filename);
      
      await this.popup.screenshot({
        path: filepath,
        fullPage: true
      });
      
      console.log(`📸 Popup screenshot saved: ${filename}`);
    } catch (error) {
      console.error('❌ Popup screenshot capture failed:', error.message);
    }
  }

  /**
   * Capture error screenshots from both main page and popup
   */
  async captureErrorScreenshots(error) {
    console.log('📸 Capturing error screenshots...');
    
    await this.captureScreenshot(`error_${this.currentTestName}`);
    
    if (this.popup && !this.popup.isClosed()) {
      await this.capturePopupScreenshot(`error_${this.currentTestName}`);
    }
  }

  /**
   * Generate comprehensive test report
   */
  async generateTestReport() {
    console.log('📊 Generating test report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      testResults: this.testResults,
      networkRequests: this.networkRequests,
      consoleMessages: this.consoleMessages,
      summary: {
        totalTests: this.testResults.length,
        passed: this.testResults.filter(r => r.status === 'passed').length,
        failed: this.testResults.filter(r => r.status === 'failed').length,
        duration: this.testResults.reduce((sum, r) => sum + r.duration, 0)
      },
      options: this.options
    };
    
    // Save report to file
    const reportPath = path.join(this.options.screenshotDir, `oauth_test_report_${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Test report saved: ${reportPath}`);
    console.log('📈 Test Summary:');
    console.log(`  Total Tests: ${report.summary.totalTests}`);
    console.log(`  Passed: ${report.summary.passed}`);
    console.log(`  Failed: ${report.summary.failed}`);
    console.log(`  Duration: ${report.summary.duration}ms`);
    
    return report;
  }

  /**
   * Ensure directory exists
   */
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`📁 Created directory: ${dirPath}`);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('🧹 Cleaning up test resources...');
    
    if (this.popup && !this.popup.isClosed()) {
      await this.popup.close();
      console.log('✅ Popup closed');
    }
    
    if (this.page && !this.page.isClosed()) {
      await this.page.close();
      console.log('✅ Main page closed');
    }
    
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Browser closed');
    }
  }
}

// Export for use in other test files
module.exports = OAuthFlowTester;

// Run tests if called directly
if (require.main === module) {
  (async () => {
    const tester = new OAuthFlowTester({
      headless: false, // Set to true for CI/CD
      slowMo: 500,     // Slow down for debugging
      timeout: 45000
    });
    
    try {
      await tester.initialize();
      await tester.runCompleteTest();
      console.log('🎉 All OAuth tests completed successfully!');
    } catch (error) {
      console.error('💥 OAuth tests failed:', error.message);
      process.exit(1);
    } finally {
      await tester.cleanup();
    }
  })();
}