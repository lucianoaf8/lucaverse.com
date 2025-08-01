// Test utilities and helpers

export const TEST_SELECTORS = {
  // Header elements
  header: '[data-testid="header"]',
  logo: '[data-testid="logo"]',
  navLinks: '[data-testid="nav-link"]',
  languageToggle: '[data-testid="language-toggle"]',
  loginButton: '[data-testid="login-button"]',
  requestAccessButton: '[data-testid="request-access-button"]',
  
  // Hero section
  hero: '[data-testid="hero"]',
  heroTitle: '[data-testid="hero-title"]',
  enterLucaverseButton: '[data-testid="enter-lucaverse-button"]',
  heroRequestAccessButton: '[data-testid="hero-request-access-button"]',
  
  // About section
  about: '[data-testid="about"]',
  
  // Projects section
  projects: '[data-testid="projects"]',
  projectCards: '[data-testid="project-card"]',
  projectLinks: '[data-testid="project-link"]',
  
  // Custom GPTs section
  customGpts: '[data-testid="custom-gpts"]',
  gptCards: '[data-testid="gpt-card"]',
  gptLinks: '[data-testid="gpt-link"]',
  
  // Blog section
  blog: '[data-testid="blog"]',
  
  // Contact section
  contact: '[data-testid="contact"]',
  contactForm: '[data-testid="contact-form"]',
  contactName: '[data-testid="contact-name"]',
  contactEmail: '[data-testid="contact-email"]',
  contactSubject: '[data-testid="contact-subject"]',
  contactMessage: '[data-testid="contact-message"]',
  contactSubmit: '[data-testid="contact-submit"]',
  socialLinks: '[data-testid="social-link"]',
  
  // Footer
  footer: '[data-testid="footer"]',
  
  // Access Request Form Modal
  accessModal: '[data-testid="access-modal"]',
  accessForm: '[data-testid="access-form"]',
  accessName: '[data-testid="access-name"]',
  accessEmail: '[data-testid="access-email"]',
  accessReason: '[data-testid="access-reason"]',
  accessSubmit: '[data-testid="access-submit"]',
  accessClose: '[data-testid="access-close"]',
  
  // Login page
  loginPage: '[data-testid="login-page"]',
  googleLoginButton: '[data-testid="google-login-button"]',
  microsoftLoginButton: '[data-testid="microsoft-login-button"]',
  
  // Background/Animation
  background: '[data-testid="background"]',
  tronGrid: '[data-testid="tron-grid"]',
  
  // Notifications
  notification: '[data-testid="notification"]',
  notificationClose: '[data-testid="notification-close"]',
}

export const TEST_URLS = {
  home: '/',
  login: '#login',
  dashboard: '/dashboard',
  sections: {
    home: '#home',
    about: '#about',
    projects: '#projects',
    customGpts: '#custom-gpts',
    blog: '#blog',
    contact: '#contact',
  }
}

export const EXTERNAL_LINKS = {
  newsletter: 'https://newsletter.lucaverse.com',
  github: {
    audioTranscript: 'https://github.com/lucianoaf8/audio-transcript',
    screenScrape: 'https://github.com/lucianoaf8/screen-scrape',
    financeAnalysis: 'https://github.com/lucianoaf8/finance-deep-analysis'
  },
  customGpts: {
    pythonGpt: 'https://chatgpt.com/g/g-UoHNGZJqK-pythongpt',
    mysqlGpt: 'https://chatgpt.com/g/g-Vo23uO3jp-mysqlgpt',
    promptMasterGpt: 'https://chatgpt.com/g/g-67f2d5956e788191b7a0d944992b82d4-promptmastergpt'
  }
}

export const TEST_DATA = {
  validContactForm: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    subject: 'Test Subject',
    message: 'This is a test message for automated testing.'
  },
  validAccessForm: {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    reason: 'I would like to test the platform for my development needs.'
  },
  invalidEmail: 'invalid-email',
  emptyFields: {
    name: '',
    email: '',
    subject: '',
    message: ''
  }
}

export const VIEWPORT_SIZES = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
  large: { width: 1920, height: 1080 }
}

export const ANIMATION_TIMEOUT = 3000
export const FORM_SUBMISSION_TIMEOUT = 15000
export const PAGE_LOAD_TIMEOUT = 30000

// Helper functions
export const waitForAnimation = (page, timeout = ANIMATION_TIMEOUT) => {
  return page.waitForTimeout(timeout)
}

export const waitForPageLoad = (page) => {
  return page.waitForLoadState('networkidle', { timeout: PAGE_LOAD_TIMEOUT })
}

export const scrollToElement = async (page, selector) => {
  await page.locator(selector).scrollIntoViewIfNeeded()
  await page.waitForTimeout(500) // Wait for scroll animation
}

export const checkExternalLink = async (page, linkSelector, expectedUrl) => {
  const [newPage] = await Promise.all([
    page.context().waitForEvent('page'),
    page.click(linkSelector)
  ])
  
  await newPage.waitForLoadState()
  const actualUrl = newPage.url()
  await newPage.close()
  
  return actualUrl.includes(expectedUrl) || actualUrl === expectedUrl
}

export const fillFormAndSubmit = async (page, formData, formSelectors) => {
  for (const [field, value] of Object.entries(formData)) {
    if (formSelectors[field] && value) {
      await page.fill(formSelectors[field], value)
    }
  }
  
  await page.click(formSelectors.submit)
}

export const testResponsiveLayout = async (page, testFunction) => {
  const results = {}
  
  for (const [device, viewport] of Object.entries(VIEWPORT_SIZES)) {
    await page.setViewportSize(viewport)
    await page.waitForTimeout(500)
    
    try {
      await testFunction(page, device)
      results[device] = { success: true }
    } catch (error) {
      results[device] = { success: false, error: error.message }
    }
  }
  
  return results
}

export const checkAccessibility = async (page, selector = 'body') => {
  // Basic accessibility checks
  const element = page.locator(selector)
  
  // Check for alt text on images
  const images = await element.locator('img').all()
  const imagesWithoutAlt = []
  
  for (const img of images) {
    const alt = await img.getAttribute('alt')
    if (!alt) {
      const src = await img.getAttribute('src')
      imagesWithoutAlt.push(src)
    }
  }
  
  // Check for proper heading hierarchy
  const headings = await element.locator('h1, h2, h3, h4, h5, h6').all()
  const headingLevels = []
  
  for (const heading of headings) {
    const tagName = await heading.evaluate(el => el.tagName.toLowerCase())
    headingLevels.push(parseInt(tagName.charAt(1)))
  }
  
  return {
    imagesWithoutAlt,
    headingLevels,
    hasH1: headingLevels.includes(1),
    headingCount: headingLevels.length
  }
}