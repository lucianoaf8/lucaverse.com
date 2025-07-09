Implementation Plan

### Step 1: Create the Circuit Scrollbar Component

Create `src/components/CircuitScrollbar/CircuitScrollbar.jsx`:

```jsx
import React, { useEffect, useRef } from 'react';
import styles from './CircuitScrollbar.module.css';

const CircuitScrollbar = () => {
  const canvasRef = useRef(null);
  const renderRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    renderRef.current = setupCircuitCanvas(canvas);
  
    const updateAnimation = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
    
      if (renderRef.current) {
        requestAnimationFrame(() => renderRef.current(scrollPercent));
      }
    };

    const throttledUpdate = throttle(updateAnimation, 16); // ~60fps
    window.addEventListener('scroll', throttledUpdate, { passive: true });
    setTimeout(updateAnimation, 50);

    return () => {
      window.removeEventListener('scroll', throttledUpdate);
    };
  }, []);

  return (
    <div className={styles.circuitScrollbar}>
      <canvas ref={canvasRef} className={styles.circuitCanvas} />
    </div>
  );
};

// Throttle function for performance
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

// Circuit canvas setup function (exact implementation from docs)
function setupCircuitCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  let nodes = [];
  let photons = [];
  let time = 0;

  class Node {
    constructor(x, y, id) {
      this.x = x;
      this.y = y;
      this.id = id;
      this.connections = [];
      this.active = false;
    }
    connectTo(node) {
      this.connections.push(node);
    }
  }

  class Photon {
    constructor(startNode, path, scrollPercent) {
      this.path = path;
      this.currentIndex = 0;
      this.progress = 0;
      this.active = false;
    }
  
    update(scrollPercent) {
      const pathLength = this.path.length;
      const targetProgress = scrollPercent * (pathLength - 1);
    
      this.currentIndex = Math.floor(targetProgress);
      this.progress = targetProgress - this.currentIndex;
      this.active = scrollPercent > 0 && this.currentIndex < pathLength;
    
      if (this.currentIndex >= pathLength - 1) {
        this.currentIndex = pathLength - 1;
        this.progress = 0;
      }
    }
  
    draw(ctx) {
      if (!this.active) return;
    
      const current = this.path[this.currentIndex];
      let x = current.x;
      let y = current.y;
    
      if (this.currentIndex < this.path.length - 1) {
        const next = this.path[this.currentIndex + 1];
        if (next) {
          x = current.x + (next.x - current.x) * this.progress;
          y = current.y + (next.y - current.y) * this.progress;
        }
      }
    
      // Photon glow
      for (let glow = 3; glow >= 0; glow--) {
        ctx.beginPath();
        ctx.arc(x, y, 2 + glow * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 204, ${0.8 - glow * 0.15})`;
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 8 + glow * 4;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    
      // Core photon
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  
    nodes = [];
    photons = [];
  
    const nodeCount = 20;
    const spacing = (rect.height - 40) / (nodeCount - 1);
  
    for (let i = 0; i < nodeCount; i++) {
      const x = rect.width / 2;
      const y = 20 + i * spacing;
      nodes.push(new Node(x, y, i));
    }
  
    for (let i = 0; i < nodeCount - 1; i++) {
      nodes[i].connectTo(nodes[i + 1]);
    }
  
    const mainPath = nodes.slice(0, nodeCount);
    photons.push(new Photon(nodes[0], mainPath, 0));
  }

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resize, 100);
  });
  resize();

  return function render(scrollPercent) {
    const { width, height } = canvas.getBoundingClientRect();
    if (width === 0 || height === 0) return;
  
    time += 0.016;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    let photonY = 0;
    if (photons.length > 0) {
      const photon = photons[0];
      photon.update(scrollPercent);
    
      if (photon.active) {
        const current = photon.path[photon.currentIndex];
        if (current) {
          if (photon.currentIndex < photon.path.length - 1) {
            const next = photon.path[photon.currentIndex + 1];
            if (next) {
              photonY = current.y + (next.y - current.y) * photon.progress;
            } else {
              photonY = current.y;
            }
          } else {
            photonY = current.y;
          }
        }
      }
    }
  
    nodes.forEach(node => {
      node.active = node.y <= photonY + 5;
    });
  
    // Draw connections
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
    ctx.shadowBlur = 2;
  
    nodes.forEach(node => {
      if (node.active) {
        node.connections.forEach(conn => {
          if (conn.active) {
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(conn.x, conn.y);
            ctx.stroke();
          }
        });
      }
    });
    ctx.shadowBlur = 0;
  
    // Draw nodes
    nodes.forEach(node => {
      if (node.active) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 170, 255, 0.9)';
        ctx.shadowColor = '#00aaff';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
  
    // Draw photon
    photons.forEach(photon => {
      photon.draw(ctx);
    });
  };
}

