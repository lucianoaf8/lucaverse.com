const path = require('path');

module.exports = {
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
      presets: [
        ['@babel/preset-env', {
          targets: { node: 'current' },
          modules: 'commonjs'
        }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }],
    '^.+\\.(ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', {
          targets: { node: 'current' },
          modules: 'commonjs'
        }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ],
      plugins: ['@babel/plugin-syntax-typescript']
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  globals: {
    __DEV__: true
  },
  roots: [
    __dirname,
    path.join(__dirname, '..', 'src')
  ],
  collectCoverageFrom: [
    path.join(__dirname, '..', 'src', '**', '*.{js,jsx}').replace(/\\/g, '/'),
    '!' + path.join(__dirname, '..', 'src', 'main.jsx').replace(/\\/g, '/'),
    '!' + path.join(__dirname, '..', 'src', '**', '*.test.{js,jsx}').replace(/\\/g, '/'),
    '!' + path.join(__dirname, '..', 'src', '**', '__tests__', '**').replace(/\\/g, '/'),
    '!' + path.join(__dirname, '..', 'src', '**', '*.stories.{js,jsx}').replace(/\\/g, '/')
  ],
  coverageProvider: 'babel',
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
    __dirname.replace(/\\/g, '/') + '/unit/**/*.test.{js,jsx}',
    __dirname.replace(/\\/g, '/') + '/integration/**/*.test.{js,jsx}',
    __dirname.replace(/\\/g, '/') + '/security/**/*.test.{js,jsx}'
  ],
  coveragePathIgnorePatterns: [
    'node_modules'
  ]
};