import React from "react";
import styles from "./HoloCore.module.css";
import { FaReact, FaNodeJs, FaJs, FaCss3Alt } from "react-icons/fa";

const icons = [
  { name: "React", icon: FaReact },
  { name: "Node", icon: FaNodeJs },
  { name: "JS", icon: FaJs },
  { name: "CSS", icon: FaCss3Alt },
];

const ORBIT_RADIUS = 180;

export default function StackIcons() {
  return (
    <div style={{ position: "relative", width: 2 * ORBIT_RADIUS + 80, height: 2 * ORBIT_RADIUS + 80 }}>
      {icons.map((icon, index) => {
        const angle = (index / icons.length) * 2 * Math.PI;
        const x = ORBIT_RADIUS * Math.cos(angle);
        const y = ORBIT_RADIUS * Math.sin(angle);
        
        return (
          <div
            key={icon.name}
            className={styles.stackIcon}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
            }}
          >
            <div className={styles.iconInner}>
              <icon.icon className={styles.iconImage} size={40} />
            </div>
            <div className={styles.iconName}>{icon.name}</div>
          </div>
        );
      })}
    </div>
  );
}
