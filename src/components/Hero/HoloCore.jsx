import React, { useRef, useState, useEffect } from 'react';
import styles from './HoloCore.module.css';
import { FaPython, FaDocker, FaCode, FaRobot, FaBrain } from 'react-icons/fa';
import { SiHuggingface, SiAnthropic } from 'react-icons/si';
import { TbBrandOpenai } from 'react-icons/tb';
import { BsStars } from 'react-icons/bs';
import { GiWindSlap } from 'react-icons/gi';
import { MdOutlineWeb } from 'react-icons/md';
import { BiNetworkChart } from 'react-icons/bi';
import { RiRouterFill } from 'react-icons/ri';

const AVATAR_SRC = '/avatars/luca-avatar.png';
const AVATAR_ALT = 'Luca Avatar';
const ICON_SIZE = 38;
const MIN_ORBIT_PADDING = 20;

// Responsive defaults — scaled down on small viewports
function getResponsiveSizes() {
  /* c8 ignore next -- false branch unreachable: jsdom always provides window */
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  if (vw <= 576) return { avatarSize: 320, orbitContainerSize: 400 };
  if (vw <= 768) return { avatarSize: 440, orbitContainerSize: 560 };
  if (vw <= 992) return { avatarSize: 580, orbitContainerSize: 720 };
  return { avatarSize: 740, orbitContainerSize: 900 };
}

const orbitIcons = [
  { name: 'Python', icon: FaPython },
  { name: 'ChatGPT', icon: TbBrandOpenai },
  { name: 'Claude', icon: SiAnthropic },
  { name: 'VSCode', icon: FaCode },
  { name: 'Windsurf', icon: GiWindSlap },
  { name: 'HuggingFace', icon: SiHuggingface },
  { name: 'OpenRouter.ai', icon: RiRouterFill },
  { name: 'Together.ai', icon: FaBrain },
  { name: 'Docker', icon: FaDocker },
  { name: 'Open WebUI', icon: MdOutlineWeb },
];

const HoloCore = () => {
  const orbitRef = useRef(null);
  const initial = getResponsiveSizes();
  const [avatarSize, setAvatarSize] = useState(initial.avatarSize);
  const [orbitRadius, setOrbitRadius] = useState((initial.orbitContainerSize / 2) - ICON_SIZE - MIN_ORBIT_PADDING);
  const [orbitSize, setOrbitSize] = useState(initial.orbitContainerSize);
  const [orbitRotation, setOrbitRotation] = useState(0);

  useEffect(() => {
    function updateOrbit() {
      const sizes = getResponsiveSizes();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const maxPossibleRadius = Math.min(
        (vw / 2) - ICON_SIZE - MIN_ORBIT_PADDING,
        (vh / 2) - ICON_SIZE - MIN_ORBIT_PADDING
      );
      const finalRadius = Math.min((sizes.orbitContainerSize / 2) - ICON_SIZE - MIN_ORBIT_PADDING, maxPossibleRadius);
      setOrbitRadius(finalRadius);
      setOrbitSize(sizes.orbitContainerSize);
      setAvatarSize(sizes.avatarSize);
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
      <div className={styles.holoCoreWrapper} style={{ width: avatarSize, height: avatarSize, top: 'calc(50% + 55px)' }}>
        <img
          src={AVATAR_SRC}
          alt={AVATAR_ALT}
          width={avatarSize}
          height={avatarSize}
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
