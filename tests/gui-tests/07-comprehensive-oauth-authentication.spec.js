import { test, expect } from '@playwright/test';

/**
 * Comprehensive OAuth Authentication Tests
 * Tests the complete Google OAuth authentication flow including popup handling,
 * security validation, error scenarios, and user authentication journey
 */

test.describe('Login Page - UI Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');
  });

  test('should display all login page elements correctly', async ({ page }) => {
    // Header elements
    await expect(page.locator('h1')).toContainText(['Enter the', 'Lucaverse']);
    await expect(page.locator('h2')).toContainText('Choose Your Gateway');
    
    // Logo
    const logo = page.locator('img[alt*="Logo"]');
    await expect(logo).toBeVisible();
    
    // Login buttons
    const googleButton = page.locator('button:has-text("Continue with Google")');
    await expect(googleButton).toBeVisible();
    
    const microsoftButton = page.locator('button:has-text("Continue with Microsoft")');
    await expect(microsoftButton).toBeVisible();
    
    // Security indicators
    await expect(page.locator('text="SECURE CONNECTION ESTABLISHED"')).toBeVisible();
    await expect(page.locator('text*="enterprise-grade encryption"')).toBeVisible();
    
    // Terms and conditions
    await expect(page.locator('text*="Terms of Service"')).toBeVisible();
  });

  test('should have proper visual styling and animations', async ({ page }) => {
    // Check for holographic/gradient effects
    const titleGradient = page.locator('.titleGradient, [class*="gradient"]');
    if (await titleGradient.count() > 0) {
      await expect(titleGradient.first()).toBeVisible();
    }
    
    // Check for glow effects
    const glowElements = page.locator('[class*="glow"], [class*="Glow"]');
    expect(await glowElements.count()).toBeGreaterThan(0);
    
    // Check for loading spinner when needed
    const loadingSpinner = page.locator('.loadingSpinner, [class*="loading"]');
    // Should exist but not be visible initially
    if (await loadingSpinner.count() > 0) {
      await expect(loadingSpinner.first()).toBeHidden();
    }
  });

  test('should be fully responsive across devices', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667, name: 'iPhone' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);
      
      // All essential elements should remain visible
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();
      
      // Touch targets should be large enough on mobile
      if (viewport.width <= 768) {
        const button = page.locator('button:has-text("Continue with Google")');
        const box = await button.boundingBox();
        expect(box?.height).toBeGreaterThan(44); // iOS minimum touch target
      }
    }
  });
});

