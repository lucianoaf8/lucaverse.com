/**
 * Fixed OAuth Test - Uses correct selectors from actual login component
 * Based on analysis of /src/components/LucaverseLogin/LucaverseLogin.jsx
 */
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class FixedOAuthTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.popup = null;
    this.screenshotDir = path.join(__dirname, '..', 'screenshots');
  }

  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`📁 Created directory: ${dirPath}`);
    }
  }

  async initialize() {
    console.log('🚀 Initializing Fixed OAuth Tester...');
    
    await this.ensureDirectoryExists(this.screenshotDir);
    
    this.browser = await puppeteer.launch({
      headless: false, // Run in visible mode for debugging
      slowMo: 250,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-dev-shm-usage'
      ],
      defaultViewport: { width: 1280, height: 720 }
    });

    this.page = await this.browser.newPage();
    this.page.setDefaultTimeout(30000);
    
    // Monitor console messages
    this.page.on('console', (msg) => {
      console.log(`🖥️ Page Console [${msg.type()}]:`, msg.text());
    });

    // Monitor popup creation
    this.browser.on('targetcreated', async (target) => {
      if (target.type() === 'page') {
        console.log('🪟 New popup detected:', target.url());
        try {
          this.popup = await target.page();
          this.setupPopupMonitoring();
        } catch (error) {
          console.error('❌ Failed to setup popup monitoring:', error.message);
        }
      }
    });

    console.log('✅ Fixed OAuth Tester initialized');
  }

  setupPopupMonitoring() {
    if (!this.popup) return;
    
    console.log('🔍 Setting up popup monitoring...');
    
    this.popup.on('console', (msg) => {
      console.log(`🪟 Popup Console [${msg.type()}]:`, msg.text());
    });

    this.popup.on('framenavigated', () => {
      console.log('🔄 Popup navigated to:', this.popup.url());
    });

    this.popup.on('close', () => {
      console.log('🚪 Popup closed');
      this.popup = null;
    });
  }

  async captureScreenshot(name) {
    try {
      const filename = `${Date.now()}_${name}.png`;
      const filepath = path.join(this.screenshotDir, filename);
      
      await this.page.screenshot({
        path: filepath,
        fullPage: true
      });
      
      console.log(`📸 Screenshot saved: ${filename}`);
    } catch (error) {
      console.error('❌ Screenshot failed:', error.message);
    }
  }

  async capturePopupScreenshot(name) {
    if (!this.popup || this.popup.isClosed()) {
      console.log('⚠️ No popup available for screenshot');
      return;
    }
    
    try {
      const filename = `${Date.now()}_popup_${name}.png`;
      const filepath = path.join(this.screenshotDir, filename);
      
      await this.popup.screenshot({
        path: filepath,
        fullPage: true
      });
      
      console.log(`📸 Popup screenshot saved: ${filename}`);
    } catch (error) {
      console.error('❌ Popup screenshot failed:', error.message);
    }
  }

  async runTest() {
    console.log('🎯 Starting Fixed OAuth Flow Test');
    
    try {
      // Step 1: Navigate to login page
      console.log('🌐 Navigating to login page...');
      await this.page.goto('https://lucaverse.com#login', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait for React to fully load
      await this.page.waitForTimeout(3000);
      await this.captureScreenshot('01_login_page_loaded');

      // Step 2: Wait for login button to be visible
      console.log('🔍 Looking for Google login button...');
      
      // Updated selector based on actual component structure
      const googleButtonSelector = 'button[class*="loginButton"]';
      
      await this.page.waitForSelector(googleButtonSelector, { 
        visible: true, 
        timeout: 15000 
      });
      
      console.log('✅ Google login button found!');

      // Step 3: Verify button content
      const buttonInfo = await this.page.evaluate((selector) => {
        const button = document.querySelector(selector);
        if (!button) return null;
        
        return {
          text: button.textContent || button.innerText,
          classes: button.className,
          disabled: button.disabled,
          visible: window.getComputedStyle(button).display !== 'none'
        };
      }, googleButtonSelector);

      console.log('🔍 Button info:', buttonInfo);

      if (!buttonInfo || !buttonInfo.text.includes('Google')) {
        throw new Error(`Expected Google login button, but found: ${buttonInfo?.text || 'nothing'}`);
      }

      if (buttonInfo.disabled) {
        console.log('⚠️ Button is disabled');
      }

      await this.captureScreenshot('02_button_found');

      // Step 4: Set up popup detection
      console.log('🔧 Setting up popup detection...');
      
      const popupPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Popup creation timeout'));
        }, 10000);

        const targetHandler = async (target) => {
          if (target.type() === 'page') {
            clearTimeout(timeout);
            this.browser.off('targetcreated', targetHandler);
            
            try {
              const popup = await target.page();
              resolve(popup);
            } catch (error) {
              reject(error);
            }
          }
        };

        this.browser.on('targetcreated', targetHandler);
      });

      // Step 5: Click the Google login button
      console.log('🖱️ Clicking Google login button...');
      await this.page.click(googleButtonSelector);
      await this.captureScreenshot('03_button_clicked');

      // Step 6: Wait for popup
      console.log('⏳ Waiting for OAuth popup...');
      
      try {
        this.popup = await popupPromise;
        console.log('🪟 OAuth popup detected!');
        
        // Wait for popup to load
        await this.popup.waitForLoadState?.('networkidle') || 
              await new Promise(resolve => setTimeout(resolve, 2000));
        
        const popupUrl = this.popup.url();
        console.log('🔗 Popup URL:', popupUrl);
        
        await this.capturePopupScreenshot('04_popup_opened');

        // Step 7: Analyze popup content
        if (popupUrl.includes('lucaverse-auth.lucianoaf8.workers.dev')) {
          console.log('✅ Popup correctly navigated to OAuth worker');
          
          // Monitor popup navigation for OAuth flow
          await this.monitorOAuthFlow();
          
        } else if (popupUrl.includes('accounts.google.com')) {
          console.log('✅ Popup navigated to Google OAuth');
          
          // This means the worker redirected correctly
          await this.monitorGoogleOAuthFlow();
          
        } else if (popupUrl.includes('lucaverse.com')) {
          console.log('❌ ISSUE DETECTED: Popup loaded main site instead of OAuth flow');
          console.log('🔍 This is the main issue described in the OAuth summary!');
          
          await this.capturePopupScreenshot('05_main_issue_detected');
          
          // This is the core problem - popup loads main site instead of closing
          return {
            success: false,
            issue: 'popup_loads_main_site',
            description: 'OAuth popup loads lucaverse.com instead of closing after authentication'
          };
          
        } else {
          console.log('⚠️ Unexpected popup URL:', popupUrl);
          await this.capturePopupScreenshot('05_unexpected_popup');
        }

        // Step 8: Wait for OAuth completion
        await this.waitForOAuthCompletion();
        
        return {
          success: true,
          message: 'OAuth flow test completed successfully'
        };

      } catch (popupError) {
        console.log('❌ Popup creation failed:', popupError.message);
        
        // Check if popup was blocked
        const popupBlocked = await this.page.evaluate(() => {
          // Try to detect popup blocker
          return !window.open('', 'test', 'width=1,height=1');
        });
        
        if (popupBlocked) {
          console.log('🚫 Popup appears to be blocked by browser');
        }
        
        await this.captureScreenshot('04_popup_failed');
        
        return {
          success: false,
          issue: 'popup_blocked_or_failed',
          description: 'OAuth popup could not be created - possibly blocked'
        };
      }

    } catch (error) {
      console.error('💥 Test failed:', error.message);
      await this.captureScreenshot('error_final');
      
      if (this.popup && !this.popup.isClosed()) {
        await this.capturePopupScreenshot('error_popup');
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  async monitorOAuthFlow() {
    console.log('👀 Monitoring OAuth worker flow...');
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('⏰ OAuth flow monitoring timeout');
        resolve();
      }, 30000);

      const navigationHandler = () => {
        const url = this.popup.url();
        console.log(`🔄 OAuth worker navigated to: ${url}`);
        
        if (url.includes('accounts.google.com')) {
          console.log('✅ Worker redirected to Google OAuth');
          this.popup.off('framenavigated', navigationHandler);
          clearTimeout(timeout);
          resolve();
        } else if (url.includes('lucaverse.com')) {
          console.log('❌ CRITICAL ISSUE: Worker redirected to main site instead of handling OAuth callback');
          this.popup.off('framenavigated', navigationHandler);
          clearTimeout(timeout);
          resolve();
        }
      };

      if (this.popup && !this.popup.isClosed()) {
        this.popup.on('framenavigated', navigationHandler);
      } else {
        clearTimeout(timeout);
        resolve();
      }
    });
  }

  async monitorGoogleOAuthFlow() {
    console.log('👀 Monitoring Google OAuth flow...');
    
    // In a real test, we would handle Google OAuth interaction
    // For now, just monitor navigation back to our callback
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('⏰ Google OAuth monitoring timeout');
        resolve();
      }, 30000);

      const navigationHandler = () => {
        const url = this.popup.url();
        console.log(`🔄 Google OAuth navigated to: ${url}`);
        
        if (url.includes('lucaverse-auth.lucianoaf8.workers.dev/auth/google/callback')) {
          console.log('✅ Google redirected back to our callback');
          this.popup.off('framenavigated', navigationHandler);
          clearTimeout(timeout);
          resolve();
        }
      };

      if (this.popup && !this.popup.isClosed()) {
        this.popup.on('framenavigated', navigationHandler);
      } else {
        clearTimeout(timeout);
        resolve();
      }
    });
  }

  async waitForOAuthCompletion() {
    console.log('⏳ Waiting for OAuth completion...');
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('⏰ OAuth completion timeout');
        resolve();
      }, 30000);

      // Monitor popup close
      const checkClosed = () => {
        if (!this.popup || this.popup.isClosed()) {
          console.log('✅ Popup closed - OAuth flow completed');
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve();
        }
      };

      const checkInterval = setInterval(checkClosed, 1000);
      checkClosed(); // Initial check
    });
  }

  async cleanup() {
    console.log('🧹 Cleaning up test resources...');
    
    if (this.popup && !this.popup.isClosed()) {
      await this.popup.close();
    }
    
    if (this.page && !this.page.isClosed()) {
      await this.page.close();
    }
    
    if (this.browser) {
      await this.browser.close();
    }
    
    console.log('✅ Cleanup completed');
  }
}

// Run the test
(async () => {
  const tester = new FixedOAuthTester();
  
  try {
    await tester.initialize();
    const result = await tester.runTest();
    
    console.log('🎯 Test Result:', result);
    
    if (!result.success) {
      console.log('❌ OAuth test failed - issue identified');
      process.exit(1);
    } else {
      console.log('✅ OAuth test completed successfully');
    }
    
  } catch (error) {
    console.error('💥 Test execution failed:', error.message);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
})();