import { chromium } from '@playwright/test';

async function globalSetup() {
  console.log('🚀 Starting E2E test global setup...');
  
  // Launch browser for setup tasks
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for the dev server to be ready
    console.log('⏳ Waiting for development server...');
    await page.goto('http://localhost:5155', { waitUntil: 'networkidle' });
    
    // Verify the application loads correctly
    const title = await page.title();
    console.log(`📄 Application loaded: ${title}`);
    
    // Setup test data or authentication if needed
    // This could include creating test accounts, seeding data, etc.
    
    // Set up mock services if needed for testing
    console.log('🔧 Setting up test environment...');
    
    // Create test state storage
    await page.evaluate(() => {
      // Clear any existing storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Set up test flags
      window.TEST_MODE = true;
      localStorage.setItem('test_mode', 'true');
    });
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;