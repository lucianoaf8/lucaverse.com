require('@testing-library/jest-dom');
const { configure } = require('@testing-library/react');
const { toHaveNoViolations } = require('jest-axe');

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
});

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

// Mock CSS Modules
jest.mock('*.module.css', () => ({}));

// Mock particles.js
jest.mock('particles.js', () => ({
  particlesJS: jest.fn(),
}));

// Mock environment variables
process.env.NODE_ENV = 'test';

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