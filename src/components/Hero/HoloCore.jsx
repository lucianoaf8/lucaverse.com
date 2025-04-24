import React, { useRef, useState, useEffect } from 'react';
import styles from './HoloCore.module.css';
import { FaPython, FaDocker, FaCode } from 'react-icons/fa';
import { SiHuggingface } from 'react-icons/si';
import { TbBrandOpenai } from 'react-icons/tb';
import { BsStars } from 'react-icons/bs';
import { GiWindSlap } from 'react-icons/gi';
import { MdOutlineWeb } from 'react-icons/md';
import { BiNetworkChart } from 'react-icons/bi';
import { IoLogoElectron } from 'react-icons/io5';

const AVATAR_SRC = '/avatars/luca-avatar.png';
const AVATAR_ALT = 'Luca Avatar';
const AVATAR_SIZE = 740; // Fix typo in AVATAR_SIZE
const ICON_SIZE = 38;
const MIN_ORBIT_PADDING = 20; // px, space between icons and edge
const ORBIT_CONTAINER_SIZE = 900; // Decrease orbit circle size by reducing ORBIT_CONTAINER_SIZE and updating initial orbitRadius

const orbitIcons = [
  { name: 'Python', icon: FaPython },
  { name: 'ChatGPT', icon: TbBrandOpenai },
  { name: 'Claude', icon: BsStars },
  { name: 'VSCode', icon: FaCode },
  { name: 'Windsurf', icon: GiWindSlap },
  { name: 'HuggingFace', icon: SiHuggingface },
  { name: 'OpenRouter.ai', icon: IoLogoElectron },
  { name: 'Together.ai', icon: BiNetworkChart },
  { name: 'Docker', icon: FaDocker },
  { name: 'Open WebUI', icon: MdOutlineWeb },
];

const HoloCore = () => {
  const orbitRef = useRef(null);
  const [orbitRadius, setOrbitRadius] = useState((ORBIT_CONTAINER_SIZE / 2) - ICON_SIZE - MIN_ORBIT_PADDING);
  const [orbitSize, setOrbitSize] = useState(ORBIT_CONTAINER_SIZE);
  const [orbitRotation, setOrbitRotation] = useState(0);

  useEffect(() => {
    function updateOrbit() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Decrease base orbit radius
      const maxPossibleRadius = Math.min(
        (vw / 2) - ICON_SIZE - MIN_ORBIT_PADDING,
        (vh / 2) - ICON_SIZE - MIN_ORBIT_PADDING
      );
      const finalRadius = Math.min((ORBIT_CONTAINER_SIZE / 2) - ICON_SIZE - MIN_ORBIT_PADDING, maxPossibleRadius);
      setOrbitRadius(finalRadius);
      setOrbitSize(ORBIT_CONTAINER_SIZE);
    }
    updateOrbit();
    window.addEventListener('resize', updateOrbit);
    return () => window.removeEventListener('resize', updateOrbit);
  }, []);

  useEffect(() => {
    let frame;
    let start = null;
    const duration = 80000;
    function animateOrbit(ts) {
      if (!start) start = ts;
      const elapsed = ts - start;
      const rotation = (elapsed / duration) * 360;
      setOrbitRotation(rotation % 360);
      frame = requestAnimationFrame(animateOrbit);
    }
    frame = requestAnimationFrame(animateOrbit);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className={styles.holoCoreContainer}>
      {/* Move avatar 10px down by adjusting wrapper style */}
      <div className={styles.holoCoreWrapper} style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, top: 'calc(50% + 55px)' }}>
        <img
          src={AVATAR_SRC}
          alt={AVATAR_ALT}
          width={AVATAR_SIZE}
          height={AVATAR_SIZE}
        />
      </div>
      <div className={styles.orbitContainerWrapper}>
        <div
          className={styles.orbitContainer}
          style={{ width: orbitSize, height: orbitSize }}
          ref={orbitRef}
        >
          {orbitIcons.map((icon, index) => {
            const angle = (index / orbitIcons.length) * 360 + orbitRotation;
            const radian = (angle * Math.PI) / 180;
            const x = Math.cos(radian) * orbitRadius;
            const y = Math.sin(radian) * orbitRadius;
            
            return (
              <div 
                key={icon.name}
                className={styles.stackIcon}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                }}
              >
                <div className={styles.iconContent}>
                  <icon.icon 
                    className={styles.iconImage} 
                    color="#00e5ff"
                    size={ICON_SIZE}
                  />
                  <div className={styles.iconName}>
                    {icon.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HoloCore;