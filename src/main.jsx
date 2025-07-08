import React, { Suspense, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n'; // Import your i18n configuration

// Add a simple debug utility to check DOM styles after render
const Root = () => {
  useEffect(() => {
    console.log('Root component mounted');
    document.body.style.backgroundColor = '#040810';
    document.body.style.color = '#fff';
    
    setTimeout(() => {
      console.log('DOM after initial render:');
      console.log('Body background color:', document.body.style.backgroundColor);
      console.log('HTML background elements:', document.querySelectorAll('#background-wrapper').length);
    }, 500);
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