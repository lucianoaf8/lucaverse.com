// XSS Protection Test Suite
// This file tests that our XSS protections are working correctly

import { sanitizeHtml, sanitizeText, sanitizeTranslationValues } from './sanitize.js';

/**
 * Test XSS protection for i18n translations
 */
export const testXSSProtection = () => {
  console.log('🔐 Testing XSS Protection...');
  
  // Test cases with malicious payloads
  const testCases = [
    {
      name: 'Script injection',
      input: '<script>alert("XSS")</script>Hello',
      expected: 'Hello'
    },
    {
      name: 'IMG onerror attack',
      input: '<img src="x" onerror="alert(\'XSS\')">',
      expected: ''
    },
    {
      name: 'JavaScript URL',
      input: '<a href="javascript:alert(\'XSS\')">Click me</a>',
      expected: 'Click me'
    },
    {
      name: 'Style injection',
      input: '<div style="background:url(javascript:alert(\'XSS\'))">Test</div>',
      expected: '<div>Test</div>'
    },
    {
      name: 'Event handler injection',
      input: '<button onclick="alert(\'XSS\')">Button</button>',
      expected: 'Button'
    },
    {
      name: 'Data attribute injection',
      input: '<div data-foo="&quot; onclick=&quot;alert(\'XSS\')&quot;">Content</div>',
      expected: '<div>Content</div>'
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach(testCase => {
    const result = sanitizeText(testCase.input);
    const success = result === testCase.expected;
    
    console.log(`${success ? '✅' : '❌'} ${testCase.name}: "${result}"`);
    
    if (success) {
      passed++;
    } else {
      failed++;
      console.log(`   Expected: "${testCase.expected}"`);
      console.log(`   Got:      "${result}"`);
    }
  });
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
};

/**
 * Test translation value sanitization
 */
export const testTranslationSanitization = () => {
  console.log('\n🌐 Testing Translation Value Sanitization...');
  
  const testValues = {
    name: '<script>alert("XSS")</script>John',
    year: 2024,
    maliciousHtml: '<img src="x" onerror="alert(\'XSS\')">',
    safeText: 'Hello World',
    boolean: true
  };
  
  const sanitized = sanitizeTranslationValues(testValues);
  
  console.log('Original values:', testValues);
  console.log('Sanitized values:', sanitized);
  
  // Check results
  const tests = [
    { key: 'name', expected: 'John', actual: sanitized.name },
    { key: 'year', expected: 2024, actual: sanitized.year },
    { key: 'maliciousHtml', expected: '', actual: sanitized.maliciousHtml },
    { key: 'safeText', expected: 'Hello World', actual: sanitized.safeText },
    { key: 'boolean', expected: true, actual: sanitized.boolean }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(test => {
    const success = test.actual === test.expected;
    console.log(`${success ? '✅' : '❌'} ${test.key}: ${test.actual}`);
    
    if (success) {
      passed++;
    } else {
      failed++;
      console.log(`   Expected: ${test.expected}`);
    }
  });
  
  console.log(`\n📊 Translation Test Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
};

/**
 * Run all XSS protection tests
 */
export const runAllXSSTests = () => {
  console.log('🚀 Starting XSS Protection Test Suite...\n');
  
  const results1 = testXSSProtection();
  const results2 = testTranslationSanitization();
  
  const totalPassed = results1.passed + results2.passed;
  const totalFailed = results1.failed + results2.failed;
  
  console.log(`\n🎯 Overall Results: ${totalPassed} passed, ${totalFailed} failed`);
  console.log(totalFailed === 0 ? '🔒 XSS Protection: SECURE' : '⚠️  XSS Protection: NEEDS ATTENTION');
  
  return { passed: totalPassed, failed: totalFailed };
};

// Auto-run tests in development
if (process.env.NODE_ENV === 'development') {
  // Uncomment the line below to run tests automatically
  // runAllXSSTests();
}

export default {
  testXSSProtection,
  testTranslationSanitization,
  runAllXSSTests
};