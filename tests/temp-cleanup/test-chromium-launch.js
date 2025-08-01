#!/usr/bin/env node

/**
 * 🧪 Quick Chromium Launch Test
 * Tests the Chromium launch functionality with GUI URL loading
 */

import { chromiumManager } from './chromium-manager.js';

console.log('🟦 Testing Chromium Launch with GUI URL...');
console.log('================================================\n');

async function testChromiumLaunch() {
    try {
        console.log('🚀 Step 1: Attempting to launch Chromium...');
        const launched = await chromiumManager.launchChromium();
        
        if (launched) {
            console.log('✅ Chromium launched successfully!');
            console.log('🌐 GUI should be loading at: http://localhost:8090');
            console.log('🟦 Using Profile: Profile 7');
            
            // Wait a moment for Chromium to fully load
            console.log('\n⏳ Waiting 5 seconds for Chromium to fully load...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Check if remote debugging is working
            console.log('\n🔍 Step 2: Testing remote debugging connection...');
            const debugWorking = await chromiumManager.isChromiumRunning();
            
            if (debugWorking) {
                console.log('✅ Remote debugging is working!');
                
                // Try to get tabs info
                const tabs = await chromiumManager.getChromiumTabs();
                console.log(`📊 Found ${tabs.length} open tabs`);
                
                // Look for GUI tab
                const guiTab = tabs.find(tab => tab.url.includes('localhost:8090'));
                if (guiTab) {
                    console.log('🌐 GUI tab found!');
                    console.log(`   URL: ${guiTab.url}`);
                    console.log(`   Title: ${guiTab.title}`);
                } else {
                    console.log('⚠️ GUI tab not found - manual navigation may be needed');
                }
            } else {
                console.log('⚠️ Remote debugging not available, but Chromium should be running');
                console.log('💡 Try manually navigating to: http://localhost:8090');
            }
            
            console.log('\n✨ Test completed! Chromium should remain open.');
            console.log('💡 If you see a blank page, manually navigate to: http://localhost:8090');
            
        } else {
            console.log('❌ Failed to launch Chromium');
            console.log('💡 Check the error messages above for troubleshooting');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n🔧 Troubleshooting tips:');
        console.log('1. Verify Chromium path exists');
        console.log('2. Check if port 9223 is available');
        console.log('3. Try running as Administrator');
        console.log('4. Check if any antivirus is blocking the launch');
    }
}

// Run the test
console.log('🎯 Starting Chromium launch test...\n');
testChromiumLaunch().then(() => {
    console.log('\n🏁 Test script completed.');
    console.log('🔍 Check Chromium window to verify GUI loaded successfully.');
    process.exit(0);
}).catch(error => {
    console.error('💥 Test script failed:', error.message);
    process.exit(1);
});
