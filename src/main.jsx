import React, { Suspense, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n'; // Import your i18n configuration
import { initializeSecurityHeaders } from './utils/securityHeaders.js';
import { validateEnvironmentConfig } from './utils/environmentConfig.js';
import { monitorUrlChanges } from './utils/urlCleaner.js';
import { validateProductionEnvironment, enforceProductionSecurity } from './utils/productionValidator.js';
import { initializeSRI } from './utils/sri.js';
import { initializeCSPReporting } from './utils/cspReporting.js';
import './utils/securityMonitoring.js'; // Auto-initializes security monitoring

const Root = () => {
  useEffect(() => {
    document.body.style.backgroundColor = '#040810';
    document.body.style.color = '#fff';
    
    // Validate production environment (LUCI-MED-002)
    if (import.meta.env.PROD) {
      validateProductionEnvironment();
      enforceProductionSecurity();
    }
    
    // Clean sensitive URL parameters (LUCI-HIGH-002)
    monitorUrlChanges();
    
    // Validate environment configuration
    validateEnvironmentConfig();
    
    // Initialize security headers monitoring
    initializeSecurityHeaders();
    
    // Initialize SRI monitoring (LUCI-LOW-001)
    initializeSRI();
    
    // Initialize CSP violation reporting (LUCI-LOW-002)
    initializeCSPReporting();
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