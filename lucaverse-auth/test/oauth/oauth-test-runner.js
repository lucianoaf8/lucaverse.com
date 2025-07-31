/**
 * OAuth Authentication Flow Test Runner
 * 
 * This module provides a comprehensive testing framework for OAuth authentication flows
 * using browser automation tools. It handles popup windows, cross-origin communication,
 * and provides detailed logging and screenshot capabilities.
 */

const fs = require('fs').promises;
const path = require('path');

class OAuthTestRunner {
  constructor(options = {}) {
    this.options = {
      baseUrl: 'https://lucaverse.com',
      oauthWorkerUrl: 'https://lucaverse-auth.lucianoaf8.workers.dev',
      screenshotDir: path.join(__dirname, 'screenshots'),
      reportDir: path.join(__dirname, 'reports'),
      timeout: 30000,
      retryAttempts: 3,
      ...options
    };
    
    this.testResults = [];
    this.screenshots = [];
    this.networkLogs = [];
    this.consoleMessages = [];
    this.startTime = null;
  }

  /**
   * Initialize test environment and create necessary directories
   */
  async initialize() {
    console.log('🚀 Initializing OAuth Test Runner...');
    this.startTime = Date.now();
    
    // Create directories if they don't exist
    await this.ensureDirectories();
    
    // Clear previous test artifacts
    await this.cleanupPreviousRuns();
    
    console.log('✅ Test runner initialized successfully');
  }

