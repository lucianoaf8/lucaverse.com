import React from 'react';
import TronGridAICircuitBackground from './TronGrid.tsx';

export default function Background() {
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
      <TronGridAICircuitBackground />
    </div>
  );
}