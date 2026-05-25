import { test, expect } from '@playwright/test';

test.describe('Homepage E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for React to hydrate
    await expect(page.locator('header')).toBeVisible();
  });

  test('should load homepage successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Lucaverse/);
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('should display all navigation sections', async ({ page }) => {
    // Nav links use i18n text. English defaults: Home, About, Projects, Blog, Contact Me
    // Use the nav element to scope and avoid footer link ambiguity
    const nav = page.locator('header nav');
    await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'About' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Projects' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Blog' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Contact Me' })).toBeVisible();
  });

  test('should navigate to sections when clicking nav links', async ({ page }) => {
    const nav = page.locator('header nav');

    // Click About link and verify the #about section scrolls into view
    await nav.getByRole('link', { name: 'About' }).click();
    await expect(page.locator('#about')).toBeInViewport({ timeout: 5000 });

    // Click Projects link
    await nav.getByRole('link', { name: 'Projects' }).click();
    await expect(page.locator('#projects')).toBeInViewport({ timeout: 5000 });

    // Click Contact Me link
    await nav.getByRole('link', { name: 'Contact Me' }).click();
    await expect(page.locator('#contact')).toBeInViewport({ timeout: 5000 });
  });

  test('should have working language toggle', async ({ page }) => {
    // Header renders TWO LanguageToggle components: one desktop (inside .rightSection)
    // and one mobile (inside .mobileActions, hidden on desktop viewport).
    // Ensure desktop viewport so the desktop toggle is visible.
    await page.setViewportSize({ width: 1280, height: 800 });

    // The toggle button text is exactly "EN" or "PT" with a title attr.
    // Scope to visible buttons only — the desktop one is visible at 1280px wide.
    const languageToggle = page.locator('button[title^="Switch to"]').filter({ visible: true }).first();

    await expect(languageToggle).toContainText('EN');

    await languageToggle.click();
    await page.waitForTimeout(600);
    await expect(languageToggle).toContainText('PT');

    await languageToggle.click();
    await page.waitForTimeout(600);
    await expect(languageToggle).toContainText('EN');
  });

  test('should display flag animation when switching languages', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const languageToggle = page.locator('button[title^="Switch to"]').filter({ visible: true }).first();

    // data-flag div flashes for 250ms then is removed from DOM.
    // Two LanguageToggle instances exist (desktop + mobile); scope to the first [data-flag].
    const flagEl = page.locator('[data-flag]').first();

    await languageToggle.click();

    // Wait for the element to appear in DOM (attached), then disappear (detached)
    await flagEl.waitFor({ state: 'attached', timeout: 1000 });
    await flagEl.waitFor({ state: 'detached', timeout: 2000 });
  });

  test('should show hero section with correct content', async ({ page }) => {
    // Hero section has id="home" (no stable class in the DOM after CSS Modules transform)
    const heroSection = page.locator('#home');
    await expect(heroSection).toBeVisible();

    // h1 inside the hero section
    await expect(heroSection.locator('h1').first()).toBeVisible();
  });

  test('should display about section with content', async ({ page }) => {
    const aboutSection = page.locator('#about');
    await expect(aboutSection).toBeVisible();

    await aboutSection.scrollIntoViewIfNeeded();
    await expect(aboutSection.locator('h2, h3').first()).toBeVisible();
  });

  test('should display projects section', async ({ page }) => {
    const projectsSection = page.locator('#projects');
    await expect(projectsSection).toBeVisible();

    await projectsSection.scrollIntoViewIfNeeded();
    await expect(projectsSection.locator('h2, h3').first()).toBeVisible();
  });

  test('should display contact section with form', async ({ page }) => {
    const contactSection = page.locator('#contact');
    await expect(contactSection).toBeVisible();

    await contactSection.scrollIntoViewIfNeeded();

    await expect(contactSection.locator('form')).toBeVisible();
    await expect(contactSection.locator('input[name="name"]')).toBeVisible();
    await expect(contactSection.locator('input[name="email"]')).toBeVisible();
    await expect(contactSection.locator('textarea[name="message"]')).toBeVisible();
  });

  test('should have responsive design', async ({ page }) => {
    // Desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('header')).toBeVisible();

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('header')).toBeVisible();

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('header')).toBeVisible();
  });

  test('should handle smooth scrolling between sections', async ({ page }) => {
    const nav = page.locator('header nav');

    await nav.getByRole('link', { name: 'About' }).click();
    await page.waitForTimeout(1000);
    await expect(page.locator('#about')).toBeInViewport();

    await nav.getByRole('link', { name: 'Projects' }).click();
    await page.waitForTimeout(1000);
    await expect(page.locator('#projects')).toBeInViewport();
  });

  test('should load all critical resources', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toBeVisible();

    const images = page.locator('img');
    const imageCount = await images.count();
    if (imageCount > 0) {
      await expect(images.first()).toBeVisible();
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('should have proper meta tags and SEO elements', async ({ page }) => {
    const metaDescription = page.locator('meta[name="description"]');
    if (await metaDescription.count() > 0) {
      const content = await metaDescription.getAttribute('content');
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(10);
    }

    const canonical = page.locator('link[rel="canonical"]');
    if (await canonical.count() > 0) {
      const href = await canonical.getAttribute('href');
      expect(href).toBeTruthy();
    }
  });

  // --- New: Route tests ---

  test('hash route /#login renders login page', async ({ page }) => {
    await page.goto('/#login');
    // LucaverseLogin renders a "Continue with Google" button
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible({ timeout: 10000 });
  });

  test('hash route /#dashboard shows access denied when unauthenticated', async ({ page }) => {
    // Clear any existing auth tokens
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/#dashboard');
    // Dashboard renders "Access Denied" when no valid session exists
    await expect(page.getByRole('heading', { name: /Access Denied/i })).toBeVisible({ timeout: 10000 });
  });

  test('Google OAuth popup opens with correct auth URL', async ({ page }) => {
    await page.goto('/#login');
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();

    // Spy on window.open before clicking so we capture the call
    await page.evaluate(() => {
      window._oauthPopupUrl = null;
      const original = window.open.bind(window);
      window.open = (url, target, features) => {
        window._oauthPopupUrl = url;
        // Return a mock popup object so the login handler doesn't alert "blocked"
        return {
          closed: false,
          close: () => {},
        };
      };
    });

    await page.getByRole('button', { name: /Continue with Google/i }).click();

    // Give the click handler time to call window.open
    await page.waitForTimeout(500);

    const popupUrl = await page.evaluate(() => window._oauthPopupUrl);
    expect(popupUrl).toBeTruthy();
    // In development the auth worker runs on localhost:8787.
    // In production it runs on lucaverse-auth.lucianoaf8.workers.dev.
    // Assert the structural contract (path + query param) not the specific host.
    expect(popupUrl).toContain('/auth/google');
    expect(popupUrl).toContain('origin=');
  });
});
