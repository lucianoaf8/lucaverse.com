import { test, expect } from '@playwright/test';

test.describe('Homepage E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
  });

  test('should load homepage successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Lucaverse/);
    
    // Check main sections are visible
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('should display all navigation sections', async ({ page }) => {
    // Check navigation links
    await expect(page.getByRole('link', { name: /home/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /about/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /projects/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /blog/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /contact/i })).toBeVisible();
  });

  test('should navigate to sections when clicking nav links', async ({ page }) => {
    // Click about link and verify navigation
    await page.getByRole('link', { name: /about/i }).click();
    await expect(page.locator('#about')).toBeInViewport();
    
    // Click projects link
    await page.getByRole('link', { name: /projects/i }).click();
    await expect(page.locator('#projects')).toBeInViewport();
    
    // Click contact link
    await page.getByRole('link', { name: /contact/i }).click();
    await expect(page.locator('#contact')).toBeInViewport();
  });

  test('should have working language toggle', async ({ page }) => {
    const languageToggle = page.getByRole('button', { name: /switch to/i });
    
    // Check initial language (should be EN)
    await expect(languageToggle).toContainText('EN');
    
    // Click to switch language
    await languageToggle.click();
    
    // Wait for language change animation
    await page.waitForTimeout(500);
    
    // Should now show PT
    await expect(languageToggle).toContainText('PT');
    
    // Switch back to English
    await languageToggle.click();
    await page.waitForTimeout(500);
    await expect(languageToggle).toContainText('EN');
  });

  test('should display flag animation when switching languages', async ({ page }) => {
    const languageToggle = page.getByRole('button', { name: /switch to/i });
    
    // Click to switch language
    await languageToggle.click();
    
    // Check that flag animation appears
    await expect(page.locator('[data-flag]')).toBeVisible();
    
    // Wait for animation to complete
    await expect(page.locator('[data-flag]')).toBeHidden({ timeout: 1000 });
  });

  test('should show hero section with correct content', async ({ page }) => {
    // Check hero section is visible
    const heroSection = page.locator('.hero, [data-testid="hero"]').first();
    await expect(heroSection).toBeVisible();
    
    // Check for key hero elements (adjust selectors based on actual implementation)
    await expect(page.locator('h1, .hero-title').first()).toBeVisible();
  });

  test('should display about section with content', async ({ page }) => {
    const aboutSection = page.locator('#about');
    await expect(aboutSection).toBeVisible();
    
    // Scroll to about section
    await aboutSection.scrollIntoViewIfNeeded();
    
    // Check for about content
    await expect(aboutSection.locator('h2, h3').first()).toBeVisible();
  });

  test('should display projects section', async ({ page }) => {
    const projectsSection = page.locator('#projects');
    await expect(projectsSection).toBeVisible();
    
    // Scroll to projects section
    await projectsSection.scrollIntoViewIfNeeded();
    
    // Check for project cards or content
    await expect(projectsSection.locator('h2, h3').first()).toBeVisible();
  });

  test('should display contact section with form', async ({ page }) => {
    const contactSection = page.locator('#contact');
    await expect(contactSection).toBeVisible();
    
    // Scroll to contact section
    await contactSection.scrollIntoViewIfNeeded();
    
    // Check for contact form
    await expect(contactSection.locator('form')).toBeVisible();
    await expect(contactSection.locator('input[name="name"]')).toBeVisible();
    await expect(contactSection.locator('input[name="email"]')).toBeVisible();
    await expect(contactSection.locator('textarea[name="message"]')).toBeVisible();
  });

  test('should have responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('header')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('header')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('header')).toBeVisible();
  });

  test('should handle smooth scrolling between sections', async ({ page }) => {
    // Click about link
    await page.getByRole('link', { name: /about/i }).click();
    
    // Wait for scroll animation
    await page.waitForTimeout(1000);
    
    // Check that about section is in viewport
    await expect(page.locator('#about')).toBeInViewport();
    
    // Click projects link
    await page.getByRole('link', { name: /projects/i }).click();
    await page.waitForTimeout(1000);
    await expect(page.locator('#projects')).toBeInViewport();
  });

  test('should load all critical resources', async ({ page }) => {
    // Check that CSS is loaded (header should have styling)
    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    // Check that images load (if any)
    const images = page.locator('img');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      // Wait for first image to load
      await expect(images.first()).toBeVisible();
    }
    
    // Check that fonts load (text should be visible)
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have proper meta tags and SEO elements', async ({ page }) => {
    // Check meta description
    const metaDescription = page.locator('meta[name="description"]');
    if (await metaDescription.count() > 0) {
      const content = await metaDescription.getAttribute('content');
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(10);
    }
    
    // Check canonical URL if present
    const canonical = page.locator('link[rel="canonical"]');
    if (await canonical.count() > 0) {
      const href = await canonical.getAttribute('href');
      expect(href).toBeTruthy();
    }
  });
});