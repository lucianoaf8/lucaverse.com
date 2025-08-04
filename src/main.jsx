import React, { Suspense, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n'; // Import your i18n configuration

// Suppress React DevTools download prompt in development
if (import.meta.env.DEV) {
  // Check if React DevTools is already installed
  if (typeof window !== 'undefined' && !window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    // Suppress the console message by providing a minimal hook
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      isDisabled: false,
      supportsFiber: true,
      inject: () => {},
      onCommitFiberRoot: () => {},
      onCommitFiberUnmount: () => {},
    };
  }
}

const Root = () => {
  useEffect(() => {
    document.body.style.backgroundColor = '#040810';
    document.body.style.color = '#fff';
  }, []);
  
  return (
    <React.StrictMode>
      <Suspense fallback={<div>Loading...</div>}>
        <App />
      </Suspense>
    </React.StrictMode>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);