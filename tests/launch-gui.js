#!/usr/bin/env node

/**
 * 🚀 Lucaverse Test Studio Launcher - SIMPLE VERSION
 * Just opens Chromium with Profile 7 and starts the server
 */

import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Lucaverse Test Studio Setup & Launch');
console.log('=======================================\n');

// Check if required files exist
const requiredFiles = [
    'test-runner-gui.html',
    'test-runner-styles.css', 
    'test-runner-script.js',
    'run-all-tests-gui.js'
];

const missingFiles = requiredFiles.filter(file => !existsSync(path.join(__dirname, file)));

if (missingFiles.length > 0) {
    console.error('❌ Missing required files:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    console.log('\n💡 Please ensure all test studio files are present');
    process.exit(1);
}

console.log('✅ All test studio files found\n');

// Check if dependencies are installed
const nodeModulesPath = path.join(__dirname, 'node_modules');
const wsInstalled = existsSync(path.join(nodeModulesPath, 'ws'));

if (!wsInstalled) {
    console.log('📦 Installing required dependencies...');
    try {
        execSync('npm install ws', { 
            stdio: 'inherit', 
            cwd: __dirname 
        });
        console.log('✅ Dependencies installed successfully\n');
    } catch (error) {
        console.error('❌ Failed to install dependencies:', error.message);
        console.log('💡 Please run: npm install ws');
        process.exit(1);
    }
} else {
    console.log('✅ Dependencies already installed\n');
}

// Check if server is available
async function waitForServer(maxAttempts = 20) {
    console.log('⏳ Waiting for Test Studio server to be ready...');
    
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch('http://localhost:8090');
            if (response.ok) {
                console.log('✅ Test Studio server is ready!');
                return true;
            }
        } catch (error) {
            // Server not ready yet
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    }
    
    throw new Error('Test Studio server failed to start');
}

// Main launcher function
async function launchTestStudio() {
    console.log('🖥️  Launching Professional Test Studio with Chromium...');
    console.log('🌐 Studio Interface: http://localhost:8090');
    console.log('🟦 Using Profile 7 (your confirmed working profile)');
    console.log('✨ Features: Real-time monitoring, profiles, queue management\n');

    console.log('🟦 Step 1: Starting Test Studio server...');
    
    // Start the server in background
    const serverProcess = spawn('node', ['run-all-tests-gui.js', '--gui'], {
        cwd: __dirname,
        stdio: ['inherit', 'pipe', 'pipe']
    });

    let serverOutput = '';
    
    serverProcess.stdout.on('data', (data) => {
        const text = data.toString();
        serverOutput += text;
        
        // Only show important server messages
        if (text.includes('server started') || text.includes('ready')) {
            console.log('🌐', text.trim());
        }
    });

    serverProcess.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
    });

    try {
        // Wait for server to be ready
        await waitForServer();
        
        console.log('🟦 Step 2: Opening Chromium with Profile 7...');
        
        // YOUR EXACT WORKING COMMAND
        const chromiumCommand = 'C:\\Users\\lucia\\.codeium\\windsurf\\ws-browser\\chromium-1155\\chrome-win\\chrome.exe';
        const chromiumArgs = ['--profile-directory=Profile 7', 'http://localhost:8090'];
        
        console.log(`🟦 Running: ${chromiumCommand} ${chromiumArgs.join(' ')}`);
        
        // Launch Chromium with your exact command
        const chromiumProcess = spawn(chromiumCommand, chromiumArgs, {
            detached: true,
            stdio: 'ignore'
        });
        
        chromiumProcess.unref(); // Don't wait for it
        
        console.log('✅ SUCCESS! Chromium launched with Profile 7');
        console.log('🌐 Test Studio should open in Chromium');

        console.log('\n📝 Press Ctrl+C to stop the server');
        
        // Handle cleanup on exit
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down...');
            serverProcess.kill();
            process.exit(0);
        });
        
        // Keep process alive
        process.stdin.resume();
        
    } catch (error) {
        console.error('❌ Failed to start Test Studio:', error.message);
        serverProcess.kill();
        process.exit(1);
    }
}

// Start the launcher
launchTestStudio().catch(error => {
    console.error('❌ Launch failed:', error.message);
    process.exit(1);
});
