#!/usr/bin/env node

/**
 * 🔥 Firefox Instance Manager for Lucaverse Test Studio
 * Manages Firefox launching, tab creation, and remote debugging integration
 */

import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Firefox Manager Class - Handles Firefox instance lifecycle
 */
export class FirefoxManager {
    constructor() {
        this.debugPort = 9222;
        this.firefoxProcess = null;
        this.guiTabId = null;
        this.testTabs = new Map(); // testId -> tabId mapping
        this.isRunning = false;
        this.firefoxPath = this.detectFirefoxPath();
        this.guiUrl = 'http://localhost:8090';
    }

    /**
     * Detect Firefox executable path on the system
     */
    detectFirefoxPath() {
        const possiblePaths = [
            'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
            'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe',
            'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Mozilla Firefox\\firefox.exe',
            '/Applications/Firefox.app/Contents/MacOS/firefox', // macOS
            '/usr/bin/firefox', // Linux
            '/usr/local/bin/firefox' // Linux alternative
        ];

        for (const firefoxPath of possiblePaths) {
            if (existsSync(firefoxPath)) {
                console.log(`🔥 Found Firefox at: ${firefoxPath}`);
                return firefoxPath;
            }
        }

        // Fallback to system PATH
        console.log('🔥 Using Firefox from system PATH');
        return 'firefox';
    }

    /**
     * Launch Firefox with remote debugging enabled
     */
    async launchFirefox() {
        if (this.isRunning) {
            console.log('🔥 Firefox is already running');
            return true;
        }

        // Check if Firefox is already running on the debug port
        if (await this.isFirefoxRunning()) {
            console.log('🔥 Firefox already running with remote debugging');
            this.isRunning = true;
            return true;
        }

        // Check if port is available
        if (await this.isPortInUse(this.debugPort)) {
            console.log(`⚠️ Port ${this.debugPort} is in use. Trying to connect to existing Firefox...`);
            if (await this.isFirefoxRunning()) {
                this.isRunning = true;
                return true;
            }
        }

        try {
            console.log('🔥 Launching Firefox with remote debugging...');
            
            // Create a temporary profile directory for debugging
            const profileDir = path.join(__dirname, '.firefox-debug-profile');
            
            const args = [
                '--remote-debugging-port=' + this.debugPort,
                '--profile=' + profileDir,
                '--no-remote',
                '--no-default-browser-check',
                '--disable-default-apps',
                '--disable-popup-blocking',
                '--disable-translate',
                '--disable-background-timer-throttling',
                '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows',
                '--disable-ipc-flooding-protection',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-sync',
                '--no-first-run',
                '--disable-features=VizDisplayCompositor'
            ];

            console.log(`🔥 Firefox command: ${this.firefoxPath} ${args.join(' ')}`);

            // Launch Firefox
            this.firefoxProcess = spawn(this.firefoxPath, args, {
                detached: false,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            // Capture output for debugging
            let stdout = '';
            let stderr = '';
            
            if (this.firefoxProcess.stdout) {
                this.firefoxProcess.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
            }
            
            if (this.firefoxProcess.stderr) {
                this.firefoxProcess.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
            }

            // Handle Firefox process events
            this.firefoxProcess.on('error', (error) => {
                console.error('❌ Firefox spawn error:', error.message);
                this.isRunning = false;
            });

            this.firefoxProcess.on('exit', (code, signal) => {
                console.log(`🔥 Firefox process exited with code: ${code}, signal: ${signal}`);
                if (code !== 0) {
                    console.log('Firefox stdout:', stdout);
                    console.log('Firefox stderr:', stderr);
                }
                this.isRunning = false;
                this.guiTabId = null;
                this.testTabs.clear();
            });

            // Wait for Firefox to start
            console.log('🔥 Waiting for Firefox remote debugging to be ready...');
            await this.waitForFirefoxReady(15); // Increased timeout to 15 seconds
            this.isRunning = true;

            console.log('✅ Firefox launched successfully');
            return true;

        } catch (error) {
            console.error('❌ Failed to launch Firefox:', error.message);
            console.log('💡 Troubleshooting tips:');
            console.log('- Close any existing Firefox instances');
            console.log('- Check if port 9222 is available');
            console.log('- Try running as administrator');
            return false;
        }
    }

    /**
     * Wait for Firefox remote debugging to be ready
     */
    async waitForFirefoxReady(maxAttempts = 10) {
        console.log(`🔥 Waiting for Firefox on port ${this.debugPort} (max ${maxAttempts} attempts)...`);
        
        for (let i = 0; i < maxAttempts; i++) {
            try {
                console.log(`🔥 Attempt ${i + 1}/${maxAttempts}: Checking Firefox remote debugging...`);
                const response = await fetch(`http://localhost:${this.debugPort}/json/version`, {
                    signal: AbortSignal.timeout(5000) // 5 second timeout per request
                });
                
                if (response.ok) {
                    const version = await response.json();
                    console.log(`✅ Firefox remote debugging ready! Version: ${version.Product}`);
                    return true;
                }
            } catch (error) {
                console.log(`⏳ Attempt ${i + 1} failed: ${error.message}`);
                if (i < maxAttempts - 1) {
                    console.log('🔄 Retrying in 2 seconds...');
                    await this.sleep(2000);
                }
            }
        }
        throw new Error(`Firefox remote debugging failed to start after ${maxAttempts} attempts`);
    }

    /**
     * Check if a port is in use
     */
    async isPortInUse(port) {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.listen(port, () => {
                server.once('close', () => {
                    resolve(false); // Port is available
                });
                server.close();
            });
            server.on('error', () => {
                resolve(true); // Port is in use
            });
        });
    }

