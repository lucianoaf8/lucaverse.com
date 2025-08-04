/**
 * React Testing Helpers
 * Provides utilities for testing React hooks and components
 */

import React from 'react';

// Simple wrapper component for hook testing - properly configured for React 18
export const HookTestWrapper = ({ children }) => {
  return React.createElement(
    'div',
    { 'data-testid': 'hook-wrapper' },
    children
  );
};

// More robust React component wrapper for hook testing
export const ReactHookWrapper = ({ children }) => {
  return React.createElement(
    React.StrictMode,
    null,
    React.createElement(
      'div',
      { 'data-testid': 'react-hook-wrapper' },
      children
    )
  );
};

// Mock AuthContext provider for hook testing
export const MockAuthProvider = ({ children, value = {} }) => {
  const defaultValue = {
    user: null,
    loading: false,
    logout: jest.fn(),
    ...value,
  };
  
  return React.createElement('div', { 'data-testid': 'mock-auth-provider' }, children);
};

// Helper to create render options with wrappers
export const createRenderOptions = (wrapperProps = {}) => ({
  wrapper: ({ children }) => React.createElement(HookTestWrapper, wrapperProps, children),
});

// Alternative render options for more complex testing
export const createStrictRenderOptions = (wrapperProps = {}) => ({
  wrapper: ({ children }) => React.createElement(ReactHookWrapper, wrapperProps, children),
});