export default CircuitScrollbar;
```

### Step 2: Create CSS Module

Create `src/components/CircuitScrollbar/CircuitScrollbar.module.css`:

```css
.circuitScrollbar {
  position: fixed;
  top: 0;
  right: 0;
  width: 35px;
  height: 100vh;
  background: var(--dark-bg);
  z-index: 1001; /* Above header z-index: 100 */
  pointer-events: none;
}

.circuitCanvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .circuitScrollbar {
    width: 25px;
  }
}

@media (max-width: 576px) {
  .circuitScrollbar {
    display: none; /* Hide on very small screens */
  }
}
```

### Step 3: Update Global Styles

**Modify `src/index.css`** - Replace the existing scrollbar section with:

```css
/* Circuit Scrollbar Integration - Hide default scrollbar */
::-webkit-scrollbar {
  display: none;
}

html, body {
  font-family: 'Outfit', sans-serif;
  background-color: var(--dark-bg);
  color: var(--text-primary);
  line-height: 1.6;
  overflow-x: hidden;
  font-size: 16px;
  position: relative;
  -ms-overflow-style: none;
  scrollbar-width: none;
  padding-right: 35px; /* Space for circuit scrollbar */
}

/* Responsive padding adjustments */
@media (max-width: 768px) {
  html, body {
    padding-right: 25px;
  }
}

@media (max-width: 576px) {
  html, body {
    padding-right: 0; /* Remove padding when scrollbar is hidden */
  }
}
```

### Step 4: Update App Component

**Modify `src/App.jsx`** to include the CircuitScrollbar:

```jsx
import React, { useEffect } from 'react';
import Header from './components/Header/Header';
import Background from './components/Background/Background.jsx';
import Hero from './components/Hero/Hero';
import About from './components/About/About';
import Projects from './components/Projects/Projects';
import CustomGPTs from './components/CustomGPTs/CustomGPTs';
import Blog from './components/Blog/Blog';
import Contact from './components/Contact/Contact';
import Footer from './components/Footer/Footer';
import CircuitScrollbar from './components/CircuitScrollbar/CircuitScrollbar'; // Add this import

function App() {
  useEffect(() => {
    console.log('App component mounted');
    setTimeout(() => {
      console.log('Checking for background elements after delay:');
      console.log('Background base element:', document.querySelector('[data-testid="background-base"]'));
      console.log('Grid lines element:', document.querySelector('[data-testid="grid-lines"]'));
      console.log('Glow orb elements:', document.querySelectorAll('[data-testid^="glow-orb"]').length);
    }, 1000);
  }, []);

  return (
    <>
      <Background />
      <CircuitScrollbar /> {/* Add this component */}
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
```

### Step 5: Adjust Container Responsive Styles

**Update responsive containers** in affected components to account for scrollbar space. Add to components that might feel cramped:

 **Example for `src/components/Header/Header.module.css`** :

```css
.headerInner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  margin-right: 10px; /* Add breathing room from scrollbar */
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .headerInner {
    margin-right: 5px;
  }
}

@media (max-width: 576px) {
  .headerInner {
    margin-right: 0;
  }
}
```

### Step 6: Performance Optimization

**Add to `src/components/CircuitScrollbar/CircuitScrollbar.jsx`** (optional enhancement):

```jsx
// Add this hook for performance monitoring
useEffect(() => {
  let frameCount = 0;
  let lastTime = performance.now();
  
  const checkPerformance = () => {
    frameCount++;
    const currentTime = performance.now();
  
    if (currentTime - lastTime >= 1000) {
      const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
      if (fps < 30) {
        console.warn('Circuit scrollbar performance warning: FPS below 30');
      }
      frameCount = 0;
      lastTime = currentTime;
    }
  
    requestAnimationFrame(checkPerformance);
  };
  
  if (process.env.NODE_ENV === 'development') {
    checkPerformance();
  }
}, []);
```

## Implementation Checklist

* [ ] Create `CircuitScrollbar` component and CSS module
* [ ] Update `src/index.css` to hide default scrollbar and add padding
* [ ] Import and add `CircuitScrollbar` to `App.jsx`
* [ ] Test scrolling behavior and photon animation
* [ ] Verify responsive behavior on mobile devices
* [ ] Check z-index conflicts with header and modals
* [ ] Test performance on lower-end devices
* [ ] Verify no content overlap with the scrollbar area

## Expected Results

* Custom animated circuit scrollbar replaces default browser scrollbar
* Photons flow upward as user scrolls down the page
* Circuit nodes activate progressively based on scroll position
* Fully responsive with appropriate hiding on small screens
* Matches your existing neon cyan theme perfectly
* Zero disruption to existing functionality

The implementation leverages your existing CSS variable system and component architecture, ensuring seamless integration with the Lucaverse design language.