  /**
   * Ensure required directories exist
   */
  async ensureDirectories() {
    const dirs = [this.options.screenshotDir, this.options.reportDir];
    
    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    }
  }

  /**
   * Clean up previous test run artifacts
   */
  async cleanupPreviousRuns() {
    try {
      const screenshotFiles = await fs.readdir(this.options.screenshotDir);
      for (const file of screenshotFiles) {
        if (file.endsWith('.png')) {
          await fs.unlink(path.join(this.options.screenshotDir, file));
        }
      }
      console.log('🧹 Cleaned up previous screenshots');
    } catch (error) {
      console.log('ℹ️  No previous screenshots to clean up');
    }
  }

  /**
   * Take a screenshot with timestamp and description
   */
  async takeScreenshot(description, stepNumber = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const stepPrefix = stepNumber ? `step-${stepNumber.toString().padStart(2, '0')}-` : '';
    const filename = `${stepPrefix}${timestamp}-${description.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
    const filepath = path.join(this.options.screenshotDir, filename);
    
    try {
      // This will be implemented using MCP tools
      console.log(`📸 Taking screenshot: ${description}`);
      this.screenshots.push({
        filename,
        filepath,
        description,
        timestamp: new Date().toISOString(),
        stepNumber
      });
      return filepath;
    } catch (error) {
      console.error(`❌ Failed to take screenshot: ${error.message}`);
      return null;
    }
  }

  /**
   * Log test step with timestamp
   */
  logStep(step, description, status = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      step,
      description,
      status
    };
    
    console.log(`${this.getStatusIcon(status)} [${step}] ${description}`);
    this.testResults.push(logEntry);
  }

  /**
   * Get appropriate icon for log status
   */
  getStatusIcon(status) {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🐛'
    };
    return icons[status] || 'ℹ️';
  }

  /**
   * Wait with timeout and retry logic
   */
  async waitWithRetry(operation, description, timeout = this.options.timeout) {
    const maxAttempts = this.options.retryAttempts;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logStep(`WAIT-${attempt}`, `${description} (attempt ${attempt}/${maxAttempts})`);
        
        const result = await Promise.race([
          operation(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), timeout)
          )
        ]);
        
        this.logStep(`WAIT-${attempt}`, `${description} completed successfully`, 'success');
        return result;
      } catch (error) {
        this.logStep(`WAIT-${attempt}`, `${description} failed: ${error.message}`, 'warning');
        
        if (attempt === maxAttempts) {
          this.logStep(`WAIT-FAIL`, `${description} failed after ${maxAttempts} attempts`, 'error');
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  /**
   * Generate comprehensive test report
   */
  async generateReport(testName = 'oauth-flow-test') {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    const report = {
      testName,
      timestamp: new Date().toISOString(),
      duration: `${(duration / 1000).toFixed(2)}s`,
      summary: {
        totalSteps: this.testResults.length,
        successfulSteps: this.testResults.filter(r => r.status === 'success').length,
        failedSteps: this.testResults.filter(r => r.status === 'error').length,
        warningSteps: this.testResults.filter(r => r.status === 'warning').length
      },
      steps: this.testResults,
      screenshots: this.screenshots,
      networkLogs: this.networkLogs,
      consoleMessages: this.consoleMessages,
      configuration: this.options
    };

    // Write JSON report
    const reportPath = path.join(this.options.reportDir, `${testName}-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Write human-readable report
    const htmlReportPath = path.join(this.options.reportDir, `${testName}-${Date.now()}.html`);
    await this.generateHtmlReport(report, htmlReportPath);

    console.log(`📊 Test report generated: ${reportPath}`);
    console.log(`📋 HTML report generated: ${htmlReportPath}`);

    return report;
  }

  /**
   * Generate HTML report for better readability
   */
  async generateHtmlReport(report, outputPath) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OAuth Test Report - ${report.testName}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #00E5FF; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
        .summary-card.success { border-left: 4px solid #28a745; }
        .summary-card.error { border-left: 4px solid #dc3545; }
        .summary-card.warning { border-left: 4px solid #ffc107; }
        .summary-card.info { border-left: 4px solid #17a2b8; }
        .steps { margin-bottom: 30px; }
        .step { margin-bottom: 15px; padding: 15px; border-radius: 6px; border-left: 4px solid #dee2e6; }
        .step.success { border-left-color: #28a745; background: #f8fff8; }
        .step.error { border-left-color: #dc3545; background: #fff8f8; }
        .step.warning { border-left-color: #ffc107; background: #fffdf8; }
        .step.info { border-left-color: #17a2b8; background: #f8fdff; }
        .timestamp { color: #6c757d; font-size: 0.9em; }
        .screenshots { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .screenshot { border: 1px solid #dee2e6; border-radius: 6px; overflow: hidden; }
        .screenshot img { width: 100%; height: auto; }
        .screenshot-info { padding: 10px; background: #f8f9fa; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>OAuth Authentication Flow Test Report</h1>
            <p><strong>Test:</strong> ${report.testName}</p>
            <p><strong>Timestamp:</strong> ${report.timestamp}</p>
            <p><strong>Duration:</strong> ${report.duration}</p>
        </div>

        <div class="summary">
            <div class="summary-card info">
                <h3>${report.summary.totalSteps}</h3>
                <p>Total Steps</p>
            </div>
            <div class="summary-card success">
                <h3>${report.summary.successfulSteps}</h3>
                <p>Successful</p>
            </div>
            <div class="summary-card error">
                <h3>${report.summary.failedSteps}</h3>
                <p>Failed</p>
            </div>
            <div class="summary-card warning">
                <h3>${report.summary.warningSteps}</h3>
                <p>Warnings</p>
            </div>
        </div>

        <div class="steps">
            <h2>Test Steps</h2>
            ${report.steps.map(step => `
                <div class="step ${step.status}">
                    <h4>[${step.step}] ${step.description}</h4>
                    <div class="timestamp">${step.timestamp}</div>
                </div>
            `).join('')}
        </div>

        ${report.screenshots.length > 0 ? `
        <div class="screenshots-section">
            <h2>Screenshots</h2>
            <div class="screenshots">
                ${report.screenshots.map(screenshot => `
                    <div class="screenshot">
                        <div class="screenshot-info">
                            <strong>Step ${screenshot.stepNumber || 'N/A'}:</strong> ${screenshot.description}<br>
                            <span class="timestamp">${screenshot.timestamp}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <div class="configuration">
            <h2>Test Configuration</h2>
            <pre>${JSON.stringify(report.configuration, null, 2)}</pre>
        </div>
    </div>
</body>
</html>`;

    await fs.writeFile(outputPath, html);
  }

  /**
   * Cleanup resources and generate final report
   */
  async cleanup() {
    console.log('🧹 Cleaning up test runner...');
    
    // Generate final report
    const report = await this.generateReport();
    
    console.log(`✅ Test completed in ${report.duration}`);
    console.log(`📊 Summary: ${report.summary.successfulSteps} success, ${report.summary.failedSteps} failed, ${report.summary.warningSteps} warnings`);
    
    return report;
  }
}

module.exports = { OAuthTestRunner };