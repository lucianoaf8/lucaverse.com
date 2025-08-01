import { test, expect } from '@playwright/test'
import { TEST_SELECTORS, TEST_URLS, waitForPageLoad, scrollToElement } from '../utils/test-helpers.js'

test.describe('Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForPageLoad(page)
  })

  test('should load the homepage successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Lucaverse/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('should display header with logo and navigation links', async ({ page }) => {
    // Check logo
    const logo = page.locator('img[alt*="Lucaverse"]').first()
    await expect(logo).toBeVisible()

    // Check navigation links
    const navLinks = [
      { text: 'home', href: '#home' },
      { text: 'about', href: '#about' },
      { text: 'projects', href: '#projects' },
      { text: 'customGpts', href: '#custom-gpts' },
      { text: 'blog', href: '#blog' },
      { text: 'contactMe', href: '#contact' }
    ]

    for (const link of navLinks) {
      const navLink = page.locator(`a[href="${link.href}"]`)
      await expect(navLink).toBeVisible()
    }
  })

  test('should navigate to different sections via navigation links', async ({ page }) => {
    const sections = [
      { href: '#about', sectionId: 'about' },
      { href: '#projects', sectionId: 'projects' },
      { href: '#custom-gpts', sectionId: 'custom-gpts' },
      { href: '#blog', sectionId: 'blog' },
      { href: '#contact', sectionId: 'contact' }
    ]

    for (const section of sections) {
      await page.click(`a[href="${section.href}"]`)
      await page.waitForTimeout(1000) // Wait for smooth scroll
      
      // Check if section is in viewport
      const sectionElement = page.locator(`#${section.sectionId}`)
      await expect(sectionElement).toBeVisible()
    }
  })

  test('should show language toggle and allow language switching', async ({ page }) => {
    // Find language toggle button
    const languageToggle = page.locator('button').filter({ hasText: /^(EN|PT)$/ })
    await expect(languageToggle).toBeVisible()

    // Get current language
    const currentLang = await languageToggle.textContent()
    
    // Click to switch language
    await languageToggle.click()
    await page.waitForTimeout(500) // Wait for language change

    // Verify language switched (content should change)
    const newLang = await languageToggle.textContent()
    expect(newLang).not.toBe(currentLang)
  })

  test('should display external newsletter link', async ({ page }) => {
    const newsletterLink = page.locator('a[href="https://newsletter.lucaverse.com"]')
    await expect(newsletterLink).toBeVisible()
    
    // Check link has proper attributes
    await expect(newsletterLink).toHaveAttribute('target', '_blank')
    await expect(newsletterLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('should show login and request access buttons', async ({ page }) => {
    // Login button
    const loginButton = page.locator('a[href="#login"]')
    await expect(loginButton).toBeVisible()

    // Request Access button
    const requestAccessButton = page.locator('button').filter({ hasText: /request.*access/i })
    await expect(requestAccessButton).toBeVisible()
  })

  test('should navigate to login page via login button', async ({ page }) => {
    const loginButton = page.locator('a[href="#login"]')
    await loginButton.click()
    
    // Wait for navigation or modal to appear
    await page.waitForTimeout(2000)
    
    // Check if URL changed or login interface is visible
    const url = page.url()
    const hasLoginInUrl = url.includes('#login') || url.includes('/login')
    const hasLoginContent = await page.locator('text=/login|sign.*in/i').count() > 0
    
    expect(hasLoginInUrl || hasLoginContent).toBeTruthy()
  })

  test('should open request access modal', async ({ page }) => {
    const requestAccessButton = page.locator('button').filter({ hasText: /request.*access/i }).first()
    await requestAccessButton.click()
    
    // Wait for modal to appear
    await page.waitForTimeout(1000)
    
    // Check if modal is visible (look for form or modal container)
    const modal = page.locator('[role="dialog"], .modal, form').filter({ hasText: /access|request/i })
    await expect(modal.first()).toBeVisible({ timeout: 5000 })
  })

  test('should maintain navigation state during page interactions', async ({ page }) => {
    // Navigate to a section
    await page.click('a[href="#projects"]')
    await page.waitForTimeout(1000)
    
    // Interact with the page (scroll, click elements)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    
    // Navigate to another section
    await page.click('a[href="#contact"]')
    await page.waitForTimeout(1000)
    
    // Verify navigation still works
    const contactSection = page.locator('#contact')
    await expect(contactSection).toBeVisible()
  })

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Navigate to different sections
    await page.click('a[href="#about"]')
    await page.waitForTimeout(1000)
    
    await page.click('a[href="#projects"]')
    await page.waitForTimeout(1000)
    
    // Use browser back button
    await page.goBack()
    await page.waitForTimeout(1000)
    
    // Should be back at about section or home
    const url = page.url()
    expect(url.includes('#about') || url.endsWith('/')).toBeTruthy()
  })
})