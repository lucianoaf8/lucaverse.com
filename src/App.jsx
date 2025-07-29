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

function App() {
  const [currentView, setCurrentView] = useState('home');

  useEffect(() => {
    console.log('App component mounted');
    // Add event to check if background elements are in the DOM
    setTimeout(() => {
      console.log('Checking for background elements after delay:');
      console.log('Background base element:', document.querySelector('[data-testid="background-base"]'));
      console.log('Grid lines element:', document.querySelector('[data-testid="grid-lines"]'));
      console.log('Glow orb elements:', document.querySelectorAll('[data-testid^="glow-orb"]').length);
    }, 1000);

    // Simple hash-based routing
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      if (hash === 'login') {
        setCurrentView('login');
      } else {
        setCurrentView('home');
      }
    };

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    // Check initial hash
    handleHashChange();

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  if (currentView === 'login') {
    return <LucaverseLogin />;
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