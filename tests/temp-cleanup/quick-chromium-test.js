#!/usr/bin/env node

/**
 * 🟦 Quick Chromium Launch Test
 * Minimal test to verify Chromium launching with specific profile
 */

import { chromiumManager } from './chromium-manager.js';

async function quickChromiumTest() {
    console.log('🟦 Quick Chromium Launch Test');
    console.log('='.repeat(30));

    try {
        // Test 1: Check Chromium path
        console.log('\n1️⃣ Chromium Detection:');
        console.log(`   Path: ${chromiumManager.chromiumPath}`);
        console.log(`   Profile: ${chromiumManager.profileDirectory}`);
        console.log(`   Debug Port: ${chromiumManager.debugPort}`);

        // Test 2: Check if port is available
        console.log('\n2️⃣ Port Check:');
        const portInUse = await chromiumManager.isPortInUse(chromiumManager.debugPort);
        console.log(`   Port ${chromiumManager.debugPort} in use: ${portInUse}`);

        // Test 3: Check if Chromium already running
        console.log('\n3️⃣ Existing Chromium Check:');
        const alreadyRunning = await chromiumManager.isChromiumRunning();
        console.log(`   Chromium already running: ${alreadyRunning}`);

        if (alreadyRunning) {
            console.log('✅ Chromium is already running with remote debugging!');
            const status = await chromiumManager.getStatus();
            console.log('   Status:', JSON.stringify(status, null, 2));
            return;
        }

        // Test 4: Try to launch Chromium
        console.log('\n4️⃣ Launching Chromium:');
        const launched = await chromiumManager.launchChromium();

        if (launched) {
            console.log('✅ Success! Chromium launched successfully');
            
            // Test 5: Get status
            const status = await chromiumManager.getStatus();
            console.log('\n5️⃣ Final Status:');
            console.log(JSON.stringify(status, null, 2));
            
            console.log('\n🎉 Chromium is ready for Test Studio!');
            console.log('💡 You can now run: node launch-gui.js');
            
        } else {
            console.log('❌ Failed to launch Chromium');
            console.log('\n🔧 Troubleshooting:');
            console.log('1. Verify Chromium executable exists');
            console.log('2. Check if Profile 7 exists in Chromium');
            console.log('3. Try running as Administrator');
            console.log('4. Close any existing Chromium instances');
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.log('\n🔧 Debug Information:');
        console.log('- Chromium path:', chromiumManager.chromiumPath);
        console.log('- Profile directory:', chromiumManager.profileDirectory);
        console.log('- Debug port:', chromiumManager.debugPort);
        console.log('- Error type:', error.constructor.name);
        console.log('\n💡 Make sure the Chromium executable path is correct');
    }
}

// Handle cleanup
process.on('SIGINT', async () => {
    console.log('\n🛑 Cleaning up...');
    await chromiumManager.cleanup();
    process.exit(0);
});

// Run the test
quickChromiumTest().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
});
