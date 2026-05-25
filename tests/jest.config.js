const path = require('path');

// Path to the import.meta.env shim plugin for Babel.
// Required for src/config/api.js and src/utils/logger.js which use import.meta.env.
const importMetaShimPlugin = path.join(__dirname, 'setup', 'babel-plugin-import-meta-shim.js');

module.exports = {
  rootDir: path.join(__dirname, '..'),
  testEnvironment: 'jsdom',
  setupFiles: [path.join(__dirname, 'setup', 'save-web-apis.js')],
  setupFilesAfterEnv: [path.join(__dirname, 'setup', 'jest.setup.js')],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': require.resolve('identity-obj-proxy'),
    '\\.(png|jpg|jpeg|gif|svg)$': require.resolve('identity-obj-proxy'),
    // Pin React packages to the tests' node_modules to prevent duplicate React instances
    '^react$': path.join(__dirname, 'node_modules', 'react'),
    '^react-dom$': path.join(__dirname, 'node_modules', 'react-dom'),
    '^react-dom/client$': path.join(__dirname, 'node_modules', 'react-dom', 'client'),
    '^@/(.*)$': path.join(__dirname, '..', 'src', '$1'),
    '^../../src/(.*)$': path.join(__dirname, '..', 'src', '$1'),
    '^../../../src/(.*)$': path.join(__dirname, '..', 'src', '$1')
  },
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', {
      babelrc: false,
      configFile: false,
      presets: [
        ['@babel/preset-env', {
          targets: { node: 'current' },
          modules: 'commonjs'
        }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ],
      plugins: ['babel-plugin-istanbul', importMetaShimPlugin]
    }],
    '^.+\\.(ts|tsx)$': ['babel-jest', {
      babelrc: false,
      configFile: false,
      presets: [
        ['@babel/preset-env', {
          targets: { node: 'current' },
          modules: 'commonjs'
        }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ],
      plugins: ['@babel/plugin-syntax-typescript', 'babel-plugin-istanbul']
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  globals: {
    __DEV__: true
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/**/*.test.{js,jsx}',
    '!src/**/__tests__/**',
    '!src/**/*.stories.{js,jsx}'
  ],
  coverageProvider: 'v8',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  coverageDirectory: path.join(__dirname, 'coverage'),
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  testMatch: [
    __dirname.replace(/\\/g, '/') + '/unit/**/*.test.{js,jsx}',
    __dirname.replace(/\\/g, '/') + '/integration/**/*.test.{js,jsx}',
    __dirname.replace(/\\/g, '/') + '/security/**/*.test.{js,jsx}'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/lucaverse-auth/',
    '/summer-heart-worker/',
    '/.claude/'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/dist/'
  ]
};