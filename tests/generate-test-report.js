#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPORT_DIR = path.join(__dirname, 'reports');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const REPORT_FILE = path.join(REPORT_DIR, `test-report-${TIMESTAMP}.md`);

// Ensure reports directory exists
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

// Test execution results
const results = {
  unit: { passed: 0, failed: 0, skipped: 0, errors: [] },
  integration: { passed: 0, failed: 0, skipped: 0, errors: [] },
  e2e: { passed: 0, failed: 0, skipped: 0, errors: [] },
  security: { passed: 0, failed: 0, skipped: 0, errors: [] },
  coverage: { statements: 0, branches: 0, functions: 0, lines: 0 }
};

// Execute tests and capture results
function runTests(type, command) {
  console.log(`\n🧪 Running ${type} tests...`);
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: __dirname
    });
    
    // Parse Jest output
    const lines = output.split('\n');
    lines.forEach(line => {
      if (line.includes('PASS')) results[type].passed++;
      if (line.includes('FAIL')) results[type].failed++;
      if (line.includes('SKIP')) results[type].skipped++;
      if (line.includes('●')) results[type].errors.push(line);
    });
    
    return output;
  } catch (error) {
    results[type].failed++;
    results[type].errors.push(error.message);
    return error.stdout || error.message;
  }
}

// Generate markdown report
function generateReport(outputs) {
  const totalTests = Object.values(results).reduce((acc, curr) => {
    if (typeof curr === 'object' && 'passed' in curr) {
      return acc + curr.passed + curr.failed + curr.skipped;
    }
    return acc;
  }, 0);

  const totalPassed = Object.values(results).reduce((acc, curr) => {
    if (typeof curr === 'object' && 'passed' in curr) {
      return acc + curr.passed;
    }
    return acc;
  }, 0);

  const totalFailed = Object.values(results).reduce((acc, curr) => {
    if (typeof curr === 'object' && 'failed' in curr) {
      return acc + curr.failed;
    }
    return acc;
  }, 0);

  const report = `# Lucaverse.com Test Report

**Generated:** ${new Date().toLocaleString()}  
**Environment:** ${process.env.NODE_ENV || 'test'}  
**Node Version:** ${process.version}

---

## 📊 Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| **Total Tests** | ${totalTests} | ${totalTests > 0 ? '✅' : '❌'} |
| **Passed** | ${totalPassed} | ${totalPassed > 0 ? '✅' : '⚠️'} |
| **Failed** | ${totalFailed} | ${totalFailed === 0 ? '✅' : '❌'} |
| **Coverage** | ${results.coverage.statements}% | ${results.coverage.statements >= 80 ? '✅' : '⚠️'} |

---

## 🧪 Test Results by Category

### Unit Tests
- **Passed:** ${results.unit.passed} ✅
- **Failed:** ${results.unit.failed} ${results.unit.failed > 0 ? '❌' : ''}
- **Skipped:** ${results.unit.skipped}
${results.unit.errors.length > 0 ? '\n**Errors:**\n' + results.unit.errors.map(e => `- ${e}`).join('\n') : ''}

### Integration Tests
- **Passed:** ${results.integration.passed} ✅
- **Failed:** ${results.integration.failed} ${results.integration.failed > 0 ? '❌' : ''}
- **Skipped:** ${results.integration.skipped}
${results.integration.errors.length > 0 ? '\n**Errors:**\n' + results.integration.errors.map(e => `- ${e}`).join('\n') : ''}

### End-to-End Tests
- **Passed:** ${results.e2e.passed} ✅
- **Failed:** ${results.e2e.failed} ${results.e2e.failed > 0 ? '❌' : ''}
- **Skipped:** ${results.e2e.skipped}
${results.e2e.errors.length > 0 ? '\n**Errors:**\n' + results.e2e.errors.map(e => `- ${e}`).join('\n') : ''}

### Security Tests
- **Passed:** ${results.security.passed} ✅
- **Failed:** ${results.security.failed} ${results.security.failed > 0 ? '❌' : ''}
- **Skipped:** ${results.security.skipped}
${results.security.errors.length > 0 ? '\n**Errors:**\n' + results.security.errors.map(e => `- ${e}`).join('\n') : ''}

---

## 📈 Code Coverage

| Type | Coverage | Target | Status |
|------|----------|--------|--------|
| **Statements** | ${results.coverage.statements}% | 80% | ${results.coverage.statements >= 80 ? '✅' : '❌'} |
| **Branches** | ${results.coverage.branches}% | 80% | ${results.coverage.branches >= 80 ? '✅' : '❌'} |
| **Functions** | ${results.coverage.functions}% | 80% | ${results.coverage.functions >= 80 ? '✅' : '❌'} |
| **Lines** | ${results.coverage.lines}% | 80% | ${results.coverage.lines >= 80 ? '✅' : '❌'} |

---

## 🔍 Detailed Test Output

### Unit Test Output
\`\`\`
${outputs.unit || 'No unit test output captured'}
\`\`\`

### Integration Test Output
\`\`\`
${outputs.integration || 'No integration test output captured'}
\`\`\`

### E2E Test Output
\`\`\`
${outputs.e2e || 'No E2E test output captured'}
\`\`\`

### Security Test Output
\`\`\`
${outputs.security || 'No security test output captured'}
\`\`\`

---

## 🎯 Recommendations

${totalFailed > 0 ? `### ❌ Failed Tests Require Attention
- Review and fix the ${totalFailed} failing tests
- Check error logs for specific failure reasons
- Ensure all dependencies are properly mocked

` : ''}
${results.coverage.statements < 80 ? `### ⚠️ Coverage Below Target
- Current coverage: ${results.coverage.statements}%
- Target coverage: 80%
- Add more tests for uncovered code paths

` : ''}
${totalTests === 0 ? `### ❌ No Tests Executed
- Verify test configuration is correct
- Check that test files are in the correct locations
- Ensure all dependencies are installed

` : ''}
${totalPassed === totalTests && totalTests > 0 ? `### ✅ All Tests Passing!
- Great job! All ${totalTests} tests are passing
- Consider adding more edge case tests
- Keep monitoring coverage metrics

` : ''}

---

## 📋 Next Steps

1. ${totalFailed > 0 ? 'Fix failing tests' : 'Maintain test quality'}
2. ${results.coverage.statements < 90 ? 'Improve code coverage to 90%+' : 'Maintain high coverage'}
3. ${results.e2e.passed < 10 ? 'Add more E2E test scenarios' : 'Keep E2E tests updated'}
4. ${results.security.passed < 5 ? 'Enhance security testing' : 'Regular security audits'}

---

**Report saved to:** \`${REPORT_FILE}\`
`;

  return report;
}

