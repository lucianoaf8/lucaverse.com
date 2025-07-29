import React, { Suspense, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n'; // Import your i18n configuration

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