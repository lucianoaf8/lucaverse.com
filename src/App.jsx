import React, { useEffect, useState } from 'react';
// Auto-monitoring test - configured 2025-07-31
import Header from './components/Header/Header';
import Background from './components/Background/Background.jsx';
import Hero from './components/Hero/Hero';
import About from './components/About/About';
import Projects from './components/Projects/Projects';
import CustomGPTs from './components/CustomGPTs/CustomGPTs';
import Blog from './components/Blog/Blog';
import Contact from './components/Contact/Contact';
import Footer from './components/Footer/Footer';
import LucaverseLogin from './components/LucaverseLogin/LucaverseLogin';
import Dashboard from './components/Dashboard/Dashboard';
import SessionWarning from './components/SessionWarning/SessionWarning';

function App() {
  const [currentView, setCurrentView] = useState('home');

  useEffect(() => {
    // Check if this is a popup window for OAuth callback
    const isPopupWindow = window.opener && window.opener !== window;
    
    if (isPopupWindow) {
      // This is a popup window - handle OAuth callback
      handlePopupOAuthCallback();
      return; // Don't set up normal routing for popup windows
    }

    // Check for OAuth callback parameters (fallback)
    const urlParams = new URLSearchParams(window.location.search);
    const hasAuthTokens = urlParams.get('token') && urlParams.get('session');
    const hasAuthCode = urlParams.get('code') && urlParams.get('state');

    // Simple hash-based routing with dashboard support
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      const path = window.location.pathname;
      
      // Check for dashboard route or OAuth callback with tokens
      if (path === '/dashboard' || hash === 'dashboard' || hasAuthTokens || hasAuthCode) {
        setCurrentView('dashboard');
      } else if (hash === 'login') {
        setCurrentView('login');
      } else {
        setCurrentView('home');
      }
    };

    // Listen for hash changes and popstate
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    
    // Check initial route
    handleHashChange();

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  // Handle OAuth callback in popup window
  const handlePopupOAuthCallback = () => {
    try {
      console.log('React app loaded in popup window - this should not happen during normal OAuth flow');
      
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      // Combine params from query string and hash
      const params = {};
      for (const [key, value] of urlParams) params[key] = value;
      for (const [key, value] of hashParams) params[key] = value;
      
      // Clear URL immediately for security
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title, '/');
      }
      
      // Check for OAuth error
      if (params.error) {
        console.error('OAuth error in popup:', params.error);
        
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({
            type: 'OAUTH_ERROR',
            error: params.error_description || params.error,
            timestamp: Date.now()
          }, window.location.origin);
        }
        
        setTimeout(() => window.close(), 1000);
        return;
      }
      
      // Check for authorization code (OAuth 2.0 standard)
      if (params.code && params.state) {
        console.log('OAuth success in popup - sending to parent');
        
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({
            type: 'OAUTH_SUCCESS',
            code: params.code,
            state: params.state,
            sessionId: params.session_id || '',
            timestamp: Date.now()
          }, window.location.origin);
        }
        
        setTimeout(() => window.close(), 500);
        return;
      }
      
      // Check for legacy token-based response
      if (params.token && params.session) {
        console.log('OAuth success in popup (legacy) - sending to parent');
        
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({
            type: 'OAUTH_SUCCESS',
            token: params.token,
            sessionId: params.session,
            timestamp: Date.now()
          }, window.location.origin);
        }
        
        setTimeout(() => window.close(), 500);
        return;
      }
      
      // No valid OAuth parameters found but we're in a popup
      // This might be the result of the worker HTML not working properly
      console.log('No OAuth parameters found in popup, attempting to signal success and close');
      
      // Try to signal success anyway since we're in a popup during OAuth flow
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({
          type: 'OAUTH_SUCCESS',
          timestamp: Date.now()
        }, window.location.origin);
      }
      
      setTimeout(() => window.close(), 1000);
      
    } catch (error) {
      console.error('Error handling popup OAuth callback:', error);
      
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({
          type: 'OAUTH_ERROR',
          error: 'Authentication failed: ' + error.message,
          timestamp: Date.now()
        }, window.location.origin);
      }
      
      setTimeout(() => window.close(), 1000);
    }
  };

  if (currentView === 'login') {
    return <LucaverseLogin />;
  }

  if (currentView === 'dashboard') {
    return <Dashboard />;
  }

  return (
    <>
      <Background />
      <div className="app-content">
        <Header />
        <main>
          <Hero />
          <About />
          <Projects />
          <CustomGPTs />
          <Blog />
          <Contact />
        </main>
        <Footer />
      </div>
      <SessionWarning />
    </>
  );
}

export default App;