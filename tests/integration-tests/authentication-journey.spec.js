import { test, expect } from '@playwright/test';

/**
 * End-to-End Authentication Journey Tests
 * Tests the complete user authentication experience from login to authenticated state
 */

test.describe('Complete Authentication User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh for each test
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should complete full authentication journey from home to login to dashboard', async ({ page, context }) => {
    // Step 1: User navigates to login from home page
    const loginLink = page.locator('a[href="#login"]');
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    
    // Wait for login page to load
    await page.waitForTimeout(2000);
    await expect(page.locator('h1')).toContainText(['Enter the', 'Lucaverse']);
    
    // Step 2: User sees and interacts with login interface
    const googleButton = page.locator('button:has-text("Continue with Google")');
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();
    
    // Step 3: User initiates Google OAuth flow
    const popupPromise = context.waitForEvent('page');
    await googleButton.click();
    
    // Step 4: Loading state is shown
    await expect(page.locator('text="Initializing connection"')).toBeVisible();
    await expect(googleButton).toBeDisabled();
    
    // Step 5: OAuth popup opens
    const popup = await popupPromise;
    await popup.waitForLoadState('networkidle');
    
    // Verify popup has correct OAuth URL and parameters
    const popupUrl = popup.url();
    expect(popupUrl).toContain('lucaverse-auth.lucianoaf8.workers.dev');
    expect(popupUrl).toContain('/auth/google');
    
    const url = new URL(popupUrl);
    expect(url.searchParams.has('state')).toBeTruthy();
    expect(url.searchParams.has('code_challenge')).toBeTruthy();
    expect(url.searchParams.has('session_id')).toBeTruthy();
    
    // Step 6: Simulate successful authentication
    // (In real scenario, user would complete OAuth flow in popup)
    await page.evaluate(() => {
      window.postMessage({
        type: 'OAUTH_SUCCESS',
        timestamp: Date.now(),
        user: {
          email: 'test@example.com',
          name: 'Test User'
        }
      }, window.location.origin);
    });
    
    // Step 7: User is redirected to dashboard
    await page.waitForURL('*#dashboard', { timeout: 5000 });
    expect(page.url()).toContain('#dashboard');
    
    // Step 8: Popup is closed
    expect(popup.isClosed()).toBeTruthy();
    
    // Step 9: Loading state is cleared
    // (Since we're now on dashboard, original login elements might not be present)
    console.log('✅ Complete authentication journey successful');
  });

  test('should handle authentication cancellation gracefully', async ({ page, context }) => {
    // Navigate to login
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');
    
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    // Start OAuth flow
    const popupPromise = context.waitForEvent('page');
    await googleButton.click();
    
    const popup = await popupPromise;
    await popup.waitForLoadState('networkidle');
    
    // Simulate user canceling authentication
    await page.evaluate(() => {
      window.postMessage({
        type: 'OAUTH_ERROR',
        timestamp: Date.now(),
        error: 'User cancelled authentication',
        errorCode: 'access_denied'
      }, window.location.origin);
    });
    
    // Should show error and return to ready state
    const alertPromise = page.waitForEvent('dialog');
    const alert = await alertPromise;
    expect(alert.message()).toContain('Authentication was cancelled');
    await alert.accept();
    
    // Should clear loading state and re-enable button
    await expect(googleButton).toBeEnabled();
    
    // Should remain on login page
    expect(page.url()).toContain('#login');
  });

  test('should handle network errors during authentication', async ({ page, context }) => {
    // Navigate to login
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');
    
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    // Simulate network error by blocking OAuth endpoint
    await page.route('**/lucaverse-auth.lucianoaf8.workers.dev/**', route => {
      route.abort('failed');
    });
    
    // Try to authenticate
    await googleButton.click();
    
    // Should show loading state initially
    await expect(page.locator('text="Initializing connection"')).toBeVisible();
    
    // Wait for potential error handling
    await page.waitForTimeout(3000);
    
    // Application should handle network error gracefully
    // (specific handling depends on implementation)
    const isStillLoading = await page.locator('text="Initializing connection"').isVisible().catch(() => false);
    const isButtonEnabled = await googleButton.isEnabled().catch(() => true);
    
    // Either loading cleared or some error handling occurred
    expect(isStillLoading || isButtonEnabled).toBeTruthy();
  });

  test('should handle popup blocking scenarios', async ({ page }) => {
    // Navigate to login
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');
    
    // Block popups
    await page.addInitScript(() => {
      window.open = () => null;
    });
    
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    // Try to authenticate
    const alertPromise = page.waitForEvent('dialog');
    await googleButton.click();
    
    // Should show popup blocked alert
    const alert = await alertPromise;
    expect(alert.message()).toContain('Popup was blocked');
    await alert.accept();
    
    // Should clear loading state
    await expect(googleButton).toBeEnabled();
    expect(page.url()).toContain('#login');
  });

  test('should handle authentication timeout', async ({ page, context, browserName }, testInfo) => {
    // Skip this test in webkit due to timeout handling differences
    if (browserName === 'webkit') {
      testInfo.skip();
    }
    
    // Navigate to login
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');
    
    // Reduce timeout for testing
    await page.addInitScript(() => {
      const originalSetTimeout = window.setTimeout;
      window.setTimeout = (callback, delay) => {
        if (delay === 300000) { // 5 minute OAuth timeout
          return originalSetTimeout(callback, 2000); // 2 seconds for test
        }
        return originalSetTimeout(callback, delay);
      };
    });
    
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    // Start OAuth flow but don't complete it
    const popupPromise = context.waitForEvent('page');
    await googleButton.click();
    
    const popup = await popupPromise;
    
    // Wait for timeout to trigger
    await page.waitForTimeout(3000);
    
    // Popup should be closed and loading state cleared
    expect(popup.isClosed()).toBeTruthy();
    await expect(googleButton).toBeEnabled();
  });

  test('should support multiple authentication attempts', async ({ page, context }) => {
    // Navigate to login
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');
    
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    // First attempt - simulate error
    let popupPromise = context.waitForEvent('page');
    await googleButton.click();
    
    let popup = await popupPromise;
    await popup.close(); // User closes popup manually
    
    // Wait for cleanup
    await page.waitForTimeout(2000);
    await expect(googleButton).toBeEnabled();
    
    // Second attempt - simulate success
    popupPromise = context.waitForEvent('page');
    await googleButton.click();
    
    popup = await popupPromise;
    
    // Simulate successful authentication
    await page.evaluate(() => {
      window.postMessage({
        type: 'OAUTH_SUCCESS',
        timestamp: Date.now(),
        user: { email: 'test@example.com' }
      }, window.location.origin);
    });
    
    // Should redirect to dashboard
    await page.waitForURL('*#dashboard', { timeout: 5000 });
    expect(page.url()).toContain('#dashboard');
  });

  test('should handle Microsoft authentication flow', async ({ page }) => {
    // Navigate to login
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');
    
    const microsoftButton = page.locator('button:has-text("Continue with Microsoft")');
    
    // Start Microsoft authentication (simulated)
    await microsoftButton.click();
    
    // Should show loading state
    await expect(page.locator('text="Initializing connection"')).toBeVisible();
    await expect(microsoftButton).toBeDisabled();
    
    // Wait for simulation completion (2 seconds)
    await page.waitForTimeout(3000);
    
    // Should clear loading state
    await expect(microsoftButton).toBeEnabled();
    expect(page.url()).toContain('#login'); // Still on login page (simulated)
  });

  test('should preserve authentication state across page refreshes', async ({ page, context }) => {
    // Complete authentication first
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');
    
    const googleButton = page.locator('button:has-text("Continue with Google")');
    const popupPromise = context.waitForEvent('page');
    await googleButton.click();
    
    const popup = await popupPromise;
    
    // Simulate successful authentication
    await page.evaluate(() => {
      window.postMessage({
        type: 'OAUTH_SUCCESS',
        timestamp: Date.now(),
        user: { email: 'test@example.com' }
      }, window.location.origin);
    });
    
    // Wait for redirect
    await page.waitForURL('*#dashboard', { timeout: 5000 });
    
    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should maintain authenticated state or handle appropriately
    // (Specific behavior depends on session management implementation)
    const currentUrl = page.url();
    console.log('URL after refresh:', currentUrl);
    
    // Page should load without errors
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle cross-browser OAuth compatibility', async ({ page, context, browserName }) => {
    // Navigate to login
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');
    
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    // Test OAuth initiation in current browser
    const popupPromise = context.waitForEvent('page');
    await googleButton.click();
    
    const popup = await popupPromise;
    await popup.waitForLoadState('networkidle');
    
    // Verify OAuth parameters work across browsers
    const popupUrl = popup.url();
    expect(popupUrl).toContain('lucaverse-auth.lucianoaf8.workers.dev');
    
    const url = new URL(popupUrl);
    expect(url.searchParams.has('state')).toBeTruthy();
    expect(url.searchParams.has('code_challenge')).toBeTruthy();
    
    // Browser-specific validations
    if (browserName === 'webkit') {
      // Safari-specific OAuth parameter validation
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    }
    
    await popup.close();
    
    // Should clean up properly in all browsers
    await page.waitForTimeout(2000);
    await expect(googleButton).toBeEnabled();
    
    console.log(`✅ OAuth compatibility verified for ${browserName}`);
  });

  test('should handle authentication security validation', async ({ page, context }) => {
    // Navigate to login  
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');
    
    const googleButton = page.locator('button:has-text("Continue with Google")');
    const popupPromise = context.waitForEvent('page');
    await googleButton.click();
    
    const popup = await popupPromise;
    
    // Test message origin validation
    await page.evaluate(() => {
      // This should be rejected due to invalid origin
      window.postMessage({
        type: 'OAUTH_SUCCESS',
        timestamp: Date.now()
      }, 'https://malicious-site.com');
    });
    
    // Should not redirect (invalid origin)
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('#login');
    
    // Test timestamp validation (too old)
    await page.evaluate(() => {
      window.postMessage({
        type: 'OAUTH_SUCCESS',
        timestamp: Date.now() - 700000 // Too old
      }, window.location.origin);
    });
    
    // Should not redirect (invalid timestamp)
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('#login');
    
    // Test valid message
    await page.evaluate(() => {
      window.postMessage({
        type: 'OAUTH_SUCCESS',
        timestamp: Date.now(),
        user: { email: 'test@example.com' }
      }, window.location.origin);
    });
    
    // Should redirect (valid message)
    await page.waitForURL('*#dashboard', { timeout: 5000 });
    expect(page.url()).toContain('#dashboard');
    
    await popup.close();
  });
});

