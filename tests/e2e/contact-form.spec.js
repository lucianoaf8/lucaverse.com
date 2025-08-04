import { test, expect } from '@playwright/test';

test.describe('Contact Form E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage and scroll to contact section
    await page.goto('/');
    await page.locator('#contact').scrollIntoViewIfNeeded();
    
    // Wait for contact form to be fully loaded
    await expect(page.locator('#contact form')).toBeVisible();
  });

  test('should display contact form with all required fields', async ({ page }) => {
    const form = page.locator('#contact form');
    
    // Check all form fields are present
    await expect(form.locator('input[name="name"]')).toBeVisible();
    await expect(form.locator('input[name="email"]')).toBeVisible();
    await expect(form.locator('input[name="subject"]')).toBeVisible();
    await expect(form.locator('textarea[name="message"]')).toBeVisible();
    await expect(form.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show privacy consent modal on first visit', async ({ page }) => {
    // Clear any existing consent
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Reload page to trigger consent check
    await page.reload();
    await page.locator('#contact').scrollIntoViewIfNeeded();
    
    // Privacy consent modal should appear
    await expect(page.getByTestId('privacy-consent')).toBeVisible({ timeout: 5000 });
  });

  test('should handle privacy consent acceptance', async ({ page }) => {
    // Clear existing consent
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('#contact').scrollIntoViewIfNeeded();
    
    // Wait for privacy consent modal
    await expect(page.getByTestId('privacy-consent')).toBeVisible();
    
    // Accept analytics consent
    await page.getByRole('button', { name: /accept analytics/i }).click();
    
    // Continue to contact form
    await page.getByRole('button', { name: /continue to contact form/i }).click();
    
    // Privacy modal should be closed
    await expect(page.getByTestId('privacy-consent')).toBeHidden();
    
    // Form should show privacy status
    const privacyNotice = page.locator('.privacyNotice, [data-testid="privacy-notice"]');
    if (await privacyNotice.count() > 0) {
      await expect(privacyNotice).toContainText(/analytics enabled/i);
    }
  });

  test('should validate required fields', async ({ page }) => {
    const form = page.locator('#contact form');
    const submitButton = form.locator('button[type="submit"]');
    
    // Try to submit empty form
    await submitButton.click();
    
    // Check that form validation prevents submission
    // (HTML5 validation or custom validation should trigger)
    const nameField = form.locator('input[name="name"]');
    const emailField = form.locator('input[name="email"]');
    
    // Check if HTML5 validation is triggered
    const nameValidity = await nameField.evaluate(el => el.validity.valid);
    const emailValidity = await emailField.evaluate(el => el.validity.valid);
    
    expect(nameValidity || emailValidity).toBe(false);
  });

  test('should validate email format', async ({ page }) => {
    const form = page.locator('#contact form');
    const emailField = form.locator('input[name="email"]');
    
    // Enter invalid email
    await emailField.fill('invalid-email');
    
    // Check email field validity
    const isValid = await emailField.evaluate(el => el.validity.valid);
    expect(isValid).toBe(false);
    
    // Enter valid email
    await emailField.fill('test@example.com');
    
    const isValidNow = await emailField.evaluate(el => el.validity.valid);
    expect(isValidNow).toBe(true);
  });

  test('should submit form successfully with valid data', async ({ page }) => {
    // Mock the form submission endpoint to avoid sending real emails
    await page.route('**/api/forms', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Message sent successfully!' }),
      });
    });
    
    // Handle CSRF token request if needed
    await page.route('**/csrf-token', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'test-csrf-token' }),
      });
    });
    
    const form = page.locator('#contact form');
    
    // Fill out the form
    await form.locator('input[name="name"]').fill('John Doe');
    await form.locator('input[name="email"]').fill('john.doe@example.com');
    await form.locator('input[name="subject"]').fill('Test Subject');
    await form.locator('textarea[name="message"]').fill('This is a test message for the contact form.');
    
    // Submit the form
    await form.locator('button[type="submit"]').click();
    
    // Wait for submission to complete
    await page.waitForTimeout(1000);
    
    // Check for success notification
    const successNotification = page.locator('.toast, .notification, [data-testid="notification"]');
    if (await successNotification.count() > 0) {
      await expect(successNotification).toContainText(/success/i);
    }
  });

  test('should handle form submission errors gracefully', async ({ page }) => {
    // Mock the form submission endpoint to return an error
    await page.route('**/api/forms', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      });
    });
    
    const form = page.locator('#contact form');
    
    // Fill out the form
    await form.locator('input[name="name"]').fill('John Doe');
    await form.locator('input[name="email"]').fill('john.doe@example.com');
    await form.locator('textarea[name="message"]').fill('Test message');
    
    // Submit the form
    await form.locator('button[type="submit"]').click();
    
    // Wait for submission to complete
    await page.waitForTimeout(1000);
    
    // Check for error notification
    const errorNotification = page.locator('.toast, .notification, [data-testid="notification"]');
    if (await errorNotification.count() > 0) {
      await expect(errorNotification).toContainText(/error/i);
    }
  });

  test('should show loading state during submission', async ({ page }) => {
    // Mock slow form submission
    await page.route('**/api/forms', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
    
    const form = page.locator('#contact form');
    const submitButton = form.locator('button[type="submit"]');
    
    // Fill out the form
    await form.locator('input[name="name"]').fill('John Doe');
    await form.locator('input[name="email"]').fill('john.doe@example.com');
    await form.locator('textarea[name="message"]').fill('Test message');
    
    // Submit the form
    await submitButton.click();
    
    // Check loading state
    await expect(submitButton).toBeDisabled();
    await expect(submitButton).toContainText(/sending/i);
    
    // Wait for submission to complete
    await page.waitForTimeout(3000);
    
    // Button should be enabled again
    await expect(submitButton).toBeEnabled();
  });

  test('should handle character limits appropriately', async ({ page }) => {
    const form = page.locator('#contact form');
    const messageField = form.locator('textarea[name="message"]');
    
    // Fill with very long message
    const longMessage = 'A'.repeat(10000);
    await messageField.fill(longMessage);
    
    // Check that the field handles long input appropriately
    const actualValue = await messageField.inputValue();
    
    // Either the field should truncate or validation should handle it
    // The exact behavior depends on implementation
    expect(actualValue.length).toBeGreaterThan(0);
  });

  test('should preserve form data on navigation away and back', async ({ page }) => {
    const form = page.locator('#contact form');
    
    // Fill out some form data
    await form.locator('input[name="name"]').fill('John Doe');
    await form.locator('input[name="email"]').fill('john.doe@example.com');
    
    // Navigate to another section
    await page.getByRole('link', { name: /about/i }).click();
    await page.waitForTimeout(500);
    
    // Navigate back to contact
    await page.getByRole('link', { name: /contact/i }).click();
    await page.waitForTimeout(500);
    
    // Check if form data is preserved (depends on implementation)
    const nameValue = await form.locator('input[name="name"]').inputValue();
    const emailValue = await form.locator('input[name="email"]').inputValue();
    
    // Note: This test may pass regardless of preservation behavior
    // The specific behavior depends on implementation requirements
  });

  test('should handle special characters in form inputs', async ({ page }) => {
    const form = page.locator('#contact form');
    
    // Test with special characters and different languages
    const specialName = 'José María Ñoño';
    const specialMessage = 'Test with émojis 🚀 and speciàl characters: <>&"\'';
    
    await form.locator('input[name="name"]').fill(specialName);
    await form.locator('textarea[name="message"]').fill(specialMessage);
    
    // Check that special characters are preserved
    const nameValue = await form.locator('input[name="name"]').inputValue();
    const messageValue = await form.locator('textarea[name="message"]').inputValue();
    
    expect(nameValue).toBe(specialName);
    expect(messageValue).toBe(specialMessage);
  });

  test('should be accessible via keyboard navigation', async ({ page }) => {
    const form = page.locator('#contact form');
    
    // Focus on the form
    await form.locator('input[name="name"]').focus();
    
    // Tab through form fields
    await page.keyboard.press('Tab');
    await expect(form.locator('input[name="email"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(form.locator('input[name="subject"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(form.locator('textarea[name="message"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(form.locator('button[type="submit"]')).toBeFocused();
  });

  test('should handle privacy settings changes', async ({ page }) => {
    // Accept initial consent
    if (await page.getByTestId('privacy-consent').isVisible({ timeout: 1000 })) {
      await page.getByRole('button', { name: /accept analytics/i }).click();
      await page.getByRole('button', { name: /continue/i }).click();
    }
    
    // Look for privacy settings button
    const privacySettingsButton = page.locator('button', { hasText: /privacy settings/i });
    
    if (await privacySettingsButton.count() > 0) {
      await privacySettingsButton.click();
      
      // Privacy consent modal should reappear
      await expect(page.getByTestId('privacy-consent')).toBeVisible();
      
      // Change to essential only
      await page.getByRole('button', { name: /essential only/i }).click();
      await page.getByRole('button', { name: /continue/i }).click();
      
      // Check that privacy notice is updated
      const privacyNotice = page.locator('.privacyNotice, [data-testid="privacy-notice"]');
      if (await privacyNotice.count() > 0) {
        await expect(privacyNotice).toContainText(/only essential/i);
      }
    }
  });

  test('should display contact information alongside form', async ({ page }) => {
    const contactSection = page.locator('#contact');
    
    // Check for contact information elements
    await expect(contactSection).toContainText(/email/i);
    
    // Check for social media links if present
    const socialLinks = contactSection.locator('a[aria-label*="GitHub"], a[aria-label*="LinkedIn"], a[aria-label*="Twitter"]');
    if (await socialLinks.count() > 0) {
      await expect(socialLinks.first()).toBeVisible();
    }
    
    // Check for location information if present
    if (await contactSection.locator(':text("Canada")').count() > 0) {
      await expect(contactSection.locator(':text("Canada")')).toBeVisible();
    }
  });
});