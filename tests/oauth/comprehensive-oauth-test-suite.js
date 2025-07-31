/**
 * Comprehensive OAuth Test Suite Runner
 * 
 * This is the main test orchestrator that runs all OAuth tests in sequence,
 * generates comprehensive reports, and provides CI/CD integration capabilities.
 * 
 * It coordinates:
 * - OAuth Flow Main Test (existing)
 * - OAuth Popup Communication Test
 * - OAuth Session Storage Test  
 * - OAuth Browser Automation Test
 * - Custom security and performance tests
 * 
 * Features:
 * - Parallel and sequential test execution
 * - Comprehensive reporting with HTML dashboard
 * - CI/CD integration with exit codes
 * - Performance metrics and trending
 * - Screenshot and log aggregation
 * - Issue detection and classification
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Import all test suites
const OAuthFlowTester = require('./oauth-flow-main.js');
const { OAuthPopupCommunicationTester } = require('./oauth-popup-communication-test.js');
const { OAuthSessionStorageTester } = require('./oauth-session-storage-test.js');
const { OAuthBrowserAutomationTester } = require('./oauth-browser-automation-test.js');

class ComprehensiveOAuthTestSuite {
  constructor(options = {}) {
    this.options = {
      baseUrl: 'https://lucaverse.com',
      oauthWorkerUrl: 'https://lucaverse-auth.lucianoaf8.workers.dev',
      outputDir: path.join(__dirname, 'reports'),
      screenshotDir: path.join(__dirname, 'screenshots'),
      runParallel: false, // Run tests sequentially by default for stability
      timeout: 120000, // 2 minutes per test suite
      retryFailedTests: true,
      generateDashboard: true,
      ciMode: false, // Set to true for CI/CD environments
      ...options
    };

    this.suiteResults = [];
    this.overallMetrics = {};
    this.startTime = null;
    this.endTime = null;
    this.criticalIssues = [];
    this.performanceMetrics = {};
  }

  /**
   * Initialize the comprehensive test suite
   */
  async initialize() {
    console.log('🚀 Initializing Comprehensive OAuth Test Suite...');
    this.startTime = Date.now();
    
    // Create output directories
    await this.ensureDirectories();
    
    // Initialize logging
    await this.initializeLogging();
    
    // Clean up previous runs if needed
    await this.cleanupPreviousRuns();
    
    console.log('✅ Test suite initialized successfully');
  }

  /**
   * Run all test suites
   */
  async runAllTests() {
    console.log('🎯 Starting Comprehensive OAuth Test Execution');
    
    const testSuites = [
      {
        name: 'OAuth Flow Main',
        class: OAuthFlowTester,
        priority: 'high',
        description: 'Core OAuth flow testing with popup handling'
      },
      {
        name: 'OAuth Popup Communication',
        class: OAuthPopupCommunicationTester,
        priority: 'critical',
        description: 'PostMessage communication and popup closing issues'
      },
      {
        name: 'OAuth Session Storage',
        class: OAuthSessionStorageTester,
        priority: 'high',
        description: 'Session storage bugs and COOP header validation'
      },
      {
        name: 'OAuth Browser Automation',
        class: OAuthBrowserAutomationTester,
        priority: 'medium',
        description: 'End-to-end browser automation with MCP tools'
      }
    ];

    try {
      if (this.options.runParallel) {
        await this.runTestSuitesParallel(testSuites);
      } else {
        await this.runTestSuitesSequential(testSuites);
      }

      // Analyze overall results
      await this.analyzeOverallResults();
      
      // Generate comprehensive reports
      await this.generateComprehensiveReports();
      
      // Determine exit code for CI/CD
      const exitCode = this.determineExitCode();
      
      this.endTime = Date.now();
      const totalDuration = this.endTime - this.startTime;
      
      console.log(`\n🎉 All OAuth tests completed in ${(totalDuration / 1000).toFixed(2)}s`);
      this.printSummary();
      
      if (this.options.ciMode) {
        process.exit(exitCode);
      }
      
      return this.generateFinalReport();
      
    } catch (error) {
      console.error('💥 Test suite execution failed:', error.message);
      
      if (this.options.ciMode) {
        process.exit(1);
      }
      
      throw error;
    }
  }

  /**
   * Run test suites sequentially (recommended for stability)
   */
  async runTestSuitesSequential(testSuites) {
    console.log('📋 Running test suites sequentially...');
    
    for (const [index, suite] of testSuites.entries()) {
      console.log(`\n📦 [${index + 1}/${testSuites.length}] Starting ${suite.name}...`);
      
      const result = await this.runSingleTestSuite(suite);
      this.suiteResults.push(result);
      
      // Stop on critical failures if not in retry mode
      if (result.status === 'failed' && suite.priority === 'critical' && !this.options.retryFailedTests) {
        console.log('🚨 Critical test suite failed, stopping execution');
        break;
      }
      
      // Add delay between tests to prevent resource conflicts
      if (index < testSuites.length - 1) {
        console.log('⏳ Waiting 2 seconds before next test suite...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  /**
   * Run test suites in parallel (faster but potentially less stable)
   */
  async runTestSuitesParallel(testSuites) {
    console.log('⚡ Running test suites in parallel...');
    
    const promises = testSuites.map(suite => 
      this.runSingleTestSuite(suite).catch(error => ({
        name: suite.name,
        status: 'failed',
        error: error.message,
        duration: 0,
        testResults: []
      }))
    );
    
    this.suiteResults = await Promise.all(promises);
  }

  /**
   * Run a single test suite with proper error handling and reporting
   */
  async runSingleTestSuite(suite) {
    const suiteStartTime = Date.now();
    
    try {
      console.log(`🔬 Initializing ${suite.name}...`);
      
      // Create test instance with comprehensive options
      const testInstance = new suite.class({
        baseUrl: this.options.baseUrl,
        oauthWorkerUrl: this.options.oauthWorkerUrl,
        screenshotDir: this.options.screenshotDir,
        timeout: this.options.timeout,
        testName: suite.name.toLowerCase().replace(/\s+/g, '-')
      });
      
      // Initialize the test instance
      await testInstance.initialize();
      
      console.log(`🚀 Running ${suite.name} tests...`);
      
      // Run the actual tests
      let testResults;
      if (testInstance.runCompleteTest) {
        testResults = await testInstance.runCompleteTest();
      } else {
        throw new Error('Test instance does not have runCompleteTest method');
      }
      
      // Clean up the test instance
      if (testInstance.cleanup) {
        await testInstance.cleanup();
      }
      
      const suiteDuration = Date.now() - suiteStartTime;
      
      const result = {
        name: suite.name,
        status: 'passed',
        duration: suiteDuration,
        priority: suite.priority,
        description: suite.description,
        testResults: testResults || {},
        metrics: this.extractTestMetrics(testInstance),
        issues: this.extractIssues(testInstance),
        timestamp: new Date().toISOString()
      };
      
      console.log(`✅ ${suite.name} completed successfully in ${(suiteDuration / 1000).toFixed(2)}s`);
      
      return result;
      
    } catch (error) {
      const suiteDuration = Date.now() - suiteStartTime;
      
      console.error(`❌ ${suite.name} failed after ${(suiteDuration / 1000).toFixed(2)}s:`, error.message);
      
      const result = {
        name: suite.name,
        status: 'failed',
        duration: suiteDuration,
        priority: suite.priority,
        description: suite.description,
        error: error.message,
        stack: error.stack,
        testResults: {},
        metrics: {},
        issues: [{ 
          type: 'test-execution-failure',
          severity: 'critical',
          message: error.message 
        }],
        timestamp: new Date().toISOString()
      };
      
      // Retry failed tests if enabled
      if (this.options.retryFailedTests && !error.message.includes('retry')) {
        console.log(`🔄 Retrying ${suite.name}...`);
        
        // Mark as retry to prevent infinite loops
        error.message += ' (retry)';
        
        return await this.runSingleTestSuite(suite);
      }
      
      return result;
    }
  }

  /**
   * Extract test metrics from a test instance
   */
  extractTestMetrics(testInstance) {
    const metrics = {};
    
    // Extract timing metrics
    if (testInstance.timingMetrics) {
      metrics.timing = testInstance.timingMetrics;
    }
    
    // Extract performance metrics
    if (testInstance.performanceMetrics) {
      metrics.performance = testInstance.performanceMetrics;
    }
    
    // Extract browser context metrics
    if (testInstance.browserContext) {
      metrics.browser = {
        screenshotCount: testInstance.browserContext.screenshots?.length || 0,
        networkRequestCount: testInstance.browserContext.networkLogs?.length || 0,
        consoleLogCount: testInstance.browserContext.consoleLogs?.length || 0
      };
    }
    
    // Extract test results metrics
    if (testInstance.testResults) {
      metrics.tests = {
        total: testInstance.testResults.length,
        passed: testInstance.testResults.filter(r => r.status === 'passed').length,
        failed: testInstance.testResults.filter(r => r.status === 'failed').length,
        warnings: testInstance.testResults.filter(r => r.status === 'warning').length
      };
    }
    
    return metrics;
  }

  /**
   * Extract issues from a test instance
   */
  extractIssues(testInstance) {
    const issues = [];
    
    // Extract main issue (critical popup problem)
    if (testInstance.browserContext?.mainIssue) {
      issues.push({
        type: 'oauth-popup-redirect-issue',
        severity: 'critical',
        description: 'Popup loads lucaverse.com instead of closing',
        details: testInstance.browserContext.mainIssue
      });
    }
    
    // Extract session storage issues
    if (testInstance.sessionData?.keyPatternIssue && !testInstance.sessionData.keyPatternIssue.fixValidated) {
      issues.push({
        type: 'session-storage-bug',
        severity: 'high',
        description: 'Session key storage/retrieval mismatch',
        details: testInstance.sessionData.keyPatternIssue
      });
    }
    
    // Extract communication issues
    if (testInstance.messageLog) {
      const communicationIssues = testInstance.messageLog.filter(m => m.issue);
      communicationIssues.forEach(issue => {
        issues.push({
          type: 'communication-issue',
          severity: 'medium',
          description: issue.issue,
          details: issue
        });
      });
    }
    
    // Extract COOP header issues
    if (testInstance.headerValidations) {
      const headerIssues = testInstance.headerValidations.filter(h => 
        h.result && !h.result.success
      );
      
      headerIssues.forEach(issue => {
        issues.push({
          type: 'coop-header-issue',
          severity: 'medium',
          description: 'Cross-origin communication blocked',
          details: issue
        });
      });
    }
    
    return issues;
  }

  /**
   * Analyze overall results and identify patterns
   */
  async analyzeOverallResults() {
    console.log('📊 Analyzing overall test results...');
    
    const analysis = {
      totalSuites: this.suiteResults.length,
      passedSuites: this.suiteResults.filter(r => r.status === 'passed').length,
      failedSuites: this.suiteResults.filter(r => r.status === 'failed').length,
      criticalFailures: this.suiteResults.filter(r => r.status === 'failed' && r.priority === 'critical').length,
      totalDuration: this.suiteResults.reduce((sum, r) => sum + r.duration, 0),
      avgDuration: 0,
      issues: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };
    
    analysis.avgDuration = analysis.totalDuration / analysis.totalSuites;
    
    // Aggregate issues across all test suites
    this.suiteResults.forEach(suite => {
      if (suite.issues) {
        suite.issues.forEach(issue => {
          analysis.issues[issue.severity] = (analysis.issues[issue.severity] || 0) + 1;
          
          if (issue.severity === 'critical') {
            this.criticalIssues.push({
              suite: suite.name,
              ...issue
            });
          }
        });
      }
    });
    
    this.overallMetrics = analysis;
    
    console.log(`📈 Analysis complete: ${analysis.passedSuites}/${analysis.totalSuites} suites passed`);
    console.log(`🚨 Critical issues found: ${analysis.issues.critical}`);
  }

  /**
   * Generate comprehensive reports including HTML dashboard
   */
  async generateComprehensiveReports() {
    console.log('📋 Generating comprehensive reports...');
    
    const timestamp = Date.now();
    
    // Generate JSON report
    await this.generateJSONReport(timestamp);
    
    // Generate HTML dashboard
    if (this.options.generateDashboard) {
      await this.generateHTMLDashboard(timestamp);
    }
    
    // Generate CI/CD report
    if (this.options.ciMode) {
      await this.generateCIReport(timestamp);
    }
    
    // Generate issue summary
    await this.generateIssueSummary(timestamp);
    
    console.log('✅ All reports generated successfully');
  }

  /**
   * Generate detailed JSON report
   */
  async generateJSONReport(timestamp) {
    const report = {
      metadata: {
        testSuite: 'OAuth Comprehensive Test Suite',
        timestamp: new Date().toISOString(),
        duration: this.endTime ? this.endTime - this.startTime : Date.now() - this.startTime,
        version: '1.0.0',
        environment: {
          baseUrl: this.options.baseUrl,
          oauthWorkerUrl: this.options.oauthWorkerUrl,
          nodeVersion: process.version,
          platform: process.platform
        }
      },
      summary: this.overallMetrics,
      suiteResults: this.suiteResults,
      criticalIssues: this.criticalIssues,
      performanceMetrics: this.performanceMetrics,
      configuration: this.options
    };
    
    const reportPath = path.join(this.options.outputDir, `oauth-comprehensive-report-${timestamp}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 JSON report saved: ${reportPath}`);
  }

  /**
   * Generate HTML dashboard for better visualization
   */
  async generateHTMLDashboard(timestamp) {
    const dashboardHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OAuth Test Suite Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f7fa;
            color: #333;
            line-height: 1.6;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        .header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .header p { font-size: 1.1rem; opacity: 0.9; }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 3rem;
        }
        .summary-card {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-left: 4px solid #667eea;
        }
        .summary-card.success { border-left-color: #4CAF50; }
        .summary-card.error { border-left-color: #f44336; }
        .summary-card.warning { border-left-color: #ff9800; }
        .summary-card.info { border-left-color: #2196F3; }
        
        .summary-card h3 { font-size: 2rem; margin-bottom: 0.5rem; }
        .summary-card p { color: #666; font-size: 0.9rem; }
        
        .section {
            background: white;
            border-radius: 8px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .section h2 {
            margin-bottom: 1.5rem;
            color: #333;
            border-bottom: 2px solid #eee;
            padding-bottom: 0.5rem;
        }
        
        .test-suite {
            border: 1px solid #eee;
            border-radius: 6px;
            margin-bottom: 1rem;
            overflow: hidden;
        }
        .test-suite-header {
            padding: 1rem;
            background: #f8f9fa;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .test-suite-header h3 { margin: 0; }
        .status-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-badge.passed { background: #4CAF50; color: white; }
        .status-badge.failed { background: #f44336; color: white; }
        .status-badge.warning { background: #ff9800; color: white; }
        
        .test-suite-body { padding: 1rem; }
        .test-suite-body p { margin-bottom: 0.5rem; color: #666; }
        
        .issues-list {
            list-style: none;
        }
        .issues-list li {
            padding: 0.75rem;
            margin-bottom: 0.5rem;
            border-radius: 4px;
            border-left: 4px solid #ddd;
        }
        .issues-list li.critical { 
            background: #fff5f5; 
            border-left-color: #f44336; 
        }
        .issues-list li.high { 
            background: #fff8f0; 
            border-left-color: #ff9800; 
        }
        .issues-list li.medium { 
            background: #f0f8ff; 
            border-left-color: #2196F3; 
        }
        
        .issue-title { font-weight: bold; margin-bottom: 0.25rem; }
        .issue-description { font-size: 0.9rem; color: #666; }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #eee;
            border-radius: 4px;
            overflow: hidden;
            margin: 0.5rem 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #45a049);
            transition: width 0.3s ease;
        }
        
        .timestamp {
            text-align: center;
            color: #666;
            font-size: 0.9rem;
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid #eee;
        }
        
        .critical-alert {
            background: #fff5f5;
            border: 1px solid #f44336;
            border-radius: 6px;
            padding: 1rem;
            margin-bottom: 2rem;
        }
        .critical-alert h3 {
            color: #f44336;
            margin-bottom: 0.5rem;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>OAuth Test Suite Dashboard</h1>
        <p>Comprehensive OAuth Authentication Testing Results</p>
    </div>
    
    <div class="container">
        ${this.criticalIssues.length > 0 ? `
        <div class="critical-alert">
            <h3>🚨 Critical Issues Detected</h3>
            <p>${this.criticalIssues.length} critical issues found that require immediate attention.</p>
        </div>
        ` : ''}
        
        <div class="summary-grid">
            <div class="summary-card success">
                <h3>${this.overallMetrics.passedSuites || 0}</h3>
                <p>Test Suites Passed</p>
            </div>
            <div class="summary-card error">
                <h3>${this.overallMetrics.failedSuites || 0}</h3>
                <p>Test Suites Failed</p>
            </div>
            <div class="summary-card warning">
                <h3>${this.overallMetrics.issues?.critical || 0}</h3>
                <p>Critical Issues</p>
            </div>
            <div class="summary-card info">
                <h3>${((this.overallMetrics.totalDuration || 0) / 1000).toFixed(1)}s</h3>
                <p>Total Duration</p>
            </div>
        </div>
        
        <div class="section">
            <h2>📊 Success Rate</h2>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${((this.overallMetrics.passedSuites || 0) / (this.overallMetrics.totalSuites || 1) * 100).toFixed(1)}%"></div>
            </div>
            <p>${((this.overallMetrics.passedSuites || 0) / (this.overallMetrics.totalSuites || 1) * 100).toFixed(1)}% of test suites passed successfully</p>
        </div>
        
        <div class="section">
            <h2>🧪 Test Suite Results</h2>
            ${this.suiteResults.map(suite => `
                <div class="test-suite">
                    <div class="test-suite-header">
                        <h3>${suite.name}</h3>
                        <span class="status-badge ${suite.status}">${suite.status}</span>
                    </div>
                    <div class="test-suite-body">
                        <p><strong>Description:</strong> ${suite.description}</p>
                        <p><strong>Duration:</strong> ${(suite.duration / 1000).toFixed(2)}s</p>
                        <p><strong>Priority:</strong> ${suite.priority}</p>
                        ${suite.error ? `<p><strong>Error:</strong> ${suite.error}</p>` : ''}
                        ${suite.issues && suite.issues.length > 0 ? `
                            <p><strong>Issues Found:</strong> ${suite.issues.length}</p>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
        
        ${this.criticalIssues.length > 0 ? `
        <div class="section">
            <h2>🚨 Critical Issues</h2>
            <ul class="issues-list">
                ${this.criticalIssues.map(issue => `
                    <li class="critical">
                        <div class="issue-title">${issue.type} (${issue.suite})</div>
                        <div class="issue-description">${issue.description}</div>
                    </li>
                `).join('')}
            </ul>
        </div>
        ` : ''}
        
        <div class="timestamp">
            Report generated on ${new Date().toLocaleString()}<br>
            Test execution completed in ${((this.endTime || Date.now()) - this.startTime) / 1000}s
        </div>
    </div>
</body>
</html>`;
    
    const dashboardPath = path.join(this.options.outputDir, `oauth-dashboard-${timestamp}.html`);
    await fs.writeFile(dashboardPath, dashboardHTML);
    
    console.log(`🎨 HTML dashboard saved: ${dashboardPath}`);
  }

  /**
   * Generate CI/CD compatible report
   */
  async generateCIReport(timestamp) {
    const ciReport = {
      testResults: {
        numTotalTestSuites: this.overallMetrics.totalSuites,
        numPassedTestSuites: this.overallMetrics.passedSuites,
        numFailedTestSuites: this.overallMetrics.failedSuites,
        numPendingTestSuites: 0,
        success: this.overallMetrics.failedSuites === 0,
        startTime: this.startTime,
        endTime: this.endTime || Date.now(),
        coverageMap: {},
        testSuiteResults: this.suiteResults.map(suite => ({
          name: suite.name,
          status: suite.status,
          duration: suite.duration,
          assertionResults: suite.testResults || []
        }))
      }
    };
    
    const ciReportPath = path.join(this.options.outputDir, `oauth-ci-report-${timestamp}.json`);
    await fs.writeFile(ciReportPath, JSON.stringify(ciReport, null, 2));
    
    console.log(`🔧 CI/CD report saved: ${ciReportPath}`);
  }

  /**
   * Generate issue summary for quick analysis
   */
  async generateIssueSummary(timestamp) {
    const issueSummary = {
      timestamp: new Date().toISOString(),
      totalIssues: Object.values(this.overallMetrics.issues || {}).reduce((a, b) => a + b, 0),
      issuesByPriority: this.overallMetrics.issues || {},
      criticalIssues: this.criticalIssues,
      recommendations: this.generateRecommendations(),
      nextSteps: this.generateNextSteps()
    };
    
    const summaryPath = path.join(this.options.outputDir, `oauth-issue-summary-${timestamp}.json`);
    await fs.writeFile(summaryPath, JSON.stringify(issueSummary, null, 2));
    
    console.log(`📋 Issue summary saved: ${summaryPath}`);
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Check for critical popup issue
    const popupIssue = this.criticalIssues.find(issue => 
      issue.type === 'oauth-popup-redirect-issue'
    );
    
    if (popupIssue) {
      recommendations.push({
        priority: 'critical',
        title: 'Fix OAuth Popup Redirect Issue',
        description: 'The OAuth popup is loading lucaverse.com instead of closing after authentication',
        action: 'Review OAuth callback HTML and postMessage implementation'
      });
    }

    // Check for session storage issues
    const sessionIssue = this.criticalIssues.find(issue => 
      issue.type === 'session-storage-bug'
    );
    
    if (sessionIssue) {
      recommendations.push({
        priority: 'high',
        title: 'Verify Session Storage Fix',
        description: 'Session key storage/retrieval patterns may still have issues',
        action: 'Ensure state parameter is used consistently for both storage and retrieval'
      });
    }

    // Check for communication issues
    const communicationIssues = this.suiteResults.reduce((count, suite) => 
      count + (suite.issues?.filter(i => i.type === 'communication-issue').length || 0), 0
    );
    
    if (communicationIssues > 0) {
      recommendations.push({
        priority: 'medium',
        title: 'Improve Cross-Origin Communication',
        description: `${communicationIssues} communication issues detected`,
        action: 'Review COOP headers and postMessage implementation'
      });
    }

    return recommendations;
  }

  /**
   * Generate next steps based on results
   */
  generateNextSteps() {
    const nextSteps = [];
    
    if (this.overallMetrics.criticalFailures > 0) {
      nextSteps.push('Address critical test failures before proceeding to production');
    }
    
    if (this.criticalIssues.length > 0) {
      nextSteps.push('Fix critical OAuth popup redirect issue immediately');
    }
    
    if (this.overallMetrics.passedSuites < this.overallMetrics.totalSuites) {
      nextSteps.push('Investigate and fix all failing test suites');
    }
    
    if (this.overallMetrics.issues?.medium > 0) {
      nextSteps.push('Review and address medium priority issues for better reliability');
    }
    
    nextSteps.push('Run tests again after fixes to verify resolution');
    nextSteps.push('Consider adding the fixed tests to CI/CD pipeline');
    
    return nextSteps;
  }

  /**
   * Determine appropriate exit code for CI/CD
   */
  determineExitCode() {
    // Exit code 0 = success, 1 = failure, 2 = warnings
    
    if (this.overallMetrics.criticalFailures > 0) {
      return 1; // Critical failure
    }
    
    if (this.criticalIssues.length > 0) {
      return 1; // Critical issues found
    }
    
    if (this.overallMetrics.failedSuites > 0) {
      return 1; // Test failures
    }
    
    if (this.overallMetrics.issues?.high > 0) {
      return 2; // High priority issues (warnings)
    }
    
    return 0; // Success
  }

  /**
   * Print summary to console
   */
  printSummary() {
    console.log('\n📊 Test Suite Summary:');
    console.log('═'.repeat(50));
    console.log(`Total Test Suites: ${this.overallMetrics.totalSuites}`);
    console.log(`✅ Passed: ${this.overallMetrics.passedSuites}`);
    console.log(`❌ Failed: ${this.overallMetrics.failedSuites}`);
    console.log(`🚨 Critical Issues: ${this.overallMetrics.issues?.critical || 0}`);
    console.log(`⚠️  High Priority Issues: ${this.overallMetrics.issues?.high || 0}`);
    console.log(`ℹ️  Medium Priority Issues: ${this.overallMetrics.issues?.medium || 0}`);
    console.log(`⏱️  Total Duration: ${(this.overallMetrics.totalDuration / 1000).toFixed(2)}s`);
    console.log('═'.repeat(50));
    
    if (this.criticalIssues.length > 0) {
      console.log('\n🚨 Critical Issues Requiring Attention:');
      this.criticalIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.description} (${issue.suite})`);
      });
    }
  }

  /**
   * Generate final comprehensive report
   */
  generateFinalReport() {
    return {
      success: this.overallMetrics.failedSuites === 0 && this.criticalIssues.length === 0,
      summary: this.overallMetrics,
      suiteResults: this.suiteResults,
      criticalIssues: this.criticalIssues,
      recommendations: this.generateRecommendations(),
      nextSteps: this.generateNextSteps(),
      reportPaths: {
        outputDir: this.options.outputDir,
        screenshotDir: this.options.screenshotDir
      }
    };
  }

  // Utility methods

  async ensureDirectories() {
    const dirs = [this.options.outputDir, this.options.screenshotDir];
    
    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    }
  }

  async initializeLogging() {
    // Set up logging configuration
    this.logFile = path.join(this.options.outputDir, `oauth-test-log-${Date.now()}.txt`);
    
    // Redirect console output to log file if in CI mode
    if (this.options.ciMode) {
      const logStream = require('fs').createWriteStream(this.logFile, { flags: 'a' });
      
      const originalLog = console.log;
      console.log = (...args) => {
        originalLog(...args);
        logStream.write(args.join(' ') + '\n');
      };
    }
  }

  async cleanupPreviousRuns() {
    if (this.options.cleanupPrevious) {
      try {
        const files = await fs.readdir(this.options.outputDir);
        for (const file of files) {
          if (file.includes('oauth-') && (file.endsWith('.json') || file.endsWith('.html'))) {
            await fs.unlink(path.join(this.options.outputDir, file));
          }
        }
        console.log('🧹 Cleaned up previous test artifacts');
      } catch (error) {
        console.log('ℹ️  No previous artifacts to clean up');
      }
    }
  }
}

// Export for use in other modules
module.exports = { ComprehensiveOAuthTestSuite };

// Run tests if called directly
if (require.main === module) {
  (async () => {
    const testSuite = new ComprehensiveOAuthTestSuite({
      ciMode: process.argv.includes('--ci'),
      runParallel: process.argv.includes('--parallel'),
      retryFailedTests: !process.argv.includes('--no-retry'),
      generateDashboard: !process.argv.includes('--no-dashboard'),
      cleanupPrevious: process.argv.includes('--cleanup')
    });
    
    try {
      await testSuite.initialize();
      const results = await testSuite.runAllTests();
      
      if (results.success) {
        console.log('\n🎉 All OAuth tests passed successfully!');
      } else {
        console.log('\n💥 Some OAuth tests failed or have critical issues');
      }
      
    } catch (error) {
      console.error('\n💥 Test suite execution failed:', error.message);
      process.exit(1);
    }
  })();
}