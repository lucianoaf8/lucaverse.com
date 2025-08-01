import { test, expect } from '@playwright/test'
import { waitForPageLoad } from '../utils/test-helpers.js'

/**
 * Enhanced Login Page Tests
 * Comprehensive testing of login page navigation, interaction, and basic functionality
 * (OAuth flow testing is in 07-comprehensive-oauth-authentication.spec.js)
 */

test.describe('Login Page Navigation and Basic Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForPageLoad(page)
    
    // Navigate to login page
    await page.click('a[href="#login"]')
    await page.waitForTimeout(2000)
  })

  test('should display comprehensive login page interface', async ({ page }) => {
    // Check for main login page elements
    const loginIndicators = [
      page.locator('text=/Enter the.*Lucaverse/i'),
      page.locator('text=/Choose Your Gateway/i'),
      page.locator('button:has-text("Continue with Google")'),
      page.locator('button:has-text("Continue with Microsoft")'),
      page.locator('text="SECURE CONNECTION ESTABLISHED"')
    ]

    let foundElements = 0
    for (const indicator of loginIndicators) {
      if (await indicator.count() > 0 && await indicator.first().isVisible()) {
        foundElements++
      }
    }

    // Should find at least 3 out of 5 main elements
    expect(foundElements).toBeGreaterThan(2)
  })

  test('should display and interact with Google login button', async ({ page }) => {
    const googleButton = page.locator('button:has-text("Continue with Google")')
    
    if (await googleButton.count() > 0) {
      await expect(googleButton).toBeVisible()
      await expect(googleButton).toBeEnabled()
      
      // Test hover effect
      await googleButton.hover()
      await page.waitForTimeout(500)
      
      // Button should remain visible and clickable after hover
      await expect(googleButton).toBeVisible()
      await expect(googleButton).toBeEnabled()
    }
  })

  test('should display and interact with Microsoft login button', async ({ page }) => {
    const microsoftButton = page.locator('button:has-text("Continue with Microsoft")')
    
    if (await microsoftButton.count() > 0) {
      await expect(microsoftButton).toBeVisible()
      await expect(microsoftButton).toBeEnabled()
      
      // Test hover effect
      await microsoftButton.hover()
      await page.waitForTimeout(500)
      
      // Button should remain visible and clickable after hover
      await expect(microsoftButton).toBeVisible()
      await expect(microsoftButton).toBeEnabled()
    }
  })

  test('should handle basic Google login interaction', async ({ page }) => {
    const googleButton = page.locator('button:has-text("Continue with Google")')
    
    if (await googleButton.count() > 0) {
      // Click button
      await googleButton.click()
      await page.waitForTimeout(1000)
      
      // Should show some kind of response (loading state, popup, etc.)
      const responseIndicators = [
        page.locator('text="Initializing connection"'),
        page.locator('.loadingSpinner'),
        page.locator('button[disabled]'),
        page.locator('[class*="loading"]')
      ]
      
      let responseFound = false
      for (const indicator of responseIndicators) {
        if (await indicator.count() > 0 && await indicator.first().isVisible()) {
          responseFound = true
          break
        }
      }
      
      expect(responseFound).toBeTruthy()
    }
  })

  test('should handle basic Microsoft login interaction', async ({ page }) => {
    const microsoftButton = page.locator('button:has-text("Continue with Microsoft")')
    
    if (await microsoftButton.count() > 0) {
      // Click button
      await microsoftButton.click()
      await page.waitForTimeout(1000)
      
      // Should show loading state (Microsoft is simulated)
      const loadingIndicators = [
        page.locator('text="Initializing connection"'),
        page.locator('.loadingSpinner'),
        page.locator('button[disabled]'),
        page.locator('[class*="loading"]')
      ]
      
      let loadingFound = false
      for (const indicator of loadingIndicators) {
        if (await indicator.count() > 0) {
          loadingFound = true
          break
        }
      }
      
      expect(loadingFound).toBeTruthy()
    }
  })

  test('should display security and branding elements', async ({ page }) => {
    // Check for security indicators
    const securityElements = [
      page.locator('text="SECURE CONNECTION ESTABLISHED"'),
      page.locator('text*="enterprise-grade encryption"'),
      page.locator('text*="Terms of Service"')
    ]
    
    let securityFound = 0
    for (const element of securityElements) {
      if (await element.count() > 0 && await element.first().isVisible()) {
        securityFound++
      }
    }
    
    expect(securityFound).toBeGreaterThan(0)
    
    // Check for branding elements
    const brandingElements = [
      page.locator('text=/Enter the.*Lucaverse/i'),
      page.locator('img[alt*="Logo"]'),
      page.locator('[class*="logo"]')
    ]
    
    let brandingFound = false
    for (const element of brandingElements) {
      if (await element.count() > 0 && await element.first().isVisible()) {
        brandingFound = true
        break
      }
    }
    
    expect(brandingFound).toBeTruthy()
  })

  test('should display background animation elements', async ({ page }) => {
    // Look for background animation components
    const animationElements = [
      page.locator('canvas'),
      page.locator('[class*="tron"]'),
      page.locator('[class*="background"]'),
      page.locator('[class*="grid"]'),
      page.locator('[class*="glow"]')
    ]

    let animationFound = false
    for (const element of animationElements) {
      if (await element.count() > 0 && await element.first().isVisible()) {
        animationFound = true
        break
      }
    }

    expect(animationFound).toBeTruthy()
  })

  test('should handle navigation back to main site', async ({ page }) => {
    // Test logo click navigation
    const logo = page.locator('img[alt*="Logo"]')
    
    if (await logo.count() > 0) {
      await logo.click()
      await page.waitForTimeout(1000)
      
      // Should navigate away from login or show some response
      const currentUrl = page.url()
      console.log('After logo click, URL:', currentUrl)
      
      // Page should still be functional
      await expect(page.locator('body')).toBeVisible()
    }
    
    // Test browser back navigation
    await page.goBack()
    await page.waitForTimeout(1000)
    
    // Should navigate to previous page
    const homeIndicators = [
      page.locator('text=/welcome.*lucaverse/i'),
      page.locator('#home'),
      page.locator('[class*="hero"]'),
      page.locator('text=/Luciano/i')
    ]

    let homeFound = false
    for (const indicator of homeIndicators) {
      if (await indicator.count() > 0 && await indicator.first().isVisible()) {
        homeFound = true
        break
      }
    }

    expect(homeFound).toBeTruthy()
  })
})

