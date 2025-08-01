import { test, expect } from '@playwright/test'
import { TEST_DATA, FORM_SUBMISSION_TIMEOUT, scrollToElement, waitForPageLoad } from '../utils/test-helpers.js'

test.describe('Contact Form Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForPageLoad(page)
    
    // Navigate to contact section
    await page.click('a[href="#contact"]')
    await page.waitForTimeout(1000)
  })

  test('should display contact form with all required fields', async ({ page }) => {
    // Scroll to contact section
    await scrollToElement(page, '#contact')

    // Check form is visible
    const form = page.locator('form').first()
    await expect(form).toBeVisible()

    // Check required form fields
    const nameField = page.locator('input[name="name"], input[placeholder*="name" i]')
    await expect(nameField.first()).toBeVisible()

    const emailField = page.locator('input[name="email"], input[type="email"], input[placeholder*="email" i]')
    await expect(emailField.first()).toBeVisible()

    const subjectField = page.locator('input[name="subject"], input[placeholder*="subject" i]')
    await expect(subjectField.first()).toBeVisible()

    const messageField = page.locator('textarea[name="message"], textarea[placeholder*="message" i]')
    await expect(messageField.first()).toBeVisible()

    // Check submit button
    const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /send|submit/i })
    await expect(submitButton.first()).toBeVisible()
  })

  test('should require valid email format', async ({ page }) => {
    await scrollToElement(page, '#contact')

    // Fill form with invalid email
    await page.fill('input[name="name"], input[placeholder*="name" i]', TEST_DATA.validContactForm.name)
    await page.fill('input[name="email"], input[type="email"]', TEST_DATA.invalidEmail)
    await page.fill('input[name="subject"], input[placeholder*="subject" i]', TEST_DATA.validContactForm.subject)
    await page.fill('textarea[name="message"], textarea[placeholder*="message" i]', TEST_DATA.validContactForm.message)

    // Try to submit
    const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /send|submit/i })
    await submitButton.first().click()

    // Wait a moment for validation
    await page.waitForTimeout(1000)

    // Check for validation error (browser validation or custom validation)
    const emailField = page.locator('input[name="email"], input[type="email"]').first()
    const isInvalid = await emailField.evaluate(el => !el.validity.valid).catch(() => false)
    
    // Either browser validation should catch it, or form shouldn't submit
    expect(isInvalid).toBeTruthy()
  })

  test('should require all mandatory fields', async ({ page }) => {
    await scrollToElement(page, '#contact')

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /send|submit/i })
    await submitButton.first().click()
    await page.waitForTimeout(1000)

    // Check that required fields show validation errors
    const requiredFields = [
      'input[name="name"], input[placeholder*="name" i]',
      'input[name="email"], input[type="email"]',
      'textarea[name="message"], textarea[placeholder*="message" i]'
    ]

    for (const fieldSelector of requiredFields) {
      const field = page.locator(fieldSelector).first()
      if (await field.count() > 0) {
        const isRequired = await field.getAttribute('required') !== null
        const isInvalid = await field.evaluate(el => !el.validity.valid).catch(() => false)
        
        if (isRequired) {
          expect(isInvalid).toBeTruthy()
        }
      }
    }
  })

  test('should fill and submit form with valid data', async ({ page }) => {
    await scrollToElement(page, '#contact')

    // Fill form with valid data
    await page.fill('input[name="name"], input[placeholder*="name" i]', TEST_DATA.validContactForm.name)
    await page.fill('input[name="email"], input[type="email"]', TEST_DATA.validContactForm.email)
    
    // Subject field might not be required
    const subjectField = page.locator('input[name="subject"], input[placeholder*="subject" i]')
    if (await subjectField.count() > 0) {
      await page.fill('input[name="subject"], input[placeholder*="subject" i]', TEST_DATA.validContactForm.subject)
    }
    
    await page.fill('textarea[name="message"], textarea[placeholder*="message" i]', TEST_DATA.validContactForm.message)

    // Submit form
    const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /send|submit/i })
    await submitButton.first().click()

    // Wait for form submission response
    await page.waitForTimeout(3000)

    // Check for success indication (could be notification, redirect, or form reset)
    const possibleSuccessIndicators = [
      page.locator('text=/success|sent|thank/i'),
      page.locator('[class*="success"], [class*="notification"]'),
      page.locator('.toast, .alert')
    ]

    let successFound = false
    for (const indicator of possibleSuccessIndicators) {
      if (await indicator.count() > 0 && await indicator.first().isVisible()) {
        successFound = true
        break
      }
    }

    // Alternative: check if form was reset (indicates successful submission)
    const nameFieldAfter = page.locator('input[name="name"], input[placeholder*="name" i]').first()
    const isFormReset = await nameFieldAfter.inputValue() === ''

    expect(successFound || isFormReset).toBeTruthy()
  })

  test('should display contact information', async ({ page }) => {
    await scrollToElement(page, '#contact')

    // Check for contact details
    const contactInfo = [
      page.locator('text=/canada/i'),
      page.locator('text=/brazil/i'),
      page.locator('text=/email/i'),
      page.locator('text=/address/i')
    ]

    // At least some contact information should be visible
    let infoFound = false
    for (const info of contactInfo) {
      if (await info.count() > 0) {
        infoFound = true
        break
      }
    }

    expect(infoFound).toBeTruthy()
  })

  test('should display social media links', async ({ page }) => {
    await scrollToElement(page, '#contact')

    // Look for social media links
    const socialLinks = page.locator('a[aria-label*="GitHub" i], a[aria-label*="LinkedIn" i], a[aria-label*="Twitter" i], a[aria-label*="Medium" i]')
    
    // Should have at least one social link
    const socialCount = await socialLinks.count()
    expect(socialCount).toBeGreaterThan(0)

    // Check that social links are visible
    for (const link of await socialLinks.all()) {
      await expect(link).toBeVisible()
    }
  })

  test('should handle form field focus and interaction', async ({ page }) => {
    await scrollToElement(page, '#contact')

    // Test field focus
    const nameField = page.locator('input[name="name"], input[placeholder*="name" i]').first()
    await nameField.click()
    await expect(nameField).toBeFocused()

    // Test typing
    await nameField.fill('Test User')
    const value = await nameField.inputValue()
    expect(value).toBe('Test User')

    // Test moving between fields
    await page.keyboard.press('Tab')
    const emailField = page.locator('input[name="email"], input[type="email"]').first()
    await expect(emailField).toBeFocused()
  })

  test('should handle form submission loading state', async ({ page }) => {
    await scrollToElement(page, '#contact')

    // Fill form
    await page.fill('input[name="name"], input[placeholder*="name" i]', TEST_DATA.validContactForm.name)
    await page.fill('input[name="email"], input[type="email"]', TEST_DATA.validContactForm.email)
    await page.fill('textarea[name="message"], textarea[placeholder*="message" i]', TEST_DATA.validContactForm.message)

    // Submit and immediately check for loading state
    const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /send|submit/i }).first()
    await submitButton.click()

    // Check if button shows loading state
    await page.waitForTimeout(500)
    const buttonText = await submitButton.textContent()
    const isLoading = buttonText.toLowerCase().includes('sending') || 
                     buttonText.toLowerCase().includes('loading') ||
                     await submitButton.isDisabled()

    // Form should show some kind of loading state
    expect(isLoading).toBeTruthy()
  })

  test('should be responsive on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.click('a[href="#contact"]')
    await page.waitForTimeout(1000)
    await scrollToElement(page, '#contact')

    // Form should still be visible and usable on mobile
    const form = page.locator('form').first()
    await expect(form).toBeVisible()

    // Fields should be properly sized for mobile
    const nameField = page.locator('input[name="name"], input[placeholder*="name" i]').first()
    const boundingBox = await nameField.boundingBox()
    
    if (boundingBox) {
      // Field should be wide enough for mobile interaction
      expect(boundingBox.width).toBeGreaterThan(250)
    }
  })
})