/**
 * Quick OAuth Popup Issue Test
 * Specifically tests for the main issue: popup loading main site instead of closing
 */
const puppeteer = require('puppeteer');

(async () => {
  console.log('🎯 Testing OAuth Popup Issue...');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 }
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('📍 Navigating to login page...');
    await page.goto('https://lucaverse.com#login', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);
    
    console.log('🔍 Finding Google login button...');
    const googleButton = await page.waitForSelector('button[class*="loginButton"]', { timeout: 10000 });
    
    const buttonText = await page.evaluate(btn => btn.textContent, googleButton);
    console.log('✅ Found button:', buttonText);
    
    // Set up popup monitoring
    let popup = null;
    let popupUrl = null;
    
    browser.on('targetcreated', async (target) => {
      if (target.type() === 'page') {
        popup = await target.page();
        console.log('🪟 Popup created');
        
        // Monitor popup navigation
        popup.on('framenavigated', () => {
          popupUrl = popup.url();
          console.log('🔄 Popup navigated to:', popupUrl);
          
          // Check for the main issue
          if (popupUrl.includes('lucaverse.com') && !popupUrl.includes('lucaverse-auth')) {
            console.log('❌ MAIN ISSUE DETECTED: Popup loaded lucaverse.com instead of OAuth callback!');
            console.log('🔍 This confirms the bug described in the OAuth issues summary');
          }
        });
        
        popup.on('close', () => {
          console.log('🚪 Popup closed');
        });
      }
    });
    
    console.log('🖱️ Clicking Google login button...');
    await googleButton.click();
    
    // Wait for popup and monitor for 15 seconds
    console.log('⏳ Monitoring popup behavior for 15 seconds...');
    await page.waitForTimeout(15000);
    
    if (popup) {
      const finalUrl = popup.url();
      console.log('🔗 Final popup URL:', finalUrl);
      
      if (finalUrl.includes('lucaverse.com') && !finalUrl.includes('lucaverse-auth')) {
        console.log('🚨 CONFIRMED: Main OAuth issue is present');
        console.log('   Expected: Popup should close after OAuth callback');
        console.log('   Actual: Popup loaded main site (lucaverse.com)');
        
        return {
          issue: 'confirmed',
          description: 'OAuth popup loads main site instead of closing',
          url: finalUrl
        };
      } else if (finalUrl.includes('accounts.google.com')) {
        console.log('✅ Popup correctly shows Google OAuth');
      } else if (finalUrl.includes('lucaverse-auth')) {
        console.log('✅ Popup correctly shows OAuth worker');
      }
    } else {
      console.log('❌ No popup was created');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  } finally {
    if (popup && !popup.isClosed()) {
      await popup.close();
    }
    await browser.close();
    console.log('🏁 Test completed');
  }
})();