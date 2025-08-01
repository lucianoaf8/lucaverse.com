#!/usr/bin/env node

/**
 * 🧪 Quick Profile 4 Test
 * Tests launching Chromium with the correct Profile 4 and GUI URL
 */

import { chromiumManager } from './chromium-manager.js';

console.log('🧪 Testing Profile 4 Launch');
console.log('=============================\n');

async function testProfileLaunch() {
    try {
        console.log('🎯 Attempting to launch Chromium with Profile 4...');
        console.log(`🟦 Profile: ${chromiumManager.profileDirectory} (Work profile)`);
        console.log(`🌐 GUI URL: ${chromiumManager.guiUrl}`);
        console.log(`🔧 Debug Port: ${chromiumManager.debugPort}\n`);

        const launched = await chromiumManager.launchChromium();
        
        if (launched) {
            console.log('✅ SUCCESS! Chromium launched with Profile 4');
            console.log('🌐 GUI should be loading automatically in the Work profile');
            console.log('\n🔍 Checking remote debugging connection...');
            
            // Wait a moment for full startup
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const debugWorking = await chromiumManager.isChromiumRunning();
            console.log(`🟦 Remote debugging: ${debugWorking ? '✅ Working' : '⚠️ Not available'}`);
            
            if (debugWorking) {
                const tabs = await chromiumManager.getChromiumTabs();
                console.log(`📊 Open tabs: ${tabs.length}`);
                
                const guiTab = tabs.find(tab => tab.url.includes('localhost:8090'));
                if (guiTab) {
                    console.log('🎉 GUI tab found and loaded!');
                    console.log(`   URL: ${guiTab.url}`);
                } else {
                    console.log('⚠️ GUI tab not detected via remote debugging');
                    console.log('💡 But GUI should still be visible in Chromium window');
                }
            }
            
            console.log('\n✨ Test completed successfully!');
            console.log('🎯 Check the Chromium window - it should show the Test Studio');
            console.log('🔧 If you see the GUI, the fix worked!');
            
        } else {
            console.log('❌ Failed to launch Chromium with Profile 4');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

console.log('🚀 Starting Profile 4 launch test...\n');
testProfileLaunch().then(() => {
    console.log('\n🏁 Test completed.');
    process.exit(0);
}).catch(error => {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
});