// Main execution
async function main() {
  console.log('🚀 Starting comprehensive test execution...\n');

  const outputs = {};

  // Run unit tests
  outputs.unit = runTests('unit', 'npm run test -- --testPathPattern=unit --json');

  // Run integration tests
  outputs.integration = runTests('integration', 'npm run test -- --testPathPattern=integration --json');

  // Run security tests
  outputs.security = runTests('security', 'npm run test -- --testPathPattern=security --json');

  // Run E2E tests (Playwright)
  console.log('\n🎭 Running E2E tests with Playwright...');
  try {
    outputs.e2e = execSync('npm run test:e2e -- --reporter=list', {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: __dirname
    });
    // Count Playwright results
    const e2eLines = outputs.e2e.split('\n');
    e2eLines.forEach(line => {
      if (line.includes('✓') || line.includes('ok')) results.e2e.passed++;
      if (line.includes('✗') || line.includes('failed')) results.e2e.failed++;
    });
  } catch (error) {
    outputs.e2e = error.stdout || error.message;
    results.e2e.failed++;
  }

  // Run coverage report
  console.log('\n📊 Generating coverage report...');
  try {
    const coverageOutput = execSync('npm run test:coverage -- --json --outputFile=coverage-summary.json', {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: __dirname
    });
    
    // Try to read coverage summary
    const coveragePath = path.join(__dirname, 'coverage-summary.json');
    if (fs.existsSync(coveragePath)) {
      const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      if (coverageData.total) {
        results.coverage = {
          statements: Math.round(coverageData.total.statements.pct || 0),
          branches: Math.round(coverageData.total.branches.pct || 0),
          functions: Math.round(coverageData.total.functions.pct || 0),
          lines: Math.round(coverageData.total.lines.pct || 0)
        };
      }
    }
  } catch (error) {
    console.error('Coverage generation failed:', error.message);
  }

  // Generate and save report
  const report = generateReport(outputs);
  fs.writeFileSync(REPORT_FILE, report);
  
  // Also display in console
  console.log('\n' + report);
  
  // Exit with appropriate code
  const exitCode = results.unit.failed + results.integration.failed + results.e2e.failed + results.security.failed;
  process.exit(exitCode > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests, generateReport };