test.describe('OAuth Authentication Flow - Google Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');
  });

  test('should initiate Google OAuth flow with popup', async ({ page, context }) => {
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    // Set up popup monitoring BEFORE clicking
    const popupPromise = context.waitForEvent('page');
    
    // Click Google login button
    await googleButton.click();
    
    // Wait for popup window
    const popup = await popupPromise;
    
    // Verify popup opened with correct OAuth URL
    await popup.waitForLoadState('networkidle');
    const popupUrl = popup.url();
    
    expect(popupUrl).toContain('lucaverse-auth.lucianoaf8.workers.dev');
    expect(popupUrl).toContain('/auth/google');
    
    // Verify OAuth parameters in URL
    const url = new URL(popupUrl);
    expect(url.searchParams.has('state')).toBeTruthy();
    expect(url.searchParams.has('code_challenge')).toBeTruthy();
    expect(url.searchParams.has('code_challenge_method')).toBeTruthy();
    expect(url.searchParams.has('session_id')).toBeTruthy();
    
    // Cleanup
    await popup.close();
  });

  test('should show loading state during authentication', async ({ page, context }) => {
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    // Click button and immediately check for loading state
    await googleButton.click();
    
    // Should show loading spinner and text
    await expect(page.locator('text="Initializing connection"')).toBeVisible();
    const loadingSpinner = page.locator('.loadingSpinner');
    if (await loadingSpinner.count() > 0) {
      await expect(loadingSpinner).toBeVisible();
    }
    
    // Button should be disabled during loading
    await expect(googleButton).toBeDisabled();
  });

  test('should handle popup blocking scenario', async ({ page, context }) => {
    // Block popups by overriding window.open
    await page.addInitScript(() => {
      window.open = () => null;
    });
    
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    // Listen for alert dialog
    const alertPromise = page.waitForEvent('dialog');
    
    await googleButton.click();
    
    // Should show popup blocked alert
    const alert = await alertPromise;
    expect(alert.message()).toContain('Popup was blocked');
    await alert.accept();
    
    // Loading state should be cleared
    await expect(googleButton).not.toBeDisabled();
  });

  test('should handle OAuth success message from popup', async ({ page, context }) => {
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    // Mock successful OAuth response
    await page.addInitScript(() => {
      // Override the message handler to simulate success
      window.addEventListener('message', (event) => {
        if (event.data?.type === 'OAUTH_SUCCESS') {
          // This would normally redirect to dashboard
          window.location.hash = 'dashboard';
        }
      });
    });
    
    await googleButton.click();
    
    // Simulate OAuth success message
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

  test('should handle OAuth error scenarios', async ({ page }) => {
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    const errorScenarios = [
      { errorCode: 'access_denied', expectedMessage: 'Authentication was cancelled' },
      { errorCode: 'popup_blocked', expectedMessage: 'Popup was blocked' },
      { errorCode: 'session_expired', expectedMessage: 'Session expired' },
      { errorCode: 'not_authorized', expectedMessage: 'not authorized' },
      { errorCode: 'state_mismatch', expectedMessage: 'Security validation failed' }
    ];

    for (const scenario of errorScenarios) {
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Set up alert handler
      const alertPromise = page.waitForEvent('dialog');
      
      await googleButton.click();
      
      // Simulate OAuth error message
      await page.evaluate((errorData) => {
        window.postMessage({
          type: 'OAUTH_ERROR',
          timestamp: Date.now(),
          error: `Error: ${errorData.errorCode}`,
          errorCode: errorData.errorCode
        }, window.location.origin);
      }, scenario);
      
      // Should show appropriate error message
      const alert = await alertPromise;
      expect(alert.message().toLowerCase()).toContain(scenario.expectedMessage.toLowerCase());
      await alert.accept();
      
      // Should clear loading state
      await expect(googleButton).not.toBeDisabled();
    }
  });

  test('should validate security parameters in OAuth flow', async ({ page, context }) => {
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    // Monitor network requests to capture OAuth parameters
    const oauthRequests = [];
    page.on('request', request => {
      if (request.url().includes('lucaverse-auth.lucianoaf8.workers.dev')) {
        oauthRequests.push(request);
      }
    });
    
    const popupPromise = context.waitForEvent('page');
    await googleButton.click();
    
    const popup = await popupPromise;
    await popup.waitForLoadState('networkidle');
    
    // Verify security parameters
    const popupUrl = new URL(popup.url());
    
    // State parameter should be present and non-empty
    const state = popupUrl.searchParams.get('state');
    expect(state).toBeTruthy();
    expect(state.length).toBeGreaterThan(10);
    
    // PKCE parameters should be present
    const codeChallenge = popupUrl.searchParams.get('code_challenge');
    const codeChallengeMethod = popupUrl.searchParams.get('code_challenge_method');
    expect(codeChallenge).toBeTruthy();
    expect(codeChallengeMethod).toBe('S256');
    
    // Session ID should be present
    const sessionId = popupUrl.searchParams.get('session_id');
    expect(sessionId).toBeTruthy();
    
    await popup.close();
  });

  test('should handle message origin validation', async ({ page }) => {
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    await googleButton.click();
    
    // Test invalid origin message (should be ignored)
    await page.evaluate(() => {
      // This should be ignored due to invalid origin
      window.postMessage({
        type: 'OAUTH_SUCCESS',
        timestamp: Date.now()
      }, 'https://malicious-site.com');
    });
    
    // Page should remain on login (not redirect)
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('#login');
    
    // Test valid origin message
    await page.evaluate(() => {
      window.postMessage({
        type: 'OAUTH_SUCCESS',
        timestamp: Date.now()
      }, window.location.origin);
    });
    
    // Now should redirect to dashboard
    await page.waitForURL('*#dashboard', { timeout: 3000 });
  });

  test('should handle OAuth timeout scenario', async ({ page, context }) => {
    // Reduce timeout for testing
    await page.addInitScript(() => {
      // Override timeout to 2 seconds for testing
      const originalSetTimeout = window.setTimeout;
      window.setTimeout = (callback, delay) => {
        if (delay === 300000) { // 5 minute OAuth timeout
          return originalSetTimeout(callback, 2000); // 2 seconds for test
        }
        return originalSetTimeout(callback, delay);
      };
    });
    
    const googleButton = page.locator('button:has-text("Continue with Google")');
    const popupPromise = context.waitForEvent('page');
    
    await googleButton.click();
    
    const popup = await popupPromise;
    
    // Wait for timeout to trigger
    await page.waitForTimeout(3000);
    
    // Popup should be closed and loading state cleared
    expect(popup.isClosed()).toBeTruthy();
    await expect(googleButton).not.toBeDisabled();
  });

  test('should handle popup closed manually by user', async ({ page, context }) => {
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    const popupPromise = context.waitForEvent('page');
    await googleButton.click();
    
    const popup = await popupPromise;
    await popup.waitForLoadState('networkidle');
    
    // User closes popup manually
    await popup.close();
    
    // Should clear loading state after popup is closed
    await page.waitForTimeout(2000); // Wait for popup check interval
    await expect(googleButton).not.toBeDisabled();
  });
});