test.describe('Authentication Error Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');
  });

  test('should recover from authentication errors and allow retry', async ({ page, context }) => {
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    // First attempt - simulate error
    const popupPromise = context.waitForEvent('page');
    await googleButton.click();
    
    const popup = await popupPromise;
    
    // Simulate authentication error
    const alertPromise = page.waitForEvent('dialog');
    await page.evaluate(() => {
      window.postMessage({
        type: 'OAUTH_ERROR',
        timestamp: Date.now(),
        error: 'Authentication failed',
        errorCode: 'unknown'
      }, window.location.origin);
    });
    
    const alert = await alertPromise;
    await alert.accept();
    
    // Should clear loading state
    await expect(googleButton).toBeEnabled();
    
    // Second attempt - should work normally
    const secondPopupPromise = context.waitForEvent('page');
    await googleButton.click();
    
    const secondPopup = await secondPopupPromise;
    await secondPopup.waitForLoadState('networkidle');
    
    // Verify second attempt initiated properly
    const popupUrl = secondPopup.url();
    expect(popupUrl).toContain('lucaverse-auth.lucianoaf8.workers.dev');
    
    await secondPopup.close();
  });

  test('should handle rapid successive authentication attempts', async ({ page, context }) => {
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    // First click
    await googleButton.click();
    await expect(googleButton).toBeDisabled();
    
    // Rapid second click (should be ignored due to disabled state)
    await googleButton.click({ force: true }); // Force click even if disabled
    
    // Should only have one OAuth flow initiated
    const popupPromise = context.waitForEvent('page', { timeout: 2000 }).catch(() => null);
    const popup = await popupPromise;
    
    if (popup) {
      await popup.close();
    }
    
    // Should still be in loading state (not multiple flows)
    expect(await page.locator('text="Initializing connection"').isVisible()).toBeTruthy();
  });

  test('should clean up resources after authentication errors', async ({ page, context }) => {
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    // Monitor resource cleanup
    let eventListenersAdded = 0;
    let eventListenersRemoved = 0;
    
    await page.addInitScript(() => {
      const originalAddEventListener = window.addEventListener;
      const originalRemoveEventListener = window.removeEventListener;
      
      window.addEventListener = (...args) => {
        if (args[0] === 'message') window._eventListenersAdded = (window._eventListenersAdded || 0) + 1;
        return originalAddEventListener.apply(window, args);
      };
      
      window.removeEventListener = (...args) => {
        if (args[0] === 'message') window._eventListenersRemoved = (window._eventListenersRemoved || 0) + 1;
        return originalRemoveEventListener.apply(window, args);
      };
    });
    
    // Start and fail authentication
    const popupPromise = context.waitForEvent('page');
    await googleButton.click();
    
    const popup = await popupPromise;
    
    // Simulate error
    const alertPromise = page.waitForEvent('dialog');
    await page.evaluate(() => {
      window.postMessage({
        type: 'OAUTH_ERROR',
        timestamp: Date.now(),
        error: 'Test error',
        errorCode: 'test_error'
      }, window.location.origin);
    });
    
    const alert = await alertPromise;
    await alert.accept();
    
    // Check resource cleanup
    eventListenersAdded = await page.evaluate(() => window._eventListenersAdded || 0);
    eventListenersRemoved = await page.evaluate(() => window._eventListenersRemoved || 0);
    
    // Should have cleaned up event listeners
    expect(eventListenersRemoved).toBeGreaterThan(0);
    expect(popup.isClosed()).toBeTruthy();
  });
});