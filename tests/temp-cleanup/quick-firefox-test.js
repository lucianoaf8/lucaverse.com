#!/usr/bin/env node

/**
 * 🔥 Simple Firefox Launch Test
 * Minimal test to debug Firefox launching issues
 */

import { firefoxManager } from './firefox-manager.js';

async function quickFirefoxTest() {
    console.log('🔥 Quick Firefox Launch Test');
    console.log('='.repeat(30));

    try {
        // Test 1: Check Firefox path
        console.log('\n1️⃣ Firefox Detection:');
        console.log(`   Path: ${firefoxManager.firefoxPath}`);
        console.log(`   Debug Port: ${firefoxManager.debugPort}`);

        // Test 2: Check if port is available
        console.log('\n2️⃣ Port Check:');
        const portInUse = await firefoxManager.isPortInUse(firefoxManager.debugPort);
        console.log(`   Port ${firefoxManager.debugPort} in use: ${portInUse}`);

        // Test 3: Check if Firefox already running
        console.log('\n3️⃣ Existing Firefox Check:');
        const alreadyRunning = await firefoxManager.isFirefoxRunning();
        console.log(`   Firefox already running: ${alreadyRunning}`);

        if (alreadyRunning) {
            console.log('✅ Firefox is already running with remote debugging!');
            const status = await firefoxManager.getStatus();
            console.log('   Status:', JSON.stringify(status, null, 2));
            return;
        }

        // Test 4: Try to launch Firefox
        console.log('\n4️⃣ Launching Firefox:');
        const launched = await firefoxManager.launchFirefox();

        if (launched) {
            console.log('✅ Success! Firefox launched successfully');
            
            // Test 5: Get status
            const status = await firefoxManager.getStatus();
            console.log('\n5️⃣ Final Status:');
            console.log(JSON.stringify(status, null, 2));
            
            console.log('\n🎉 Firefox is ready for Test Studio!');
            console.log('💡 You can now run: node launch-gui.js');
            
        } else {
            console.log('❌ Failed to launch Firefox');
            console.log('\n🔧 Troubleshooting:');
            console.log('1. Close all Firefox windows');
            console.log('2. Run this test again');
            console.log('3. Check Windows Task Manager for firefox.exe processes');
            console.log('4. Try running Command Prompt as Administrator');
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.log('\n🔧 Debug Information:');
        console.log('- Firefox path:', firefoxManager.firefoxPath);
        console.log('- Debug port:', firefoxManager.debugPort);
        console.log('- Error type:', error.constructor.name);
        console.log('\n💡 Try running as Administrator if the issue persists');
    }
}

// Handle cleanup
process.on('SIGINT', async () => {
    console.log('\n🛑 Cleaning up...');
    await firefoxManager.cleanup();
    process.exit(0);
});

// Run the test
quickFirefoxTest().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
});
