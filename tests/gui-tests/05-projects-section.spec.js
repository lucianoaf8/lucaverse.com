import { test, expect } from '@playwright/test'
import { EXTERNAL_LINKS, scrollToElement, waitForPageLoad, checkExternalLink } from '../utils/test-helpers.js'

test.describe('Projects Section Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForPageLoad(page)
    
    // Navigate to projects section
    await page.click('a[href="#projects"]')
    await page.waitForTimeout(1000)
  })

  test('should display projects section with title', async ({ page }) => {
    await scrollToElement(page, '#projects')

    // Check section is visible
    const projectsSection = page.locator('#projects')
    await expect(projectsSection).toBeVisible()

    // Check section title
    const sectionTitle = page.locator('#projects h2, #projects .section-title, #projects [class*="title"]')
    await expect(sectionTitle.first()).toBeVisible()

    const titleText = await sectionTitle.first().textContent()
    expect(titleText.toLowerCase()).toMatch(/project/i)
  })

  test('should display project cards', async ({ page }) => {
    await scrollToElement(page, '#projects')

    // Look for project cards or project items
    const projectCards = page.locator('#projects [class*="card"], #projects [class*="project"]')
    const projectCount = await projectCards.count()
    
    expect(projectCount).toBeGreaterThan(0)

    // Each project card should be visible
    for (const card of await projectCards.all()) {
      await expect(card).toBeVisible()
    }
  })

  test('should display Audio Transcription project', async ({ page }) => {
    await scrollToElement(page, '#projects')

    // Look for audio transcription project
    const audioProject = page.locator('text=/audio.*transcript/i, text=/transcript/i').first()
    
    if (await audioProject.count() > 0) {
      await expect(audioProject).toBeVisible()
      
      // Check for related technologies/tags
      const audioTags = page.locator('text=/openai|whisper|audio/i')
      const tagCount = await audioTags.count()
      expect(tagCount).toBeGreaterThan(0)
    }
  })

  test('should display Screen Scrape project', async ({ page }) => {
    await scrollToElement(page, '#projects')

    // Look for screen scrape project
    const screenProject = page.locator('text=/screen.*scrape/i, text=/scrape/i').first()
    
    if (await screenProject.count() > 0) {
      await expect(screenProject).toBeVisible()
      
      // Check for related technologies/tags
      const scrapeTags = page.locator('text=/scraping|tmdb|database/i')
      const tagCount = await scrapeTags.count()
      expect(tagCount).toBeGreaterThan(0)
    }
  })

  test('should display Finance Analysis project', async ({ page }) => {
    await scrollToElement(page, '#projects')

    // Look for finance analysis project
    const financeProject = page.locator('text=/finance.*analysis/i, text=/finance/i').first()
    
    if (await financeProject.count() > 0) {
      await expect(financeProject).toBeVisible()
      
      // Check for related technologies/tags
      const financeTags = page.locator('text=/finance|analysis|banking|data/i')
      const tagCount = await financeTags.count()
      expect(tagCount).toBeGreaterThan(0)
    }
  })

  test('should display project descriptions', async ({ page }) => {
    await scrollToElement(page, '#projects')

    // Look for project descriptions
    const descriptions = page.locator('#projects p, #projects [class*="description"]')
    const descriptionCount = await descriptions.count()
    
    expect(descriptionCount).toBeGreaterThan(0)

    // Each description should have reasonable content
    for (const desc of await descriptions.all()) {
      const text = await desc.textContent()
      if (text && text.trim().length > 0) {
        expect(text.length).toBeGreaterThan(20) // Should have meaningful content
      }
    }
  })

  test('should display GitHub links for projects', async ({ page }) => {
    await scrollToElement(page, '#projects')

    // Look for GitHub links
    const githubLinks = page.locator('a[href*="github.com"]')
    const linkCount = await githubLinks.count()
    
    expect(linkCount).toBeGreaterThan(0)

    // Check that GitHub links are properly formatted
    for (const link of await githubLinks.all()) {
      const href = await link.getAttribute('href')
      expect(href).toContain('github.com/lucianoaf8')
      
      // Check link has proper attributes for external links
      const target = await link.getAttribute('target')
      const rel = await link.getAttribute('rel')
      
      // Should open in new tab and have security attributes
      expect(target).toBe('_blank')
      expect(rel).toContain('noopener')
    }
  })

  test('should handle GitHub link clicks', async ({ page }) => {
    await scrollToElement(page, '#projects')

    const githubLinks = page.locator('a[href*="github.com"]')
    const firstLink = githubLinks.first()
    
    if (await firstLink.count() > 0) {
      const href = await firstLink.getAttribute('href')
      
      // Test external link behavior
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page'),
        firstLink.click()
      ])
      
      await newPage.waitForLoadState()
      const newUrl = newPage.url()
      expect(newUrl).toContain('github.com')
      
      await newPage.close()
    }
  })

  test('should display project icons or visual elements', async ({ page }) => {
    await scrollToElement(page, '#projects')

    // Look for project icons (Font Awesome or other icons)
    const icons = page.locator('#projects i[class*="fa"], #projects svg, #projects [class*="icon"]')
    const iconCount = await icons.count()
    
    expect(iconCount).toBeGreaterThan(0)

    // Icons should be visible
    for (const icon of await icons.all()) {
      await expect(icon).toBeVisible()
    }
  })

  test('should display technology tags', async ({ page }) => {
    await scrollToElement(page, '#projects')

    // Look for technology tags
    const tags = page.locator('#projects [class*="tag"], #projects [class*="badge"]')
    
    if (await tags.count() > 0) {
      // Tags should be visible
      for (const tag of await tags.all()) {
        await expect(tag).toBeVisible()
        
        const tagText = await tag.textContent()
        expect(tagText.length).toBeGreaterThan(0)
      }
    } else {
      // Alternative: look for technology mentions in text
      const techMentions = page.locator('text=/openai|whisper|python|javascript|react|node|database|api/i')
      const techCount = await techMentions.count()
      expect(techCount).toBeGreaterThan(0)
    }
  })

  test('should be responsive on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.click('a[href="#projects"]')
    await page.waitForTimeout(1000)
    await scrollToElement(page, '#projects')

    // Section should be visible on mobile
    const projectsSection = page.locator('#projects')
    await expect(projectsSection).toBeVisible()

    // Project cards should stack properly on mobile
    const projectCards = page.locator('#projects [class*="card"], #projects [class*="project"]')
    
    if (await projectCards.count() > 0) {
      for (const card of await projectCards.all()) {
        const boundingBox = await card.boundingBox()
        if (boundingBox) {
          // Cards should fit within mobile viewport width
          expect(boundingBox.width).toBeLessThanOrEqual(375)
        }
      }
    }
  })

  test('should handle project card interactions', async ({ page }) => {
    await scrollToElement(page, '#projects')

    // Look for interactive project cards
    const projectCards = page.locator('#projects [class*="card"], #projects [class*="project"]')
    
    if (await projectCards.count() > 0) {
      const firstCard = projectCards.first()
      
      // Test hover effects (if any)
      await firstCard.hover()
      await page.waitForTimeout(500)
      
      // Card should remain visible and interactive
      await expect(firstCard).toBeVisible()
      
      // Test click interactions (should not break)
      await firstCard.click()
      await page.waitForTimeout(500)
      
      // Page should remain functional
      await expect(projectsSection).toBeVisible()
    }
  })

  test('should maintain proper visual hierarchy', async ({ page }) => {
    await scrollToElement(page, '#projects')

    // Check heading structure
    const headings = page.locator('#projects h1, #projects h2, #projects h3, #projects h4')
    const headingCount = await headings.count()
    expect(headingCount).toBeGreaterThan(0)

    // Main section heading should be h2 or h3
    const mainHeading = headings.first()
    const tagName = await mainHeading.evaluate(el => el.tagName.toLowerCase())
    expect(['h1', 'h2', 'h3'].includes(tagName)).toBeTruthy()
  })
})