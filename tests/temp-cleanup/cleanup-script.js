#!/usr/bin/env node

/**
 * 🧹 Cleanup Script - Remove temporary and test files
 */

import { existsSync, renameSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cleanupDir = path.join(__dirname, 'temp-cleanup');

// Files to move to cleanup directory
const filesToCleanup = [
    // Test files
    'test-chromium-launch.js',
    'test-profile-4-launch.js', 
    'test-firefox-integration.js',
    'quick-chromium-test.js',
    'quick-chromium-test.bat',
    'quick-firefox-test.js',
    'quick-firefox-test.bat',
    'validate-setup.js',
    
    // Documentation files (keep only README.md)
    'CHROMIUM-INTEGRATION-COMPLETE.md',
    'CHROMIUM-LAUNCH-FIX.md',
    'COMPREHENSIVE-DOCUMENTATION.md',
    'COMPREHENSIVE-OAUTH-TESTING-SUMMARY.md',
    'FIREFOX-TROUBLESHOOTING.md',
    'GUI-SETUP-GUIDE.md',
    'IMPLEMENTATION-COMPLETE.md',
    'PHASE-1-FIREFOX-INTEGRATION-COMPLETE.md',
    'PROFILE-SELECTION-FIX.md',
    'test-runner-ui-improvements.md',
    'TEST-STUDIO-TRANSFORMATION.md'
];

console.log('🧹 Cleaning up tests folder...\n');

let movedCount = 0;
let errorCount = 0;

for (const file of filesToCleanup) {
    const sourcePath = path.join(__dirname, file);
    const destPath = path.join(cleanupDir, file);
    
    if (existsSync(sourcePath)) {
        try {
            renameSync(sourcePath, destPath);
            console.log(`✅ Moved: ${file}`);
            movedCount++;
        } catch (error) {
            console.log(`❌ Failed to move: ${file} - ${error.message}`);
            errorCount++;
        }
    } else {
        console.log(`⚠️ Not found: ${file}`);
    }
}

console.log(`\n📊 Cleanup Summary:`);
console.log(`✅ Moved: ${movedCount} files`);
console.log(`❌ Errors: ${errorCount} files`);
console.log(`📁 Files moved to: temp-cleanup/`);

console.log('\n🎯 Essential files remaining:');
const essentialFiles = [
    'launch-gui.js',
    'launch-gui.bat', 
    'chromium-manager.js',
    'run-all-tests-gui.js',
    'run-all-tests.js',
    'test-runner-gui.html',
    'test-runner-script.js',
    'test-runner-styles.css',
    'package.json',
    'playwright.config.js',
    'vitest.config.js',
    'setup.js',
    'README.md'
];

essentialFiles.forEach(file => {
    const exists = existsSync(path.join(__dirname, file));
    console.log(`${exists ? '✅' : '❌'} ${file}`);
});

console.log('\n🎉 Cleanup completed! Tests folder is now clean and organized.');
