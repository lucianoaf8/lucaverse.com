import React, { useEffect } from 'react';

export default function Background() {
  useEffect(() => {
    console.log('Background component mounted with animation styles');
    
    // Add animation to glow orbs programmatically
    setTimeout(() => {
      try {
        const orb1 = document.getElementById('glow-orb-1');
        const orb2 = document.getElementById('glow-orb-2');
        const orb3 = document.getElementById('glow-orb-3');
        
        if (orb1 && orb2 && orb3) {
          console.log('Adding animations to orbs');
          
          orb1.style.animation = 'moveGlow1 30s infinite alternate ease-in-out';
          orb2.style.animation = 'moveGlow2 25s infinite alternate-reverse ease-in-out';
          orb3.style.animation = 'moveGlow3 35s infinite alternate ease-in-out';
          orb3.style.animationDelay = '5s';
          
          console.log('Animations added successfully');
        } else {
          console.error('Could not find all orb elements');
        }
      } catch (err) {
        console.error('Error adding animations:', err);
      }
    }, 100);
    
    return () => {
      console.log('Background component unmounted');
    };
  }, []);

  return (
    <div id="background-wrapper" style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100%', 
      zIndex: 0,
      pointerEvents: 'none'
    }}>
      {/* Base background layer */}
      <div 
        id="background-base"
        data-testid="background-base"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: '#040810',
          zIndex: -10
        }} 
      ></div>
      
      {/* Grid lines */}
      <div 
        id="grid-lines"
        data-testid="grid-lines"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `
            linear-gradient(to right, rgba(0, 229, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 229, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
          zIndex: -5
        }} 
      ></div>
      
      {/* Glow orbs */}
      <div
        id="glow-orb-1"
        data-testid="glow-orb-1"
        style={{
          position: 'fixed',
          width: '70vw',
          height: '70vw',
          left: '30%',
          top: '30%',
          borderRadius: '50%',
          background: 'radial-gradient(circle at center, rgba(0, 229, 255, 0.1) 0%, transparent 70%)',
          filter: 'blur(80px)',
          zIndex: -8
        }}
      ></div>
      
      <div
        id="glow-orb-2"
        data-testid="glow-orb-2"
        style={{
          position: 'fixed',
          width: '60vw',
          height: '60vw',
          right: '40%',
          top: '60%',
          borderRadius: '50%',
          background: 'radial-gradient(circle at center, rgba(0, 255, 204, 0.1) 0%, transparent 70%)',
          filter: 'blur(80px)',
          zIndex: -7
        }}
      ></div>
      
      <div
        id="glow-orb-3"
        data-testid="glow-orb-3"
        style={{
          position: 'fixed',
          width: '50vw',
          height: '50vw',
          left: '20%',
          bottom: '20%',
          borderRadius: '50%',
          background: 'radial-gradient(circle at center, rgba(100, 180, 255, 0.1) 0%, transparent 70%)',
          filter: 'blur(80px)',
          zIndex: -6
        }}
      ></div>
    </div>
  );
}