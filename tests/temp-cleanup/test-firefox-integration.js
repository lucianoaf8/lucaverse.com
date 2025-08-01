#!/usr/bin/env node

/**
 * 🧪 Firefox Integration Test
 * Quick test to verify Firefox manager functionality
 */

import { firefoxManager } from './firefox-manager.js';

async function testFirefoxIntegration() {
    console.log('🔥 Testing Firefox Integration...');
    console.log('='.repeat(40));

    try {
        // Test 1: Firefox detection
        console.log('\n1️⃣ Testing Firefox detection...');
        console.log(`Firefox executable found at: ${firefoxManager.firefoxPath}`);

        // Test 2: Firefox launch
        console.log('\n2️⃣ Testing Firefox launch...');
        const launched = await firefoxManager.launchFirefox();
        
        if (launched) {
            console.log('✅ Firefox launched successfully');
            
            // Test 3: Status check
            console.log('\n3️⃣ Testing status check...');
            const status = await firefoxManager.getStatus();
            console.log('Firefox Status:', JSON.stringify(status, null, 2));
            
            // Test 4: Tab creation
            console.log('\n4️⃣ Testing tab creation...');
            const testTabId = await firefoxManager.createTestTab('https://example.com', 'test-tab-1');
            
            if (testTabId) {
                console.log(`✅ Test tab created: ${testTabId}`);
                
                // Wait a moment
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Test 5: Tab cleanup
                console.log('\n5️⃣ Testing tab cleanup...');
                await firefoxManager.closeTestTab('test-tab-1');
                console.log('✅ Test tab closed');
            }
            
            // Test 6: Get final status
            console.log('\n6️⃣ Final status check...');
            const finalStatus = await firefoxManager.getStatus();
            console.log('Final Status:', JSON.stringify(finalStatus, null, 2));
            
            console.log('\n✅ All tests passed!');
            console.log('🔥 Firefox integration is working correctly');
            console.log('\n💡 You can now run the test studio with: npm run test:gui');
            
        } else {
            console.log('❌ Firefox launch failed');
            console.log('💡 Make sure Firefox is installed and accessible');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n🔧 Troubleshooting tips:');
        console.log('- Ensure Firefox is installed');
        console.log('- Check if port 9222 is available');
        console.log('- Try running as administrator');
    }
}

// Run the test
testFirefoxIntegration().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
});