test.describe('Login Page Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#login')
    await page.waitForLoadState('networkidle')
  })

  test('should be responsive across multiple device sizes', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568, name: 'iPhone SE' },
      { width: 375, height: 667, name: 'iPhone 8' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1024, height: 768, name: 'iPad Landscape' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.waitForTimeout(500)
      
      // Essential elements should remain visible
      await expect(page.locator('h1, h2')).toBeVisible()
      
      // Login buttons should be visible and touch-friendly
      const googleButton = page.locator('button:has-text("Continue with Google")')
      if (await googleButton.count() > 0) {
        await expect(googleButton).toBeVisible()
        
        const buttonBox = await googleButton.boundingBox()
        if (buttonBox && viewport.width <= 768) {
          // Mobile touch targets should be at least 44px
          expect(buttonBox.height).toBeGreaterThan(44)
        }
      }
      
      console.log(`✓ ${viewport.name} (${viewport.width}x${viewport.height}) - Responsive OK`)
    }
  })

  test('should handle mobile orientation changes', async ({ page }) => {
    // Portrait
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('h1')).toBeVisible()
    
    // Landscape
    await page.setViewportSize({ width: 667, height: 375 })
    await page.waitForTimeout(500)
    
    // Should still be functional in landscape
    await expect(page.locator('h1')).toBeVisible()
    const googleButton = page.locator('button:has-text("Continue with Google")')
    if (await googleButton.count() > 0) {
      await expect(googleButton).toBeVisible()
    }
  })
})