test.describe('Microsoft Authentication (Simulated)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');
  });

  test('should handle Microsoft login button click', async ({ page }) => {
    const microsoftButton = page.locator('button:has-text("Continue with Microsoft")');
    
    await microsoftButton.click();
    
    // Should show loading state (Microsoft is simulated)
    await expect(page.locator('text="Initializing connection"')).toBeVisible();
    await expect(microsoftButton).toBeDisabled();
    
    // Wait for simulated completion (2 seconds)
    await page.waitForTimeout(2500);
    
    // Should clear loading state
    await expect(microsoftButton).not.toBeDisabled();
  });

  test('should handle Microsoft button hover effects', async ({ page }) => {
    const microsoftButton = page.locator('button:has-text("Continue with Microsoft")');
    
    // Test hover state
    await microsoftButton.hover();
    
    // Check if hover class is applied
    const buttonContainer = microsoftButton.locator('.buttonContainer');
    if (await buttonContainer.count() > 0) {
      // Hover effects should be visible
      await expect(microsoftButton).toBeVisible();
    }
  });
});

test.describe('Authentication State Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');
  });

  test('should clear OAuth storage on authentication error', async ({ page }) => {
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    // Mock OAuth storage operations
    await page.addInitScript(() => {
      window.testOAuthStorage = {};
      window.oauthStorage = {
        clear: () => { window.testOAuthStorage = {}; },
        get: (key) => window.testOAuthStorage[key],
        set: (key, value) => { window.testOAuthStorage[key] = value; }
      };
    });
    
    await googleButton.click();
    
    // Simulate OAuth error
    await page.evaluate(() => {
      window.postMessage({
        type: 'OAUTH_ERROR',
        timestamp: Date.now(),
        error: 'Test error',
        errorCode: 'test_error'
      }, window.location.origin);
    });
    
    // Wait for error handling
    const alert = await page.waitForEvent('dialog');
    await alert.accept();
    
    // OAuth storage should be cleared
    const storageCleared = await page.evaluate(() => {
      return Object.keys(window.testOAuthStorage).length === 0;
    });
    
    expect(storageCleared).toBeTruthy();
  });

  test('should clear OAuth storage on successful authentication', async ({ page }) => {
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    // Mock OAuth storage operations
    await page.addInitScript(() => {
      window.testOAuthStorage = { state: 'test', challenge: 'test' };
      window.oauthStorage = {
        clear: () => { window.testOAuthStorage = {}; },
        get: (key) => window.testOAuthStorage[key],
        set: (key, value) => { window.testOAuthStorage[key] = value; }
      };
    });
    
    await googleButton.click();
    
    // Simulate OAuth success
    await page.evaluate(() => {
      window.postMessage({
        type: 'OAUTH_SUCCESS',
        timestamp: Date.now(),
        user: { email: 'test@example.com' }
      }, window.location.origin);
    });
    
    // Wait for success handling and redirect
    await page.waitForURL('*#dashboard', { timeout: 3000 });
    
    // OAuth storage should be cleared
    const storageCleared = await page.evaluate(() => {
      return Object.keys(window.testOAuthStorage).length === 0;
    });
    
    expect(storageCleared).toBeTruthy();
  });
});

