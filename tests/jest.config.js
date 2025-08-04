const path = require('path');

module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [path.join(__dirname, 'setup', 'jest.setup.js')],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': require.resolve('identity-obj-proxy'),
    '\\.(png|jpg|jpeg|gif|svg)$': require.resolve('identity-obj-proxy'),
    '^@/(.*)$': path.join(__dirname, '..', 'src', '$1'),
    '^../../src/(.*)$': path.join(__dirname, '..', 'src', '$1'),
    '^../../../src/(.*)$': path.join(__dirname, '..', 'src', '$1')
  },
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { 
          targets: { node: 'current' },
          modules: 'commonjs'
        }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  globals: {
    __DEV__: true
  },
  collectCoverageFrom: [
    path.join(__dirname, '..', 'src', '**', '*.{js,jsx}'),
    '!' + path.join(__dirname, '..', 'src', 'main.jsx'),
    '!' + path.join(__dirname, '..', 'src', '**', '*.test.{js,jsx}'),
    '!' + path.join(__dirname, '..', 'src', '**', '__tests__', '**'),
    '!' + path.join(__dirname, '..', 'src', '**', '*.stories.{js,jsx}')
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
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  testMatch: [
    path.join(__dirname, 'unit', '**', '*.test.{js,jsx}'),
    path.join(__dirname, 'integration', '**', '*.test.{js,jsx}'),
    path.join(__dirname, 'security', '**', '*.test.{js,jsx}')
  ],
  coveragePathIgnorePatterns: [
    'node_modules',
    'tests/'
  ]
};