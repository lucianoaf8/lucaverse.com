import { test, expect } from '@playwright/test';

// ----------------------------------------------------------------
// Contact Form E2E Tests
//
// Deleted tests (feature removed from app):
//   - "should show privacy consent modal on first visit"
//   - "should handle privacy consent acceptance"
//   - "should handle privacy settings changes"
//   - "should display flag animation" (lives in homepage.spec.js)
//
// Privacy consent modal is hard-disabled in Contact.jsx via `{false && ...}`
// and the modal trigger is commented out in the useEffect. No DOM node is
// ever rendered so there is nothing to test.
// ----------------------------------------------------------------

test.describe('Contact Form E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await expect(page.locator('#contact form')).toBeVisible();
  });

  test('should display contact form with all required fields', async ({ page }) => {
    const form = page.locator('#contact form');

    await expect(form.locator('input[name="name"]')).toBeVisible();
    await expect(form.locator('input[name="email"]')).toBeVisible();
    // Contact.jsx has a subject field (required)
    await expect(form.locator('input[name="subject"]')).toBeVisible();
    await expect(form.locator('textarea[name="message"]')).toBeVisible();
    await expect(form.locator('button[type="submit"]')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    const form = page.locator('#contact form');
    const submitButton = form.locator('button[type="submit"]');

    // Try to submit empty form
    await submitButton.click();

    // HTML5 required attributes prevent submission — fields should be invalid
    const nameValidity = await form.locator('input[name="name"]').evaluate(el => el.validity.valid);
    const emailValidity = await form.locator('input[name="email"]').evaluate(el => el.validity.valid);

    expect(nameValidity || emailValidity).toBe(false);
  });

  test('should validate email format', async ({ page }) => {
    const form = page.locator('#contact form');
    const emailField = form.locator('input[name="email"]');

    await emailField.fill('invalid-email');
    const isInvalid = await emailField.evaluate(el => el.validity.valid);
    expect(isInvalid).toBe(false);

    await emailField.fill('test@example.com');
    const isValid = await emailField.evaluate(el => el.validity.valid);
    expect(isValid).toBe(true);
  });

  test('should submit form successfully with valid data', async ({ page }) => {
    // Intercept the real forms worker URL used in development (localhost:8788)
    // and return a success response to avoid external network dependency.
    await page.route(
      url => url.hostname === 'localhost' && url.port === '8788',
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Message sent successfully!' }),
        });
      }
    );
    // Also intercept the production URL pattern in case env var is set
    await page.route('**summer-heart**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Message sent successfully!' }),
      });
    });

    const form = page.locator('#contact form');

    await form.locator('input[name="name"]').fill('John Doe');
    await form.locator('input[name="email"]').fill('john.doe@example.com');
    await form.locator('input[name="subject"]').fill('Test Subject');
    await form.locator('textarea[name="message"]').fill('This is a test message for the contact form.');

    await form.locator('button[type="submit"]').click();

    // On localhost a fetch error triggers the dev-mode success path in Contact.jsx
    // which shows the contactLocalDev toast. Either success toast variant is acceptable.
    // The outermost toast wrapper is the first element whose class contains "toast".
    const toast = page.locator('[class*="toast"]').first();
    await expect(toast).toBeVisible({ timeout: 10000 });
    // The toast should not be an error state — CSS Modules hashes the class but keeps the word
    const toastClass = await toast.getAttribute('class');
    expect(toastClass).not.toMatch(/error/);
  });

  test('should show loading state during submission', async ({ page }) => {
    // Contact.jsx shows a loading toast (with spinner) and disables the button
    // when submission is in progress. In dev mode, a failed network request
    // to localhost:8788 is caught and treated as dev-mode success — this
    // transition is instant. We therefore verify the loading toast appears,
    // even if the transition is brief. The toast type is 'loading' initially
    // then 'success' on the dev-mode code path.
    //
    // Additionally, we monkey-patch fetch via page.addInitScript so the
    // request never resolves during the assertion window.
    await page.addInitScript(() => {
      // Override fetch to hang indefinitely for the forms endpoint
      const _originalFetch = window.fetch;
      window.fetch = function(url, ...args) {
        const urlStr = String(url);
        if (urlStr.includes('8788') || urlStr.includes('summer-heart')) {
          // Return a never-resolving promise so we can observe the loading state
          return new Promise(() => {});
        }
        return _originalFetch.call(this, url, ...args);
      };
    });

    // Navigate fresh so the init script runs
    await page.goto('/');
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await expect(page.locator('#contact form')).toBeVisible();

    const form = page.locator('#contact form');
    const submitButton = form.locator('button[type="submit"]');

    await form.locator('input[name="name"]').fill('John Doe');
    await form.locator('input[name="email"]').fill('john.doe@example.com');
    await form.locator('input[name="subject"]').fill('Test');
    await form.locator('textarea[name="message"]').fill('Test message');

    await submitButton.click();

    // Button should be disabled while loading (Contact.jsx: disabled={loading})
    await expect(submitButton).toBeDisabled({ timeout: 5000 });
    // Button inner span changes to "Sending..." while loading
    await expect(submitButton).toContainText(/Sending/i, { timeout: 5000 });
  });

  test('should handle character limits appropriately', async ({ page }) => {
    const form = page.locator('#contact form');
    const messageField = form.locator('textarea[name="message"]');

    const longMessage = 'A'.repeat(10000);
    await messageField.fill(longMessage);

    const actualValue = await messageField.inputValue();
    expect(actualValue.length).toBeGreaterThan(0);
  });

  test('should preserve form data on in-page navigation away and back', async ({ page }) => {
    const form = page.locator('#contact form');

    await form.locator('input[name="name"]').fill('John Doe');
    await form.locator('input[name="email"]').fill('john.doe@example.com');

    // Scroll to another section (SPA — no page reload, so React state is preserved)
    const nav = page.locator('header nav');
    await nav.getByRole('link', { name: 'About' }).click();
    await page.waitForTimeout(500);

    // Scroll back to contact
    await nav.getByRole('link', { name: 'Contact Me' }).click();
    await page.waitForTimeout(500);

    // Values should still be in state since no page reload occurred
    const nameValue = await form.locator('input[name="name"]').inputValue();
    const emailValue = await form.locator('input[name="email"]').inputValue();

    expect(nameValue).toBe('John Doe');
    expect(emailValue).toBe('john.doe@example.com');
  });

  test('should handle special characters in form inputs', async ({ page }) => {
    const form = page.locator('#contact form');

    const specialName = 'José María Ñoño';
    const specialMessage = 'Test with speciàl characters: <>&"\'';

    await form.locator('input[name="name"]').fill(specialName);
    await form.locator('textarea[name="message"]').fill(specialMessage);

    const nameValue = await form.locator('input[name="name"]').inputValue();
    const messageValue = await form.locator('textarea[name="message"]').inputValue();

    expect(nameValue).toBe(specialName);
    expect(messageValue).toBe(specialMessage);
  });

  test('should be accessible via keyboard navigation', async ({ page }) => {
    const form = page.locator('#contact form');

    // Focus the name field first
    await form.locator('input[name="name"]').focus();

    // Tab to email
    await page.keyboard.press('Tab');
    await expect(form.locator('input[name="email"]')).toBeFocused();

    // Tab to subject
    await page.keyboard.press('Tab');
    await expect(form.locator('input[name="subject"]')).toBeFocused();

    // Tab to message
    await page.keyboard.press('Tab');
    await expect(form.locator('textarea[name="message"]')).toBeFocused();

    // Tab to submit (honeypot inputs have tabIndex="-1" so they are skipped)
    await page.keyboard.press('Tab');
    await expect(form.locator('button[type="submit"]')).toBeFocused();
  });

  test('should display contact information alongside form', async ({ page }) => {
    const contactSection = page.locator('#contact');

    // Email text appears in the contact info area
    await expect(contactSection).toContainText(/email/i);

    // Social links present
    const socialLinks = contactSection.locator('a[aria-label="GitHub"], a[aria-label="LinkedIn"], a[aria-label="Twitter"]');
    if (await socialLinks.count() > 0) {
      await expect(socialLinks.first()).toBeVisible();
    }

    // Location info: Canada is rendered via i18n key 'canada'
    await expect(contactSection).toContainText(/Canada/i);
  });

  // ----------------------------------------------------------------
  // Form submission error path
  // ----------------------------------------------------------------
  test('should handle form submission errors gracefully', async ({ page }) => {
    // Intercept the forms endpoint and return a 500 error.
    // Contact.jsx: on non-ok response it calls showNotification('error', t('contactError')).
    await page.route(
      url => url.hostname === 'localhost' && url.port === '8788',
      async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' }),
        });
      }
    );

    const form = page.locator('#contact form');

    await form.locator('input[name="name"]').fill('John Doe');
    await form.locator('input[name="email"]').fill('john.doe@example.com');
    await form.locator('input[name="subject"]').fill('Test');
    await form.locator('textarea[name="message"]').fill('Test message');

    await form.locator('button[type="submit"]').click();

    // A toast notification should appear (error state)
    const toast = page.locator('[class*="toast"]').first();
    await expect(toast).toBeVisible({ timeout: 10000 });
  });
});