    /**
     * Open the GUI interface in Firefox
     */
    async openGUIInFirefox() {
        try {
            console.log('🌐 Opening Test Studio GUI in Firefox...');
            
            // Check if GUI tab already exists
            if (this.guiTabId) {
                await this.activateTab(this.guiTabId);
                return this.guiTabId;
            }

            // Create new tab for GUI
            const tabData = await this.createNewTab(this.guiUrl);
            this.guiTabId = tabData.id;
            
            console.log(`✅ GUI opened in Firefox tab: ${this.guiTabId}`);
            return this.guiTabId;

        } catch (error) {
            console.error('❌ Failed to open GUI in Firefox:', error.message);
            return null;
        }
    }

    /**
     * Create a new tab for test execution
     */
    async createTestTab(testUrl, testId) {
        try {
            console.log(`🧪 Creating test tab for: ${testId}`);
            
            const tabData = await this.createNewTab(testUrl);
            this.testTabs.set(testId, tabData.id);
            
            console.log(`✅ Test tab created: ${tabData.id} for test: ${testId}`);
            return tabData.id;

        } catch (error) {
            console.error(`❌ Failed to create test tab for ${testId}:`, error.message);
            return null;
        }
    }

    /**
     * Close a test tab when test completes
     */
    async closeTestTab(testId) {
        try {
            const tabId = this.testTabs.get(testId);
            if (!tabId) {
                console.log(`⚠️ No tab found for test: ${testId}`);
                return false;
            }

            // Don't close if it's the GUI tab
            if (tabId === this.guiTabId) {
                console.log('🛡️ Protecting GUI tab from closure');
                return false;
            }

            await this.closeTab(tabId);
            this.testTabs.delete(testId);
            
            console.log(`✅ Closed test tab for: ${testId}`);
            return true;

        } catch (error) {
            console.error(`❌ Failed to close test tab for ${testId}:`, error.message);
            return false;
        }
    }

    /**
     * Get list of all Firefox tabs
     */
    async getFirefoxTabs() {
        try {
            const response = await fetch(`http://localhost:${this.debugPort}/json`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('❌ Failed to get Firefox tabs:', error.message);
            return [];
        }
    }

    /**
     * Create a new tab with specified URL
     */
    async createNewTab(url) {
        try {
            const response = await fetch(`http://localhost:${this.debugPort}/json/new?${encodeURIComponent(url)}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('❌ Failed to create new tab:', error.message);
            throw error;
        }
    }

    /**
     * Close a tab by ID
     */
    async closeTab(tabId) {
        try {
            const response = await fetch(`http://localhost:${this.debugPort}/json/close/${tabId}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return true;
        } catch (error) {
            console.error(`❌ Failed to close tab ${tabId}:`, error.message);
            throw error;
        }
    }

    /**
     * Activate (focus) a tab by ID
     */
    async activateTab(tabId) {
        try {
            const response = await fetch(`http://localhost:${this.debugPort}/json/activate/${tabId}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return true;
        } catch (error) {
            console.error(`❌ Failed to activate tab ${tabId}:`, error.message);
            return false;
        }
    }

    /**
     * Get Firefox configuration for Playwright
     */
    getPlaywrightConfig() {
        return {
            browserName: 'firefox',
            launchOptions: {
                executablePath: this.firefoxPath,
                args: [`--remote-debugging-port=${this.debugPort}`],
                headless: false
            },
            connectOptions: {
                wsEndpoint: `ws://localhost:${this.debugPort}`
            }
        };
    }

    /**
     * Cleanup and close Firefox
     */
    async cleanup() {
        try {
            console.log('🧹 Cleaning up Firefox manager...');
            
            // Close all test tabs (but keep GUI tab)
            for (const [testId, tabId] of this.testTabs) {
                if (tabId !== this.guiTabId) {
                    await this.closeTestTab(testId);
                }
            }

            // Keep Firefox running with GUI tab open
            console.log('✅ Firefox cleanup completed (keeping GUI tab open)');
            
        } catch (error) {
            console.error('❌ Error during Firefox cleanup:', error.message);
        }
    }

    /**
     * Force quit Firefox (for emergency situations)
     */
    async forceQuitFirefox() {
        try {
            console.log('🚨 Force quitting Firefox...');
            
            if (this.firefoxProcess) {
                this.firefoxProcess.kill('SIGTERM');
                
                // If it doesn't close gracefully, force kill
                setTimeout(() => {
                    if (this.firefoxProcess && !this.firefoxProcess.killed) {
                        this.firefoxProcess.kill('SIGKILL');
                    }
                }, 5000);
            }

            this.isRunning = false;
            this.guiTabId = null;
            this.testTabs.clear();
            
            console.log('✅ Firefox force quit completed');
            
        } catch (error) {
            console.error('❌ Error during Firefox force quit:', error.message);
        }
    }

    /**
     * Check if Firefox is running with remote debugging
     */
    async isFirefoxRunning() {
        try {
            const response = await fetch(`http://localhost:${this.debugPort}/json/version`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get Firefox status information
     */
    async getStatus() {
        const isRunning = await this.isFirefoxRunning();
        const tabs = isRunning ? await this.getFirefoxTabs() : [];
        
        return {
            isRunning,
            debugPort: this.debugPort,
            guiTabId: this.guiTabId,
            testTabsCount: this.testTabs.size,
            totalTabs: tabs.length,
            firefoxPath: this.firefoxPath
        };
    }

    /**
     * Utility function for sleep/delay
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export singleton instance
export const firefoxManager = new FirefoxManager();

// Handle process cleanup
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, cleaning up Firefox...');
    await firefoxManager.cleanup();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, cleaning up Firefox...');
    await firefoxManager.cleanup();
    process.exit(0);
});