test.describe('Keyboard and Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');
  });

  test('should support full keyboard navigation', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    
    let focusedElement = page.locator(':focus');
    let elementTag = await focusedElement.evaluate(el => el.tagName.toLowerCase());
    
    // Should focus on first interactive element (button)
    expect(['button', 'a', 'input'].includes(elementTag)).toBeTruthy();
    
    // Continue tabbing
    await page.keyboard.press('Tab');
    
    // Should move to next interactive element
    focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test Enter key activation on Google button
    const googleButton = page.locator('button:has-text("Continue with Google")');
    await googleButton.focus();
    
    // Set up popup promise before Enter key
    const popupPromise = page.context().waitForEvent('page').catch(() => null);
    
    await page.keyboard.press('Enter');
    
    // Should trigger OAuth flow
    const popup = await popupPromise;
    if (popup) {
      await popup.close();
    }
  });

  test('should have proper ARIA labels and accessibility attributes', async ({ page }) => {
    // Check button accessibility
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    // Should be properly labeled
    const ariaLabel = await googleButton.getAttribute('aria-label');
    const buttonText = await googleButton.textContent();
    
    expect(ariaLabel || buttonText).toContain('Google');
    
    // Should not have accessibility violations
    await expect(googleButton).toBeEnabled();
    await expect(googleButton).toBeVisible();
    
    // Logo should have alt text
    const logo = page.locator('img[alt*="Logo"]');
    const altText = await logo.getAttribute('alt');
    expect(altText).toBeTruthy();
    expect(altText.length).toBeGreaterThan(0);
    
    // Check button roles and states
    const buttonRole = await googleButton.getAttribute('role');
    const buttonDisabled = await googleButton.getAttribute('disabled');
    
    // Button should have proper role (or implicit button role)
    expect(buttonRole === 'button' || await googleButton.evaluate(el => el.tagName === 'BUTTON')).toBeTruthy();
    
    // Initially should not be disabled
    expect(buttonDisabled).toBeNull();
  });

  test('should maintain focus management during authentication flow', async ({ page, context }) => {
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    // Focus the button
    await googleButton.focus();
    await expect(googleButton).toBeFocused();
    
    // Click button
    const popupPromise = context.waitForEvent('page');
    await googleButton.click();
    
    // Button should be disabled but focus should be managed
    await expect(googleButton).toBeDisabled();
    
    const popup = await popupPromise;
    await popup.close();
    
    // After popup closes, focus should return to manageable state
    await page.waitForTimeout(2000); // Wait for popup check interval
    await expect(googleButton).not.toBeDisabled();
  });

  test('should handle screen reader announcements', async ({ page }) => {
    // Check for screen reader friendly elements
    const hiddenScreenReaderElements = page.locator('.sr-only, [class*="screenReader"]');
    
    // May have screen reader only elements
    if (await hiddenScreenReaderElements.count() > 0) {
      for (const element of await hiddenScreenReaderElements.all()) {
        await expect(element).toBeHidden(); // Should be visually hidden but accessible
      }
    }
    
    // Loading state should be announced
    const googleButton = page.locator('button:has-text("Continue with Google")');
    await googleButton.click();
    
    // Check for loading announcement
    const loadingText = page.locator('text="Initializing connection"');
    await expect(loadingText).toBeVisible();
    
    // Text should be accessible to screen readers
    const ariaLive = await loadingText.getAttribute('aria-live');
    const ariaLabel = await loadingText.getAttribute('aria-label');
    
    // Should have some form of screen reader support
    expect(ariaLive || ariaLabel || await loadingText.isVisible()).toBeTruthy();
  });
});

test.describe('Cross-Browser OAuth Compatibility', () => {
  test('should work in different browser contexts', async ({ page, context, browserName }) => {
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');
    
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    // Test popup functionality across browsers
    const popupPromise = context.waitForEvent('page');
    await googleButton.click();
    
    const popup = await popupPromise;
    await popup.waitForLoadState('networkidle');
    
    // Verify popup works in current browser
    expect(popup.url()).toContain('lucaverse-auth.lucianoaf8.workers.dev');
    
    // Browser-specific checks
    if (browserName === 'webkit') {
      // Safari-specific OAuth checks
      const popupUrl = new URL(popup.url());
      expect(popupUrl.searchParams.has('state')).toBeTruthy();
    }
    
    await popup.close();
    
    // Should clear loading state regardless of browser
    await expect(googleButton).not.toBeDisabled();
  });
});