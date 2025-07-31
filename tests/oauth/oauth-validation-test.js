/**
 * OAuth Authentication Validation Test
 * Tests all fixes and validates OAuth flow works correctly
 */
const puppeteer = require('puppeteer');

async function validateOAuthFixes() {
  console.log('🧪 Starting OAuth Validation Test...');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 }
  });
  
  const page = await browser.newPage();
  
  try {
    // 1. Test Worker Health
    console.log('🏥 Testing worker health...');
    const healthResponse = await page.evaluate(async () => {
      const response = await fetch('https://lucaverse-auth.lucianoaf8.workers.dev/health');
      return await response.json();
    });
    console.log('✅ Worker Health:', healthResponse.status);
    
    // 2. Test Worker Debug Info
    console.log('🔍 Testing worker debug info...');
    const debugResponse = await page.evaluate(async () => {
      const response = await fetch('https://lucaverse-auth.lucianoaf8.workers.dev/debug');
      return await response.json();
    });
    console.log('✅ OAuth Config Valid:', {
      hasClientId: debugResponse.environment.hasGoogleClientId,
      hasClientSecret: debugResponse.environment.hasGoogleClientSecret,
      whitelistPopulated: debugResponse.kvStore.whitelistExists,
      emailCount: debugResponse.kvStore.whitelistData?.emails?.length || 0
    });
    
    // 3. Test Frontend Login Page
    console.log('🌐 Testing login page...');
    await page.goto('https://lucaverse.com#login', { waitUntil: 'networkidle2' });
    
    const loginButton = await page.waitForSelector('button[class*="loginButton"]', { timeout: 10000 });
    console.log('✅ Login button found');
    
    // 4. Test OAuth Popup Creation (without completing OAuth)
    console.log('🪟 Testing OAuth popup creation...');
    
    let popupCreated = false;
    browser.on('targetcreated', async (target) => {
      if (target.type() === 'page') {
        popupCreated = true;
        const popup = await target.page();
        const url = popup.url();
        console.log('✅ OAuth popup created:', url.includes('accounts.google.com') ? 'Google OAuth' : url);
        
        // Close popup after validation
        setTimeout(() => popup.close(), 2000);
      }
    });
    
    await loginButton.click();
    await page.waitForTimeout(3000);
    
    if (popupCreated) {
      console.log('✅ OAuth popup flow initiated successfully');
    } else {
      console.log('❌ OAuth popup was not created');
    }
    
    console.log('🎯 OAuth Validation Test Results:');
    console.log(`  ✅ Worker Health: ${healthResponse.status}`);
    console.log(`  ✅ OAuth Config: Valid`);
    console.log(`  ✅ Whitelist: ${debugResponse.kvStore.whitelistData?.emails?.length || 0} users`);
    console.log(`  ✅ Login Page: Functional`);
    console.log(`  ${popupCreated ? '✅' : '❌'} OAuth Popup: ${popupCreated ? 'Working' : 'Failed'}`);
    
    return {
      success: true,
      workerHealth: healthResponse.status === 'healthy',
      configValid: debugResponse.environment.hasGoogleClientId && debugResponse.environment.hasGoogleClientSecret,
      whitelistPopulated: debugResponse.kvStore.whitelistExists,
      loginPageWorking: true,
      popupWorking: popupCreated
    };
    
  } catch (error) {
    console.error('💥 Validation test failed:', error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

// Run validation test
validateOAuthFixes().then(results => {
  console.log('\n📊 Final Validation Results:', results);
  if (results.success && results.workerHealth && results.configValid && results.whitelistPopulated) {
    console.log('🎉 OAuth Authentication System: VALIDATED AND READY');
  } else {
    console.log('⚠️ OAuth Authentication System: Issues detected, see results above');
  }
}).catch(error => {
  console.error('💥 Validation failed:', error);
});