import { test, expect } from '@playwright/test'
import { VIEWPORT_SIZES, waitForPageLoad, scrollToElement } from '../utils/test-helpers.js'

test.describe('Responsive Design Tests', () => {
  const testResponsiveSection = async (page, sectionId, sectionName) => {
    await scrollToElement(page, `#${sectionId}`)
    
    const section = page.locator(`#${sectionId}`)
    await expect(section).toBeVisible()
    
    // Check that content is readable and properly laid out
    const textElements = section.locator('h1, h2, h3, h4, h5, h6, p')
    for (const element of await textElements.all()) {
      if (await element.isVisible()) {
        const boundingBox = await element.boundingBox()
        if (boundingBox) {
          // Text should not be too narrow or too wide
          expect(boundingBox.width).toBeGreaterThan(100)
          expect(boundingBox.width).toBeLessThan(page.viewportSize().width + 50)
        }
      }
    }
  }

  for (const [deviceName, viewport] of Object.entries(VIEWPORT_SIZES)) {
    test(`should display properly on ${deviceName} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/')
      await waitForPageLoad(page)

      // Test header responsiveness
      const header = page.locator('header, [class*="header"]').first()
      if (await header.count() > 0) {
        await expect(header).toBeVisible()
        
        const headerBox = await header.boundingBox()
        if (headerBox) {
          expect(headerBox.width).toBeLessThanOrEqual(viewport.width + 20) // Allow some margin
        }
      }

      // Test main sections
      const sections = ['home', 'about', 'projects', 'custom-gpts', 'contact']
      
      for (const sectionId of sections) {
        // Navigate to section
        const navLink = page.locator(`a[href="#${sectionId}"]`)
        if (await navLink.count() > 0) {
          await navLink.click()
          await page.waitForTimeout(1000)
          await testResponsiveSection(page, sectionId, sectionId)
        }
      }
    })
  }

  test('should handle mobile navigation menu', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_SIZES.mobile)
    await page.goto('/')
    await waitForPageLoad(page)

    // Look for mobile menu toggle (hamburger menu)
    const mobileMenuToggle = page.locator('button[class*="menu"], button[class*="toggle"], [class*="hamburger"]')
    
    if (await mobileMenuToggle.count() > 0) {
      // Test mobile menu functionality
      await mobileMenuToggle.first().click()
      await page.waitForTimeout(500)
      
      // Menu should appear
      const mobileMenu = page.locator('[class*="menu"][class*="open"], [class*="nav"][class*="mobile"]')
      if (await mobileMenu.count() > 0) {
        await expect(mobileMenu.first()).toBeVisible()
      }
    } else {
      // If no mobile menu, regular navigation should still be usable
      const navLinks = page.locator('nav a, [class*="nav"] a')
      if (await navLinks.count() > 0) {
        for (const link of await navLinks.all()) {
          if (await link.isVisible()) {
            const linkBox = await link.boundingBox()
            if (linkBox) {
              // Links should be touch-friendly on mobile
              expect(linkBox.height).toBeGreaterThan(30)
            }
          }
        }
      }
    }
  })

  test('should handle form responsiveness', async ({ page }) => {
    // Test contact form on different screen sizes
    for (const [deviceName, viewport] of Object.entries(VIEWPORT_SIZES)) {
      await page.setViewportSize(viewport)
      await page.goto('/')
      await page.click('a[href="#contact"]')
      await page.waitForTimeout(1000)
      await scrollToElement(page, '#contact')

      const form = page.locator('form').first()
      if (await form.count() > 0) {
        await expect(form).toBeVisible()

        // Form fields should be properly sized
        const formFields = form.locator('input, textarea')
        for (const field of await formFields.all()) {
          if (await field.isVisible()) {
            const fieldBox = await field.boundingBox()
            if (fieldBox) {
              // Fields should fit within viewport
              expect(fieldBox.width).toBeLessThanOrEqual(viewport.width)
              expect(fieldBox.width).toBeGreaterThan(viewport.width * 0.3) // At least 30% of viewport
              
              // Touch-friendly height on mobile
              if (deviceName === 'mobile') {
                expect(fieldBox.height).toBeGreaterThan(35)
              }
            }
          }
        }
      }
    }
  })

  test('should handle button responsiveness', async ({ page }) => {
    for (const [deviceName, viewport] of Object.entries(VIEWPORT_SIZES)) {
      await page.setViewportSize(viewport)
      await page.goto('/')
      await waitForPageLoad(page)

      // Test various buttons throughout the site
      const buttons = page.locator('button, a[class*="btn"], [role="button"]')
      const buttonCount = Math.min(await buttons.count(), 10) // Test first 10 buttons

      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i)
        if (await button.isVisible()) {
          const buttonBox = await button.boundingBox()
          if (buttonBox) {
            // Buttons should be touch-friendly
            if (deviceName === 'mobile') {
              expect(buttonBox.height).toBeGreaterThan(35)
              expect(buttonBox.width).toBeGreaterThan(80)
            }
            
            // Buttons should not overflow viewport
            expect(buttonBox.width).toBeLessThanOrEqual(viewport.width)
          }
        }
      }
    }
  })

  test('should handle image responsiveness', async ({ page }) => {
    for (const [deviceName, viewport] of Object.entries(VIEWPORT_SIZES)) {
      await page.setViewportSize(viewport)
      await page.goto('/')
      await waitForPageLoad(page)

      const images = page.locator('img')
      for (const img of await images.all()) {
        if (await img.isVisible()) {
          const imgBox = await img.boundingBox()
          if (imgBox) {
            // Images should not overflow viewport
            expect(imgBox.width).toBeLessThanOrEqual(viewport.width + 20) // Allow small margin
            
            // Images should maintain reasonable aspect ratios
            const aspectRatio = imgBox.width / imgBox.height
            expect(aspectRatio).toBeGreaterThan(0.1) // Not too tall
            expect(aspectRatio).toBeLessThan(10) // Not too wide
          }
        }
      }
    }
  })

  test('should handle text readability across screen sizes', async ({ page }) => {
    for (const [deviceName, viewport] of Object.entries(VIEWPORT_SIZES)) {
      await page.setViewportSize(viewport)
      await page.goto('/')
      await waitForPageLoad(page)

      // Check heading sizes
      const headings = page.locator('h1, h2, h3, h4, h5, h6')
      for (const heading of await headings.all()) {
        if (await heading.isVisible()) {
          const fontSize = await heading.evaluate(el => 
            window.getComputedStyle(el).fontSize
          )
          const fontSizeNum = parseInt(fontSize)
          
          // Headings should be readable on all devices
          if (deviceName === 'mobile') {
            expect(fontSizeNum).toBeGreaterThan(16) // Minimum readable size on mobile
          } else {
            expect(fontSizeNum).toBeGreaterThan(14)
          }
        }
      }

      // Check paragraph text
      const paragraphs = page.locator('p')
      for (const p of await paragraphs.all()) {
        if (await p.isVisible()) {
          const fontSize = await p.evaluate(el => 
            window.getComputedStyle(el).fontSize
          )
          const fontSizeNum = parseInt(fontSize)
          
          // Body text should be readable
          if (deviceName === 'mobile') {
            expect(fontSizeNum).toBeGreaterThan(14)
          } else {
            expect(fontSizeNum).toBeGreaterThan(12)
          }
        }
      }
    }
  })

  test('should handle animation performance on different devices', async ({ page }) => {
    for (const [deviceName, viewport] of Object.entries(VIEWPORT_SIZES)) {
      await page.setViewportSize(viewport)
      await page.goto('/')
      await waitForPageLoad(page)

      // Look for animation elements
      const animationElements = page.locator('canvas, [class*="animation"], [class*="tron"]')
      
      if (await animationElements.count() > 0) {
        // Wait for animations to initialize
        await page.waitForTimeout(2000)
        
        // Page should remain responsive during animations
        const testButton = page.locator('button, a').first()
        if (await testButton.count() > 0) {
          await expect(testButton).toBeEnabled()
          
          // Click should still work during animations
          await testButton.click()
          await page.waitForTimeout(500)
          
          // Page should remain functional
          await expect(page.locator('body')).toBeVisible()
        }
      }
    }
  })

  test('should handle landscape and portrait orientations on mobile', async ({ page }) => {
    // Portrait mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await waitForPageLoad(page)
    
    let portraitSectionVisible = false
    const sections = page.locator('section, [id^="#"]')
    if (await sections.count() > 0) {
      const firstSection = sections.first()
      portraitSectionVisible = await firstSection.isVisible()
    }
    
    expect(portraitSectionVisible).toBeTruthy()

    // Landscape mobile
    await page.setViewportSize({ width: 667, height: 375 })
    await page.waitForTimeout(1000)
    
    let landscapeSectionVisible = false
    if (await sections.count() > 0) {
      const firstSection = sections.first()
      landscapeSectionVisible = await firstSection.isVisible()
    }
    
    expect(landscapeSectionVisible).toBeTruthy()
  })

  test('should handle content reflow on window resize', async ({ page }) => {
    await page.goto('/')
    await waitForPageLoad(page)

    // Start with desktop
    await page.setViewportSize(VIEWPORT_SIZES.desktop)
    await page.waitForTimeout(500)

    // Resize to tablet
    await page.setViewportSize(VIEWPORT_SIZES.tablet)
    await page.waitForTimeout(500)

    // Content should still be visible and properly laid out
    const mainContent = page.locator('main, [class*="content"], section').first()
    await expect(mainContent).toBeVisible()

    // Resize to mobile
    await page.setViewportSize(VIEWPORT_SIZES.mobile)
    await page.waitForTimeout(500)

    // Content should adapt to mobile
    await expect(mainContent).toBeVisible()
    
    // Navigation should still work
    const navLink = page.locator('a[href*="#"]').first()
    if (await navLink.count() > 0) {
      await navLink.click()
      await page.waitForTimeout(1000)
      // Page should remain functional
      await expect(page.locator('body')).toBeVisible()
    }
  })
})