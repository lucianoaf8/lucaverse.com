#!/usr/bin/env node

/**
 * 🚀 Lucaverse Test Studio Launcher
 * Installs dependencies and launches the professional test studio
 */

import { execSync } from 'child_process';
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

// Launch the Test Studio
console.log('🖥️  Launching Professional Test Studio...');
console.log('🌐 Studio Interface: http://localhost:8090');
console.log('✨ Features: Real-time monitoring, profiles, queue management');
console.log('⌨️  Shortcuts: F1 for help, Ctrl+R to start tests\n');

try {
    execSync('node run-all-tests-gui.js --gui', { 
        stdio: 'inherit', 
        cwd: __dirname 
    });
} catch (error) {
    console.error('❌ Failed to launch test studio:', error.message);
    process.exit(1);
}