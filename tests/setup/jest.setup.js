require('@testing-library/jest-dom');
const { configure } = require('@testing-library/react');
const { toHaveNoViolations } = require('jest-axe');

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
});

// Ensure React is available globally for hook testing
const React = require('react');
const ReactDOM = require('react-dom');
global.React = React;
global.ReactDOM = ReactDOM;

// Enable React 18 concurrent features in tests
const { act } = require('@testing-library/react');
global.act = act;

// Add jest-axe accessibility testing
expect.extend(toHaveNoViolations);

// Mock external dependencies
global.fetch = jest.fn();

// Mock Google Analytics
global.gtag = jest.fn();

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      changeLanguage: jest.fn(),
      language: 'en',
    },
  }),
  Trans: ({ children }) => children,
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
}));

// Mock CSS Modules more comprehensively
jest.mock('*.module.css', () => ({}));

// Specifically mock Dashboard CSS module to avoid import issues
jest.mock('../../src/components/Dashboard/Dashboard.module.css', () => ({
  dashboard: 'dashboard',
  dashboardLoading: 'dashboardLoading',
  loadingContainer: 'loadingContainer',
  spinner: 'spinner',
  dashboardError: 'dashboardError',
  errorContainer: 'errorContainer',
  dashboardHeader: 'dashboardHeader',
  headerContent: 'headerContent',
  userInfo: 'userInfo',
  userAvatar: 'userAvatar',
  defaultAvatar: 'defaultAvatar',
  userDetails: 'userDetails',
  userName: 'userName',
  userEmail: 'userEmail',
  btn: 'btn',
  btnSecondary: 'btnSecondary',
  dashboardContent: 'dashboardContent',
  welcomeSection: 'welcomeSection',
  permissionsInfo: 'permissionsInfo',
  featuresGrid: 'featuresGrid',
  featureCard: 'featureCard',
}), { virtual: true });

// Mock particles.js
jest.mock('particles.js', () => ({
  particlesJS: jest.fn(),
}));

// Mock environment variables
process.env.NODE_ENV = 'test';

// Mock Node.js globals for security tests
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.crypto = {
  getRandomValues: (arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }
};

// Mock Cloudflare Worker globals for integration tests
class MockRequest {
  constructor(url, init = {}) {
    this.url = url;
    this.method = init.method || 'GET';
    this.headers = new Map(Object.entries(init.headers || {}));
    this.body = init.body;
  }
}

class MockResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.headers = new Map(Object.entries(init.headers || {}));
  }
  
  async json() {
    try {
      return JSON.parse(this.body);
    } catch (e) {
      throw new Error('Invalid JSON in response body');
    }
  }
  
  async text() {
    return this.body;
  }
  
  static json(data, init = {}) {
    return new MockResponse(JSON.stringify(data), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) }
    });
  }
  
  static redirect(url, status = 302) {
    return new MockResponse('', { status, headers: { Location: url } });
  }
}

global.Request = MockRequest;
global.Response = MockResponse;

// Setup global test utilities
global.testUtils = {
  mockAuth: {
    user: {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
      permissions: ['user'],
    },
    loading: false,
    logout: jest.fn(),
  },
  mockFormData: {
    valid: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      message: 'This is a test message',
      subject: 'Test Subject',
      csrf_token: 'a'.repeat(64),
      timestamp: Date.now().toString(),
    },
    invalid: {
      name: '<script>alert("xss")</script>',
      email: 'invalid-email',
      message: '',
      subject: '',
    },
  },
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  fetch.mockClear();
});

// Mock IntersectionObserver for components with animations
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

console.log('Jest setup completed successfully ✅');