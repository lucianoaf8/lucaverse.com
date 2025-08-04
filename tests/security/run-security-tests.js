#!/usr/bin/env node

/**
 * Security Testing Suite Runner
 * Executes various security tests and generates comprehensive reports
 */

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

const SECURITY_TESTS = [
  {
    name: 'XSS Prevention Tests',
    command: 'npx',
    args: ['vitest', 'run', 'tests/security/xss-prevention.test.js', '--reporter=json'],
    critical: true,
  },
  {
    name: 'CSRF Protection Tests',
    command: 'node',
    args: ['tests/security/csrf-tests.js'],
    critical: true,
  },
  {
    name: 'Input Validation Tests',
    command: 'node',
    args: ['tests/security/input-validation-tests.js'],
    critical: true,
  },
  {
    name: 'Authentication Security Tests',
    command: 'node',
    args: ['tests/security/auth-security-tests.js'],
    critical: true,
  },
];

class SecurityTestRunner {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  async runTest(test) {
    console.log(`🔒 Running ${test.name}...`);
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      const child = spawn(test.command, test.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        const result = {
          name: test.name,
          passed: code === 0,
          critical: test.critical,
          duration,
          stdout,
          stderr,
          exitCode: code,
        };

        this.results.push(result);
        
        if (result.passed) {
          console.log(`✅ ${test.name} passed (${duration}ms)`);
        } else {
          console.log(`❌ ${test.name} failed (${duration}ms)`);
          if (stderr) {
            console.log(`   Error: ${stderr.substring(0, 200)}...`);
          }
        }
        
        resolve(result);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          name: test.name,
          passed: false,
          critical: test.critical,
          duration: 30000,
          stdout: '',
          stderr: 'Test timed out after 30 seconds',
          exitCode: 124,
        });
      }, 30000);
    });
  }

  async runAllTests() {
    console.log('🚀 Starting Security Test Suite...\n');
    
    for (const test of SECURITY_TESTS) {
      await this.runTest(test);
    }
    
    this.generateReport();
  }

  generateReport() {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    
    const summary = {
      totalTests: this.results.length,
      passed: this.results.filter(r => r.passed).length,
      failed: this.results.filter(r => !r.passed).length,
      criticalFailed: this.results.filter(r => !r.passed && r.critical).length,
      totalDuration,
      timestamp: new Date().toISOString(),
    };

    console.log('\n📊 Security Test Summary:');
    console.log(`   Total Tests: ${summary.totalTests}`);
    console.log(`   Passed: ${summary.passed}`);
    console.log(`   Failed: ${summary.failed}`);
    console.log(`   Critical Failed: ${summary.criticalFailed}`);
    console.log(`   Duration: ${summary.totalDuration}ms`);

    // Generate detailed report
    const report = {
      summary,
      results: this.results,
      recommendations: this.generateRecommendations(),
      securityScore: this.calculateSecurityScore(),
    };

    // Write JSON report
    const jsonReport = JSON.stringify(report, null, 2);
    writeFileSync('tests/security/security-report.json', jsonReport);

    // Write HTML report
    const htmlReport = this.generateHTMLReport(report);
    writeFileSync('tests/security/security-report.html', htmlReport);

    console.log('\n📄 Reports generated:');
    console.log('   - tests/security/security-report.json');
    console.log('   - tests/security/security-report.html');

    // Exit with error code if critical tests failed
    if (summary.criticalFailed > 0) {
      console.log('\n❌ Critical security tests failed!');
      process.exit(1);
    } else if (summary.failed > 0) {
      console.log('\n⚠️  Some security tests failed, but no critical failures.');
      process.exit(0);
    } else {
      console.log('\n✅ All security tests passed!');
      process.exit(0);
    }
  }

  generateRecommendations() {
    const recommendations = [];
    
    this.results.forEach(result => {
      if (!result.passed) {
        switch (result.name) {
          case 'XSS Prevention Tests':
            recommendations.push({
              category: 'XSS Prevention',
              severity: 'HIGH',
              title: 'Implement proper input sanitization',
              description: 'Ensure all user inputs are properly sanitized and encoded before display.',
              action: 'Review HTML encoding functions and validate all dynamic content insertion.',
            });
            break;
          case 'CSRF Protection Tests':
            recommendations.push({
              category: 'CSRF Protection',
              severity: 'HIGH',
              title: 'Strengthen CSRF protection',
              description: 'CSRF protection mechanisms need improvement.',
              action: 'Verify CSRF token generation, validation, and double-submit cookie pattern.',
            });
            break;
          case 'Input Validation Tests':
            recommendations.push({
              category: 'Input Validation',
              severity: 'MEDIUM',
              title: 'Enhance input validation',
              description: 'Input validation rules need to be more restrictive.',
              action: 'Review and strengthen input validation patterns and sanitization.',
            });
            break;
          case 'Authentication Security Tests':
            recommendations.push({
              category: 'Authentication',
              severity: 'HIGH',
              title: 'Improve authentication security',
              description: 'Authentication mechanisms have security weaknesses.',
              action: 'Review session management, token generation, and authentication flow.',
            });
            break;
        }
      }
    });

    return recommendations;
  }

  calculateSecurityScore() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const criticalFailed = this.results.filter(r => !r.passed && r.critical).length;
    
    let score = (passedTests / totalTests) * 100;
    
    // Deduct additional points for critical failures
    score -= criticalFailed * 20;
    
    return Math.max(0, Math.min(100, score));
  }

  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Test Report - Lucaverse.com</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: #0a0a0a;
            color: #ffffff;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 20px;
            background: linear-gradient(135deg, #001a2e, #003366);
            border-radius: 10px;
        }
        .security-score {
            font-size: 48px;
            font-weight: bold;
            color: ${report.securityScore >= 80 ? '#00ff00' : report.securityScore >= 60 ? '#ffaa00' : '#ff0000'};
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .summary-card {
            background: #1a1a1a;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #00ccff;
        }
        .summary-card.failed {
            border-left-color: #ff4444;
        }
        .summary-card.critical {
            border-left-color: #ff0000;
            background: #2a1a1a;
        }
        .test-results {
            margin-bottom: 40px;
        }
        .test-item {
            background: #1a1a1a;
            margin-bottom: 15px;
            border-radius: 8px;
            overflow: hidden;
        }
        .test-header {
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
        }
        .test-header.passed {
            background: #0d2818;
            border-left: 4px solid #00ff00;
        }
        .test-header.failed {
            background: #2a1a1a;
            border-left: 4px solid #ff4444;
        }
        .test-details {
            padding: 0 20px 20px;
            display: none;
            background: #0a0a0a;
        }
        .test-details.show {
            display: block;
        }
        .recommendations {
            background: #1a1a1a;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #ffaa00;
        }
        .recommendation {
            margin-bottom: 15px;
            padding: 15px;
            background: #0a0a0a;
            border-radius: 6px;
        }
        .severity-high { border-left: 4px solid #ff0000; }
        .severity-medium { border-left: 4px solid #ffaa00; }
        .severity-low { border-left: 4px solid #00ff00; }
        .status {
            padding: 4px 12px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 12px;
        }
        .status.passed {
            background: #00ff00;
            color: #000000;
        }
        .status.failed {
            background: #ff4444;
            color: #ffffff;
        }
        pre {
            background: #000;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Security Test Report</h1>
            <p>Lucaverse.com Security Assessment</p>
            <div class="security-score">${report.securityScore.toFixed(1)}%</div>
            <p>Security Score</p>
            <p><small>Generated on ${new Date(report.summary.timestamp).toLocaleString()}</small></p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>Total Tests</h3>
                <div style="font-size: 24px; font-weight: bold;">${report.summary.totalTests}</div>
            </div>
            <div class="summary-card">
                <h3>Passed</h3>
                <div style="font-size: 24px; font-weight: bold; color: #00ff00;">${report.summary.passed}</div>
            </div>
            <div class="summary-card failed">
                <h3>Failed</h3>
                <div style="font-size: 24px; font-weight: bold; color: #ff4444;">${report.summary.failed}</div>
            </div>
            <div class="summary-card critical">
                <h3>Critical Failed</h3>
                <div style="font-size: 24px; font-weight: bold; color: #ff0000;">${report.summary.criticalFailed}</div>
            </div>
        </div>

        <div class="test-results">
            <h2>📋 Test Results</h2>
            ${report.results.map(result => `
                <div class="test-item">
                    <div class="test-header ${result.passed ? 'passed' : 'failed'}" onclick="toggleDetails('test-${report.results.indexOf(result)}')">
                        <div>
                            <strong>${result.name}</strong>
                            ${result.critical ? '<span style="color: #ff4444; margin-left: 10px;">[CRITICAL]</span>' : ''}
                        </div>
                        <div>
                            <span class="status ${result.passed ? 'passed' : 'failed'}">${result.passed ? 'PASSED' : 'FAILED'}</span>
                            <span style="margin-left: 10px; color: #888;">${result.duration}ms</span>
                        </div>
                    </div>
                    <div id="test-${report.results.indexOf(result)}" class="test-details">
                        ${result.stdout ? `<h4>Output:</h4><pre>${result.stdout.substring(0, 1000)}${result.stdout.length > 1000 ? '...' : ''}</pre>` : ''}
                        ${result.stderr ? `<h4>Errors:</h4><pre style="color: #ff4444;">${result.stderr.substring(0, 1000)}${result.stderr.length > 1000 ? '...' : ''}</pre>` : ''}
                        <p><strong>Exit Code:</strong> ${result.exitCode}</p>
                    </div>
                </div>
            `).join('')}
        </div>

        ${report.recommendations.length > 0 ? `
        <div class="recommendations">
            <h2>⚠️  Security Recommendations</h2>
            ${report.recommendations.map(rec => `
                <div class="recommendation severity-${rec.severity.toLowerCase()}">
                    <h4>${rec.title} <span style="background: ${rec.severity === 'HIGH' ? '#ff0000' : rec.severity === 'MEDIUM' ? '#ffaa00' : '#00ff00'}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">${rec.severity}</span></h4>
                    <p><strong>Category:</strong> ${rec.category}</p>
                    <p><strong>Description:</strong> ${rec.description}</p>
                    <p><strong>Action:</strong> ${rec.action}</p>
                </div>
            `).join('')}
        </div>
        ` : '<div class="recommendations"><h2>✅ No Security Issues Found</h2><p>All security tests passed successfully!</p></div>'}
    </div>

    <script>
        function toggleDetails(id) {
            const element = document.getElementById(id);
            element.classList.toggle('show');
        }
    </script>
</body>
</html>
    `;
  }
}

// Run the security tests
const runner = new SecurityTestRunner();
runner.runAllTests().catch(console.error);