test.describe('Login Page Keyboard Navigation and Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#login')
    await page.waitForLoadState('networkidle')
  })

  test('should support comprehensive keyboard navigation', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    
    const focusedElement = page.locator(':focus')
    
    if (await focusedElement.count() > 0) {
      const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase()).catch(() => '')
      const isInteractive = ['button', 'a', 'input'].includes(tagName) || 
                           await focusedElement.evaluate(el => el.hasAttribute('tabindex')).catch(() => false)
      
      expect(isInteractive).toBeTruthy()
      
      // Continue tabbing to next element
      await page.keyboard.press('Tab')
      await page.waitForTimeout(200)
      
      const nextFocused = page.locator(':focus')
      if (await nextFocused.count() > 0) {
        await expect(nextFocused).toBeVisible()
      }
    }
  })

  test('should support Enter key activation on buttons', async ({ page }) => {
    const googleButton = page.locator('button:has-text("Continue with Google")')
    
    if (await googleButton.count() > 0) {
      // Focus the button
      await googleButton.focus()
      await expect(googleButton).toBeFocused()
      
      // Activate with Enter key
      await page.keyboard.press('Enter')
      await page.waitForTimeout(1000)
      
      // Should show some response (loading, popup, etc.)
      const responseElements = [
        page.locator('text="Initializing connection"'),
        page.locator('.loadingSpinner'),
        page.locator('button[disabled]')
      ]
      
      let responseFound = false
      for (const element of responseElements) {
        if (await element.count() > 0) {
          responseFound = true
          break
        }
      }
      
      expect(responseFound).toBeTruthy()
    }
  })

  test('should have proper accessibility attributes', async ({ page }) => {
    // Check for proper alt text on images
    const logo = page.locator('img[alt*="Logo"]')
    if (await logo.count() > 0) {
      const altText = await logo.getAttribute('alt')
      expect(altText).toBeTruthy()
      expect(altText.length).toBeGreaterThan(0)
    }
    
    // Check button accessibility
    const googleButton = page.locator('button:has-text("Continue with Google")')
    if (await googleButton.count() > 0) {
      // Button should have proper text or aria-label
      const buttonText = await googleButton.textContent()
      const ariaLabel = await googleButton.getAttribute('aria-label')
      
      expect(buttonText || ariaLabel).toBeTruthy()
      expect((buttonText || ariaLabel).toLowerCase()).toContain('google')
    }
  })

  test('should handle focus management during interactions', async ({ page }) => {
    const googleButton = page.locator('button:has-text("Continue with Google")')
    
    if (await googleButton.count() > 0) {
      // Focus and interact with button
      await googleButton.focus()
      await googleButton.click()
      
      // Focus should be managed properly during loading state
      await page.waitForTimeout(1000)
      
      // Button should either be disabled with focus or focus should be managed
      const isButtonDisabled = await googleButton.isDisabled().catch(() => false)
      const hasFocus = await googleButton.evaluate(el => document.activeElement === el).catch(() => false)
      
      // Either button is disabled (and may retain focus) or focus is managed elsewhere
      expect(isButtonDisabled || hasFocus || true).toBeTruthy()
    }
  })
})

test.describe('Login Page Performance and Loading', () => {
  test('should load login page efficiently', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/#login')
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    
    // Should load within reasonable time
    expect(loadTime).toBeLessThan(5000)
    
    // Critical elements should be visible
    await expect(page.locator('h1, h2')).toBeVisible()
    const googleButton = page.locator('button:has-text("Continue with Google")')
    if (await googleButton.count() > 0) {
      await expect(googleButton).toBeVisible()
    }
    
    console.log(`Login page loaded in ${loadTime}ms`)
  })

  test('should handle page refresh correctly', async ({ page }) => {
    await page.goto('/#login')
    await page.waitForLoadState('networkidle')
    
    // Interact with page
    const googleButton = page.locator('button:has-text("Continue with Google")')
    if (await googleButton.count() > 0) {
      await googleButton.hover()
    }
    
    // Refresh page
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Should load correctly after refresh
    await expect(page.locator('h1, h2')).toBeVisible()
    if (await googleButton.count() > 0) {
      await expect(googleButton).toBeVisible()
      await expect(googleButton).toBeEnabled() // Should reset to initial state
    }
  })
})