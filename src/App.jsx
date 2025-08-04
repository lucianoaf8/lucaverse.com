import React, { useEffect, useState } from 'react';
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

function App() {
  const [currentView, setCurrentView] = useState('home');

  useEffect(() => {
    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const hasAuthTokens = urlParams.get('token') && urlParams.get('session');

    // Simple hash-based routing with dashboard support
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      const path = window.location.pathname;
      
      // Check for dashboard route or OAuth callback with tokens
      if (path === '/dashboard' || hash === 'dashboard' || hasAuthTokens) {
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

  if (currentView === 'login') {
    return <LucaverseLogin />;
  }

  if (currentView === 'dashboard') {
    return <Dashboard />;
  }

  return (
    <>
      <Background />
      <div style={{ position: 'relative', zIndex: 1 }}>
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
    </>
  );
}

export default App;