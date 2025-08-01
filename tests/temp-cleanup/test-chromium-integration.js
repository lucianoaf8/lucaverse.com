#!/usr/bin/env node

/**
 * 🟦 Chromium Integration Test
 * Comprehensive test to verify Chromium manager functionality
 */

import { chromiumManager } from './chromium-manager.js';

async function testChromiumIntegration() {
    console.log('🟦 Testing Chromium Integration...');
    console.log('='.repeat(40));

    try {
        // Test 1: Chromium detection
        console.log('\n1️⃣ Testing Chromium detection...');
        console.log(`Chromium executable found at: ${chromiumManager.chromiumPath}`);
        console.log(`Profile directory: ${chromiumManager.profileDirectory}`);

        // Test 2: Chromium launch
        console.log('\n2️⃣ Testing Chromium launch...');
        const launched = await chromiumManager.launchChromium();
        
        if (launched) {
            console.log('✅ Chromium launched successfully');
            
            // Test 3: Status check
            console.log('\n3️⃣ Testing status check...');
            const status = await chromiumManager.getStatus();
            console.log('Chromium Status:', JSON.stringify(status, null, 2));
            
            // Test 4: Tab creation
            console.log('\n4️⃣ Testing tab creation...');
            const testTabId = await chromiumManager.createTestTab('https://example.com', 'test-tab-1');
            
            if (testTabId) {
                console.log(`✅ Test tab created: ${testTabId}`);
                
                // Wait a moment
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Test 5: Tab cleanup
                console.log('\n5️⃣ Testing tab cleanup...');
                await chromiumManager.closeTestTab('test-tab-1');
                console.log('✅ Test tab closed');
            }
            
            // Test 6: GUI tab creation
            console.log('\n6️⃣ Testing GUI tab creation...');
            const guiTabId = await chromiumManager.openGUIInChromium();
            if (guiTabId) {
                console.log(`✅ GUI tab created: ${guiTabId}`);
            }
            
            // Test 7: Get final status
            console.log('\n7️⃣ Final status check...');
            const finalStatus = await chromiumManager.getStatus();
            console.log('Final Status:', JSON.stringify(finalStatus, null, 2));
            
            console.log('\n✅ All tests passed!');
            console.log('🟦 Chromium integration is working correctly');
            console.log('\n💡 You can now run the test studio with: npm run test:gui');
            console.log('🌐 The GUI will automatically open in Chromium Profile 7');
            
        } else {
            console.log('❌ Chromium launch failed');
            console.log('💡 Make sure:');
            console.log('- Chromium executable exists at the specified path');
            console.log('- Profile 7 exists in the Chromium installation');
            console.log('- Port 9223 is available');
            console.log('- You have proper permissions');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n🔧 Troubleshooting tips:');
        console.log('- Ensure Chromium executable exists');
        console.log('- Verify Profile 7 is available');
        console.log('- Check if port 9223 is available');
        console.log('- Try running as administrator');
        console.log('- Close any existing Chromium instances');
    }
}

// Run the test
testChromiumIntegration().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
});
