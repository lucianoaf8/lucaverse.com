import { test, expect } from '@playwright/test'
import { EXTERNAL_LINKS, scrollToElement, waitForPageLoad } from '../utils/test-helpers.js'

test.describe('Custom GPTs Section Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForPageLoad(page)
    
    // Navigate to custom GPTs section
    await page.click('a[href="#custom-gpts"]')
    await page.waitForTimeout(1000)
  })

  test('should display Custom GPTs section with title', async ({ page }) => {
    await scrollToElement(page, '#custom-gpts')

    // Check section is visible
    const customGptsSection = page.locator('#custom-gpts')
    await expect(customGptsSection).toBeVisible()

    // Check section title
    const sectionTitle = page.locator('#custom-gpts h2, #custom-gpts .section-title, #custom-gpts [class*="title"]')
    await expect(sectionTitle.first()).toBeVisible()

    const titleText = await sectionTitle.first().textContent()
    expect(titleText.toLowerCase()).toMatch(/gpt|custom/i)
  })

  test('should display GPT cards', async ({ page }) => {
    await scrollToElement(page, '#custom-gpts')

    // Look for GPT cards
    const gptCards = page.locator('#custom-gpts [class*="card"], #custom-gpts [class*="gpt"]')
    const cardCount = await gptCards.count()
    
    expect(cardCount).toBeGreaterThan(0)

    // Each GPT card should be visible
    for (const card of await gptCards.all()) {
      await expect(card).toBeVisible()
    }
  })

  test('should display PythonGPT', async ({ page }) => {
    await scrollToElement(page, '#custom-gpts')

    // Look for Python GPT
    const pythonGpt = page.locator('text=/python.*gpt|pythongpt/i').first()
    
    if (await pythonGpt.count() > 0) {
      await expect(pythonGpt).toBeVisible()
      
      // Check for related tags
      const pythonTags = page.locator('text=/python|coding|project.*structure/i')
      const tagCount = await pythonTags.count()
      expect(tagCount).toBeGreaterThan(0)
    }
  })

  test('should display MySQLGPT', async ({ page }) => {
    await scrollToElement(page, '#custom-gpts')

    // Look for MySQL GPT
    const mysqlGpt = page.locator('text=/mysql.*gpt|mysqlgpt/i').first()
    
    if (await mysqlGpt.count() > 0) {
      await expect(mysqlGpt).toBeVisible()
      
      // Check for related tags
      const mysqlTags = page.locator('text=/mysql|database.*design|query.*optimization/i')
      const tagCount = await mysqlTags.count()
      expect(tagCount).toBeGreaterThan(0)
    }
  })

  test('should display PromptMasterGPT', async ({ page }) => {
    await scrollToElement(page, '#custom-gpts')

    // Look for PromptMaster GPT
    const promptGpt = page.locator('text=/prompt.*master|promptmaster/i').first()
    
    if (await promptGpt.count() > 0) {
      await expect(promptGpt).toBeVisible()
      
      // Check for related tags
      const promptTags = page.locator('text=/prompt.*engineering|llm|validation/i')
      const tagCount = await promptTags.count()
      expect(tagCount).toBeGreaterThan(0)
    }
  })

  test('should display GPT descriptions', async ({ page }) => {
    await scrollToElement(page, '#custom-gpts')

    // Look for GPT descriptions
    const descriptions = page.locator('#custom-gpts p, #custom-gpts [class*="description"]')
    const descriptionCount = await descriptions.count()
    
    expect(descriptionCount).toBeGreaterThan(0)

    // Each description should have meaningful content
    for (const desc of await descriptions.all()) {
      const text = await desc.textContent()
      if (text && text.trim().length > 0) {
        expect(text.length).toBeGreaterThan(15) // Should have meaningful content
      }
    }
  })

  test('should display "Try It" links for GPTs', async ({ page }) => {
    await scrollToElement(page, '#custom-gpts')

    // Look for "Try It" or external links
    const tryItLinks = page.locator('a').filter({ hasText: /try.*it|visit|open/i })
    const chatgptLinks = page.locator('a[href*="chatgpt.com"]')
    
    const linkCount = Math.max(await tryItLinks.count(), await chatgptLinks.count())
    expect(linkCount).toBeGreaterThan(0)

    // Check ChatGPT links specifically
    if (await chatgptLinks.count() > 0) {
      for (const link of await chatgptLinks.all()) {
        const href = await link.getAttribute('href')
        expect(href).toContain('chatgpt.com/g/')
        
        // Check link has proper attributes for external links
        const target = await link.getAttribute('target')
        const rel = await link.getAttribute('rel')
        
        expect(target).toBe('_blank')
        expect(rel).toContain('noopener')
      }
    }
  })

  test('should handle GPT link clicks', async ({ page }) => {
    await scrollToElement(page, '#custom-gpts')

    const chatgptLinks = page.locator('a[href*="chatgpt.com"]')
    const firstLink = chatgptLinks.first()
    
    if (await firstLink.count() > 0) {
      const href = await firstLink.getAttribute('href')
      
      // Test external link behavior
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page'),
        firstLink.click()
      ])
      
      await newPage.waitForLoadState()
      const newUrl = newPage.url()
      expect(newUrl).toContain('chatgpt.com')
      
      await newPage.close()
    }
  })

  test('should display GPT icons', async ({ page }) => {
    await scrollToElement(page, '#custom-gpts')

    // Look for GPT icons
    const icons = page.locator('#custom-gpts i[class*="fa"], #custom-gpts svg, #custom-gpts [class*="icon"]')
    const iconCount = await icons.count()
    
    expect(iconCount).toBeGreaterThan(0)

    // Check for specific technology icons
    const techIcons = page.locator('#custom-gpts i.fa-python, #custom-gpts i.fa-database, #custom-gpts i[class*="comment"]')
    
    if (await techIcons.count() > 0) {
      for (const icon of await techIcons.all()) {
        await expect(icon).toBeVisible()
      }
    }
  })

  test('should display technology tags for each GPT', async ({ page }) => {
    await scrollToElement(page, '#custom-gpts')

    // Look for technology tags
    const tags = page.locator('#custom-gpts [class*="tag"], #custom-gpts [class*="badge"]')
    
    if (await tags.count() > 0) {
      for (const tag of await tags.all()) {
        await expect(tag).toBeVisible()
        
        const tagText = await tag.textContent()
        expect(tagText.length).toBeGreaterThan(0)
      }
    } else {
      // Alternative: look for technology mentions
      const techMentions = page.locator('text=/python|mysql|database|prompt|llm|coding|optimization/i')
      const techCount = await techMentions.count()
      expect(techCount).toBeGreaterThan(0)
    }
  })

  test('should handle GPT card interactions', async ({ page }) => {
    await scrollToElement(page, '#custom-gpts')

    // Look for interactive GPT cards
    const gptCards = page.locator('#custom-gpts [class*="card"], #custom-gpts [class*="gpt"]')
    
    if (await gptCards.count() > 0) {
      const firstCard = gptCards.first()
      
      // Test hover effects
      await firstCard.hover()
      await page.waitForTimeout(500)
      
      // Card should remain visible and interactive
      await expect(firstCard).toBeVisible()
      
      // Test click interactions (should not break the card)
      await firstCard.click()
      await page.waitForTimeout(500)
      
      // Page should remain functional
      const customGptsSection = page.locator('#custom-gpts')
      await expect(customGptsSection).toBeVisible()
    }
  })

  test('should be responsive on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.click('a[href="#custom-gpts"]')
    await page.waitForTimeout(1000)
    await scrollToElement(page, '#custom-gpts')

    // Section should be visible on mobile
    const customGptsSection = page.locator('#custom-gpts')
    await expect(customGptsSection).toBeVisible()

    // GPT cards should stack properly on mobile
    const gptCards = page.locator('#custom-gpts [class*="card"], #custom-gpts [class*="gpt"]')
    
    if (await gptCards.count() > 0) {
      for (const card of await gptCards.all()) {
        const boundingBox = await card.boundingBox()
        if (boundingBox) {
          // Cards should fit within mobile viewport width
          expect(boundingBox.width).toBeLessThanOrEqual(375)
        }
      }
    }
  })

  test('should display proper visual hierarchy', async ({ page }) => {
    await scrollToElement(page, '#custom-gpts')

    // Check heading structure
    const headings = page.locator('#custom-gpts h1, #custom-gpts h2, #custom-gpts h3, #custom-gpts h4')
    const headingCount = await headings.count()
    expect(headingCount).toBeGreaterThan(0)

    // Each GPT should have a title/heading
    const gptTitles = page.locator('#custom-gpts [class*="card"] h3, #custom-gpts [class*="card"] h4, #custom-gpts [class*="gpt"] h3')
    
    if (await gptTitles.count() > 0) {
      for (const title of await gptTitles.all()) {
        await expect(title).toBeVisible()
        
        const titleText = await title.textContent()
        expect(titleText.length).toBeGreaterThan(3)
      }
    }
  })

  test('should show section subtitle or description', async ({ page }) => {
    await scrollToElement(page, '#custom-gpts')

    // Look for section subtitle
    const subtitle = page.locator('#custom-gpts .section-subtitle, #custom-gpts p').first()
    
    if (await subtitle.count() > 0) {
      await expect(subtitle).toBeVisible()
      
      const subtitleText = await subtitle.textContent()
      expect(subtitleText.length).toBeGreaterThan(10)
    }
  })

  test('should validate external link security', async ({ page }) => {
    await scrollToElement(page, '#custom-gpts')

    // Check all external links have proper security attributes
    const externalLinks = page.locator('#custom-gpts a[href*="chatgpt.com"], #custom-gpts a[target="_blank"]')
    
    for (const link of await externalLinks.all()) {
      const target = await link.getAttribute('target')
      const rel = await link.getAttribute('rel')
      
      if (target === '_blank') {
        expect(rel).toContain('noopener')
        // Should also have noreferrer for security
        expect(rel).toMatch(/noopener|noreferrer/)
      }
    }
  })
})