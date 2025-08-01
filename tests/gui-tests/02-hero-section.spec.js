import { test, expect } from '@playwright/test'
import { waitForPageLoad, waitForAnimation } from '../utils/test-helpers.js'

test.describe('Hero Section Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForPageLoad(page)
  })

  test('should display hero section with main title', async ({ page }) => {
    const heroSection = page.locator('#home, section').first()
    await expect(heroSection).toBeVisible()

    // Check for main title elements
    const titleElement = page.locator('h1, .hero-title, [class*="title"]').first()
    await expect(titleElement).toBeVisible()

    // Verify title contains key words
    const titleText = await titleElement.textContent()
    expect(titleText.toLowerCase()).toMatch(/(welcome|lucaverse)/i)
  })

  test('should display mission and vision text', async ({ page }) => {
    // Look for mission text
    const missionText = page.locator('text=/mission/i')
    await expect(missionText.first()).toBeVisible()

    // Look for vision text  
    const visionText = page.locator('text=/vision/i')
    await expect(visionText.first()).toBeVisible()
  })

  test('should display hero action buttons', async ({ page }) => {
    // Enter Lucaverse button
    const enterButton = page.locator('a[href="#login"], a').filter({ hasText: /enter.*lucaverse/i })
    await expect(enterButton.first()).toBeVisible()

    // Request Access button
    const requestButton = page.locator('button').filter({ hasText: /request.*access/i })
    await expect(requestButton.first()).toBeVisible()
  })

  test('should handle Enter Lucaverse button click', async ({ page }) => {
    const enterButton = page.locator('a[href="#login"], a').filter({ hasText: /enter.*lucaverse/i })
    
    if (await enterButton.count() > 0) {
      await enterButton.first().click()
      await page.waitForTimeout(2000)
      
      // Check if navigated to login or shows login interface
      const url = page.url()
      const hasLoginContent = await page.locator('text=/login|sign.*in|google|microsoft/i').count() > 0
      
      expect(url.includes('#login') || hasLoginContent).toBeTruthy()
    }
  })

  test('should handle Request Access button click', async ({ page }) => {
    const requestButton = page.locator('button').filter({ hasText: /request.*access/i })
    
    if (await requestButton.count() > 0) {
      await requestButton.first().click()
      await page.waitForTimeout(1000)
      
      // Check if modal/form appears
      const modal = page.locator('[role="dialog"], .modal, form').filter({ hasText: /access|request/i })
      await expect(modal.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('should display HoloCore animation component', async ({ page }) => {
    // Look for animation container or canvas
    const animationElements = [
      page.locator('canvas'),
      page.locator('[class*="holo"]'),
      page.locator('[class*="animation"]'),
      page.locator('[class*="core"]')
    ]

    let animationFound = false
    for (const element of animationElements) {
      if (await element.count() > 0) {
        await expect(element.first()).toBeVisible()
        animationFound = true
        break
      }
    }

    // At least one animation element should be present
    expect(animationFound).toBeTruthy()
  })

  test('should have proper responsive layout on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    const heroSection = page.locator('#home, section').first()
    await expect(heroSection).toBeVisible()

    // Check that buttons are still visible and clickable on mobile
    const buttons = page.locator('button, a[href="#login"]')
    for (const button of await buttons.all()) {
      await expect(button).toBeVisible()
    }
  })

  test('should have proper responsive layout on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(500)

    const heroSection = page.locator('#home, section').first()
    await expect(heroSection).toBeVisible()

    // Verify layout adapts properly
    const titleElement = page.locator('h1, .hero-title, [class*="title"]').first()
    await expect(titleElement).toBeVisible()
  })

  test('should maintain visual hierarchy', async ({ page }) => {
    // Check heading hierarchy
    const h1 = page.locator('h1')
    await expect(h1.first()).toBeVisible()

    // Ensure h1 is the main heading
    const h1Count = await h1.count()
    expect(h1Count).toBeGreaterThan(0)

    // Check that action buttons are visually prominent
    const buttons = page.locator('button, a[href="#login"]')
    for (const button of await buttons.all()) {
      const boundingBox = await button.boundingBox()
      if (boundingBox) {
        expect(boundingBox.height).toBeGreaterThan(30) // Buttons should be reasonably sized
        expect(boundingBox.width).toBeGreaterThan(100)
      }
    }
  })

  test('should handle keyboard navigation', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)

    // Check if focus is visible on interactive elements
    const focusedElement = page.locator(':focus')
    const isInteractive = await focusedElement.evaluate(el => {
      const tagName = el.tagName.toLowerCase()
      return tagName === 'button' || tagName === 'a' || el.hasAttribute('tabindex')
    }).catch(() => false)

    // Should be able to focus on interactive elements
    expect(isInteractive || await focusedElement.count() > 0).toBeTruthy()
  })

  test('should handle hero section animations', async ({ page }) => {
    // Wait for potential animations to load
    await waitForAnimation(page)

    // Check if animations don't break page functionality
    const buttons = page.locator('button, a')
    for (const button of await buttons.all()) {
      if (await button.isVisible()) {
        const isClickable = await button.isEnabled()
        expect(isClickable).toBeTruthy()
      }
    }
  })
})