// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './gui-tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'test-reports/playwright-report' }],
    ['json', { outputFile: 'test-reports/playwright-results.json' }],
    ['list']
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5155',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    /* Record video on failure */
    video: 'retain-on-failure'
  },

  /* Configure projects for major browsers - Chromium prioritized for Test Studio */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Connect to existing Chromium instance if available
        // This will be overridden by the chromium-manager when in GUI mode
        launchOptions: {
          // Will be configured by chromium-manager in GUI mode
          executablePath: process.env.CHROMIUM_PATH || 
            'C:\\Users\\lucia\\.codeium\\windsurf\\ws-browser\\chromium-1155\\chrome-win\\chrome.exe',
          args: process.env.CHROMIUM_DEBUG_PORT ? 
            [`--remote-debugging-port=${process.env.CHROMIUM_DEBUG_PORT}`, '--profile-directory=Profile 7'] : 
            ['--profile-directory=Profile 7'],
          headless: false, // Always run in headed mode for better debugging
        }
      },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5155',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});