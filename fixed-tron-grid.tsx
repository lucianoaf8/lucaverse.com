import React, { useEffect, useRef } from 'react';

// Canvas helper for resize-safe animations
const CanvasWrapper = ({ draw }) => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(rect.width, 1);
      canvas.height = Math.max(rect.height, 1);
    };
    
    const startAnimation = () => {
      if (canvas.width > 0 && canvas.height > 0) {
        animRef.current = draw(ctx, canvas);
      }
    };

    // Initial setup with delay to ensure proper sizing
    setTimeout(() => {
      resize();
      startAnimation();
    }, 100);
    
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      if (animRef.current && typeof animRef.current.cancel === 'function') {
        animRef.current.cancel();
      }
    };
  }, [draw]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
};

// Tron Grid with AI Circuit Lights
const SubtleTronGrid = () => (
  <CanvasWrapper
    draw={(ctx, canvas) => {
      const gridSize = 40;
      const lightCycles = [];
      const explosions = [];
      
      // Helper function to snap to grid
      const snapToGrid = (value) => Math.round(value / gridSize) * gridSize;
      
      // Helper function to get random grid position
      const getRandomGridPos = () => ({
        x: Math.floor(Math.random() * Math.floor(canvas.width / gridSize)) * gridSize,
        y: Math.floor(Math.random() * Math.floor(canvas.height / gridSize)) * gridSize
      });
      
      // Helper function to get valid directions (no reversing, stay in bounds)
      const getValidDirections = (currentDirection, currentX, currentY) => {
        const directions = [
          { dx: gridSize, dy: 0 },    // 0: right
          { dx: 0, dy: gridSize },    // 1: down
          { dx: -gridSize, dy: 0 },   // 2: left
          { dx: 0, dy: -gridSize }    // 3: up
        ];
        
        // Calculate reverse direction (opposite) - circuit lights can't reverse
        const reverseDirection = (currentDirection + 2) % 4;
        
        // Get all directions except reverse (forward, left, right only)
        const allowedDirections = [0, 1, 2, 3].filter(dir => dir !== reverseDirection);
        
        // Filter to only include directions that stay in bounds
        const validDirections = allowedDirections.filter(dir => {
          const nextX = currentX + directions[dir].dx;
          const nextY = currentY + directions[dir].dy;
          return nextX >= 0 && nextX < canvas.width && nextY >= 0 && nextY < canvas.height;
        });
        
        // If no valid directions (corner trap), allow any direction that stays in bounds
        if (validDirections.length === 0) {
          return [0, 1, 2, 3].filter(dir => {
            const nextX = currentX + directions[dir].dx;
            const nextY = currentY + directions[dir].dy;
            return nextX >= 0 && nextX < canvas.width && nextY >= 0 && nextY < canvas.height;
          });
        }
        
        return validDirections;
      };
      
      // Initialize 6 AI circuit lights on grid intersections (3 cyan, 3 orange)
      for (let i = 0; i < 6; i++) {
        const pos = getRandomGridPos();
        const direction = Math.floor(Math.random() * 4);
        const directions = [
          { dx: gridSize, dy: 0 },    // right
          { dx: 0, dy: gridSize },    // down
          { dx: -gridSize, dy: 0 },   // left
          { dx: 0, dy: -gridSize }    // up
        ];
        const dir = directions[direction];
        
        lightCycles.push({
          startX: pos.x,
          startY: pos.y,
          endX: pos.x + dir.dx,
          endY: pos.y + dir.dy,
          direction: direction,
          animationTime: 0,
          moveDuration: 400, // milliseconds to cross one grid cell
          speed: 1.5,
          color: i < 3 ? 'cyan' : 'orange', // First 3 are cyan, last 3 are orange
          trail: [],
          nextTurn: Math.random() * 5 + 3,
          collisionCooldown: 0,
          x: pos.x,
          y: pos.y
        });
      }

      // Linear interpolation function
      const lerp = (start, end, progress) => start + (end - start) * progress;

      let lastTime = 0;

      const loop = (currentTime) => {
        // Calculate delta time
        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;
        
        // Dark background with subtle fade
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw very subtle grid lines
        ctx.strokeStyle = 'rgba(0, 120, 180, 0.08)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        
        // Vertical lines
        for (let x = 0; x <= canvas.width; x += gridSize) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
        }
        
        // Horizontal lines
        for (let y = 0; y <= canvas.height; y += gridSize) {
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
        
        // Subtle pulsing grid intersections
        const pulseIntensity = (Math.sin(currentTime * 0.001) + 1) / 2;
        ctx.fillStyle = `rgba(0, 180, 255, ${0.05 + pulseIntensity * 0.1})`;
        for (let x = 0; x <= canvas.width; x += gridSize) {
          for (let y = 0; y <= canvas.height; y += gridSize) {
            if (Math.random() > 0.96) {
              ctx.beginPath();
              ctx.arc(x, y, 1 + pulseIntensity, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        
        // Update AI circuit lights
        lightCycles.forEach(cycle => {
          // Update animation time
          cycle.animationTime += deltaTime;
          const progress = Math.min(cycle.animationTime / cycle.moveDuration, 1.0);
          
          // Decrease collision cooldown
          if (cycle.collisionCooldown > 0) {
            cycle.collisionCooldown -= deltaTime;
          }
          
          // Calculate current visual position using linear interpolation
          const visualX = lerp(cycle.startX, cycle.endX, progress);
          const visualY = lerp(cycle.startY, cycle.endY, progress);
          
          // Store current position
          cycle.x = visualX;
          cycle.y = visualY;
          
          // Update trail with smooth position every frame
          cycle.trail.push({ x: visualX, y: visualY });
          if (cycle.trail.length > 45) cycle.trail.shift();
          
          // Check if animation is complete
          if (progress >= 1.0) {
            // Snap to exact end position
            cycle.startX = cycle.endX;
            cycle.startY = cycle.endY;
            cycle.animationTime = 0;
            
            // Calculate next destination
            const directions = [
              { dx: gridSize, dy: 0 },    // right
              { dx: 0, dy: gridSize },    // down
              { dx: -gridSize, dy: 0 },   // left
              { dx: 0, dy: -gridSize }    // up
            ];
            
            // Check if we need to change direction (bounds or random)
            const currentDir = directions[cycle.direction];
            const nextX = cycle.startX + currentDir.dx;
            const nextY = cycle.startY + currentDir.dy;
            
            if (nextX < 0 || nextX >= canvas.width || nextY < 0 || nextY >= canvas.height) {
              // Change direction due to bounds - use valid directions only
              const validDirections = getValidDirections(cycle.direction, cycle.startX, cycle.startY);
              if (validDirections.length > 0) {
                cycle.direction = validDirections[Math.floor(Math.random() * validDirections.length)];
              }
              cycle.nextTurn = Math.random() * 5 + 3;
            } else {
              // Random direction changes - respect no-reversing rule
              cycle.nextTurn--;
              if (cycle.nextTurn <= 0) {
                const validDirections = getValidDirections(cycle.direction, cycle.startX, cycle.startY);
                if (validDirections.length > 0) {
                  cycle.direction = validDirections[Math.floor(Math.random() * validDirections.length)];
                }
                cycle.nextTurn = Math.random() * 5 + 3;
              }
            }
            
            // Set new end position based on (possibly new) direction
            const newDir = directions[cycle.direction];
            cycle.endX = cycle.startX + newDir.dx;
            cycle.endY = cycle.startY + newDir.dy;
            
            // Final bounds check - if new destination is out of bounds, pick valid direction
            if (cycle.endX < 0 || cycle.endX >= canvas.width || cycle.endY < 0 || cycle.endY >= canvas.height) {
              const validDirections = getValidDirections(cycle.direction, cycle.startX, cycle.startY);
              if (validDirections.length > 0) {
                cycle.direction = validDirections[Math.floor(Math.random() * validDirections.length)];
                const safeDir = directions[cycle.direction];
                cycle.endX = cycle.startX + safeDir.dx;
                cycle.endY = cycle.startY + safeDir.dy;
              }
            }
          }
        });
        
        // Collision detection between AI circuit lights (moved to main loop)
        for (let i = 0; i < lightCycles.length; i++) {
          for (let j = i + 1; j < lightCycles.length; j++) {
            const cycleA = lightCycles[i];
            const cycleB = lightCycles[j];
            
            // Skip if either cycle is in collision cooldown
            if (cycleA.collisionCooldown > 0 || cycleB.collisionCooldown > 0) continue;
            
            const distance = Math.sqrt((cycleA.x - cycleB.x) ** 2 + (cycleA.y - cycleB.y) ** 2);
            
            if (distance < 25) { // Collision threshold
              console.log(`🔥 COLLISION! ${cycleA.color} vs ${cycleB.color} AI circuit lights`);
              
              // Calculate explosion color based on colliding photon colors
              let explosionColor;
              let shockwaveColor;
              if (cycleA.color === cycleB.color) {
                // Same color collision
                if (cycleA.color === 'cyan') {
                  explosionColor = { r: 0, g: 255, b: 255 }; // Cyan
                  shockwaveColor = 'rgba(0, 255, 255, ';
                } else {
                  explosionColor = { r: 255, g: 150, b: 0 }; // Orange
                  shockwaveColor = 'rgba(255, 150, 0, ';
                }
              } else {
                // Mixed color collision (cyan + orange = white/electric)
                explosionColor = { r: 255, g: 255, b: 255 }; // White
                shockwaveColor = 'rgba(255, 255, 255, ';
              }
              
              // Create explosion at collision point
              explosions.push({
                x: (cycleA.x + cycleB.x) / 2,
                y: (cycleA.y + cycleB.y) / 2,
                color: explosionColor,
                shockwaveColor: shockwaveColor,
                particles: Array.from({ length: 20 }, (_, k) => ({
                  x: (cycleA.x + cycleB.x) / 2,
                  y: (cycleA.y + cycleB.y) / 2,
                  vx: Math.cos(k * Math.PI * 2 / 20) * 4,
                  vy: Math.sin(k * Math.PI * 2 / 20) * 4,
                  life: 1,
                  decay: 0.015 + Math.random() * 0.01
                })),
                shockwave: { radius: 0, maxRadius: 80, opacity: 1 }
              });
              
              // Respawn both circuit lights at new positions
              const newPosA = getRandomGridPos();
              const newPosB = getRandomGridPos();
              
              // Get valid initial directions for respawned circuit lights
              const validDirectionsA = getValidDirections(0, newPosA.x, newPosA.y); // Start with right as reference
              const validDirectionsB = getValidDirections(0, newPosB.x, newPosB.y);
              
              const directionA = validDirectionsA.length > 0 ? 
                validDirectionsA[Math.floor(Math.random() * validDirectionsA.length)] : 0;
              const directionB = validDirectionsB.length > 0 ? 
                validDirectionsB[Math.floor(Math.random() * validDirectionsB.length)] : 0;
              
              const directions = [
                { dx: gridSize, dy: 0 },    // right
                { dx: 0, dy: gridSize },    // down
                { dx: -gridSize, dy: 0 },   // left
                { dx: 0, dy: -gridSize }    // up
              ];
              
              // Preserve colors during respawn
              const originalColorA = cycleA.color;
              const originalColorB = cycleB.color;
              
              Object.assign(cycleA, {
                startX: newPosA.x,
                startY: newPosA.y,
                endX: newPosA.x + directions[directionA].dx,
                endY: newPosA.y + directions[directionA].dy,
                direction: directionA,
                animationTime: 0,
                trail: [],
                nextTurn: Math.random() * 5 + 3,
                color: originalColorA,
                collisionCooldown: 1500,
                x: newPosA.x,
                y: newPosA.y
              });
              
              Object.assign(cycleB, {
                startX: newPosB.x,
                startY: newPosB.y,
                endX: newPosB.x + directions[directionB].dx,
                endY: newPosB.y + directions[directionB].dy,
                direction: directionB,
                animationTime: 0,
                trail: [],
                nextTurn: Math.random() * 5 + 3,
                color: originalColorB,
                collisionCooldown: 1500,
                x: newPosB.x,
                y: newPosB.y
              });
            }
          }
        }
        
        // Update and draw explosions
        explosions.forEach((explosion, index) => {
          // Update shockwave
          explosion.shockwave.radius += deltaTime * 0.15;
          explosion.shockwave.opacity = 1 - (explosion.shockwave.radius / explosion.shockwave.maxRadius);
          
          // Draw shockwave
          if (explosion.shockwave.opacity > 0) {
            // Outer shockwave with explosion-specific color
            ctx.strokeStyle = `${explosion.shockwaveColor}${explosion.shockwave.opacity * 0.8})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, explosion.shockwave.radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Inner energy ring with brighter version
            ctx.strokeStyle = `${explosion.shockwaveColor}${explosion.shockwave.opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, explosion.shockwave.radius * 0.7, 0, Math.PI * 2);
            ctx.stroke();
          }
          
          // Update and draw particles
          explosion.particles = explosion.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= particle.decay;
            particle.vx *= 0.98; // Slow down over time
            particle.vy *= 0.98;
            
            if (particle.life > 0) {
              // Use explosion-specific color for particles
              const color = explosion.color;
              ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${particle.life})`;
              ctx.shadowColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
              ctx.shadowBlur = 6;
              ctx.beginPath();
              ctx.arc(particle.x, particle.y, 2 + particle.life * 2, 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0;
              return true;
            }
            return false;
          });
          
          // Remove explosion when done
          if (explosion.shockwave.opacity <= 0 && explosion.particles.length === 0) {
            explosions.splice(index, 1);
          }
        });

        // Draw AI circuit light trails and lights
        lightCycles.forEach(cycle => {
          // Draw trail with segmented glow
          ctx.lineCap = 'butt'; // Use 'butt' for sharper segments
          const segmentSize = 4; // Size of each trail segment
          const gapSize = 2; // Gap between segments

          for (let i = 1; i < cycle.trail.length; i++) {
            const p1 = cycle.trail[i - 1];
            const p2 = cycle.trail[i];
            const alpha = (i / cycle.trail.length) * 0.8; // Fade out older segments
            const width = 1.5 + alpha * 1.5;

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
              const numSegments = Math.floor(distance / (segmentSize + gapSize));
              for (let s = 0; s < numSegments; s++) {
                const segmentProgress = (s * (segmentSize + gapSize)) / distance;
                const segmentEndProgress = segmentProgress + segmentSize / distance;
                const segmentX = lerp(p1.x, p2.x, segmentProgress);
                const segmentY = lerp(p1.y, p2.y, segmentProgress);
                const segmentEndX = lerp(p1.x, p2.x, segmentEndProgress);
                const segmentEndY = lerp(p1.y, p2.y, segmentEndProgress);

                // Outer glow for the trail segment
                ctx.strokeStyle = cycle.color === 'cyan'
                  ? `rgba(0, 255, 255, ${alpha * 0.15})`
                  : `rgba(255, 150, 0, ${alpha * 0.15})`;
                ctx.lineWidth = width + 2;
                ctx.beginPath();
                ctx.moveTo(segmentX, segmentY);
                ctx.lineTo(segmentEndX, segmentEndY);
                ctx.stroke();

                // Inner trail segment
                ctx.strokeStyle = cycle.color === 'cyan'
                  ? `rgba(0, 255, 255, ${alpha * 0.8})`
                  : `rgba(255, 150, 0, ${alpha * 0.8})`;
                ctx.lineWidth = width;
                ctx.beginPath();
                ctx.moveTo(segmentX, segmentY);
                ctx.lineTo(segmentEndX, segmentEndY);
                ctx.stroke();
              }
            }
          }
          
          // Draw AI circuit light (square)
          const lightSize = 6; // Size of the main light square
          const halfLightSize = lightSize / 2;
          const cycleColor = cycle.color === 'cyan' ? '#00ffff' : '#ff9600';
          const glowColor = cycle.color === 'cyan' ? 'rgba(0, 255, 255, 0.6)' : 'rgba(255, 150, 0, 0.6)';
          
          // Outer glow for the main light
          ctx.fillStyle = glowColor;
          ctx.shadowColor = cycleColor;
          ctx.shadowBlur = 10;
          ctx.fillRect(cycle.x - halfLightSize, cycle.y - halfLightSize, lightSize, lightSize);
          
          // Inner core of the main light
          ctx.shadowBlur = 4;
          ctx.fillStyle = cycleColor;
          ctx.fillRect(cycle.x - halfLightSize / 2, cycle.y - halfLightSize / 2, lightSize / 2, lightSize / 2);
          
          ctx.shadowBlur = 0; // Reset shadow for other drawings
        });
        
        // Occasional scanning effect on grid
        if (Math.random() > 0.998) {
          const scanX = Math.random() * canvas.width;
          ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(scanX, 0);
          ctx.lineTo(scanX, canvas.height);
          ctx.stroke();
        }
        
        if (Math.random() > 0.998) {
          const scanY = Math.random() * canvas.height;
          ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, scanY);
          ctx.lineTo(canvas.width, scanY);
          ctx.stroke();
        }
        
        frame = requestAnimationFrame(loop);
      };
      let frame = requestAnimationFrame(loop);
      return { cancel: () => cancelAnimationFrame(frame) };
    }}
  />
);

export default function TronGridAICircuitBackground() {
  return (
    <div className="w-full h-screen bg-gray-950 relative overflow-hidden">
      <SubtleTronGrid />
      
      {/* Optional overlay for additional depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-950/10 pointer-events-none" />
      
      {/* Demo content to show background in action */}
      <div className="relative z-10 flex items-center justify-center h-full">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4 bg-black/20 backdrop-blur-sm px-8 py-4 rounded-lg border border-cyan-500/20">
            AI Circuit Grid
          </h1>
          <p className="text-cyan-300 text-lg bg-black/20 backdrop-blur-sm px-6 py-2 rounded border border-cyan-500/10">
            6 AI circuit lights (3 cyan + 3 orange) with segmented trails and color-matched explosions
          </p>
        </div>
      </div>
    </div>
  );
}