# Flag Flash Animation Implementation Guide

## Prerequisites
This guide assumes you have already implemented the basic language toggle from the previous guide.

## 1. Header.jsx Changes

### Add these additional state variables after your existing language toggle states:

```jsx
const [showingFlag, setShowingFlag] = useState(false);
const [flagToShow, setFlagToShow] = useState(null);
```

### Replace your existing LanguageToggle component with this enhanced version:

```jsx
// Language Toggle Component with Flag Flash
const LanguageToggle = () => {
  const handleLanguageChange = () => {
    // Determine which flag to show based on target language
    const nextLanguage = language === 'EN' ? 'PT' : 'EN';
    const targetFlag = nextLanguage === 'PT' ? 'BR' : 'US';
    
    // Change language immediately and show flag flash
    setLanguage(nextLanguage);
    setFlagToShow(targetFlag);
    setShowingFlag(true);
    
    // Hide flag after brief flash
    setTimeout(() => {
      setShowingFlag(false);
      setFlagToShow(null);
    }, 250);
  };

  return (
    <div className={styles.toggleContainer}>
      <button
        className={styles.languageToggle}
        onMouseEnter={() => setHoveredToggle(true)}
        onMouseLeave={() => setHoveredToggle(false)}
        onClick={handleLanguageChange}
        title={`Switch to ${language === 'EN' ? 'Portuguese' : 'English'}`}
        data-hovered={hoveredToggle}
        style={{ opacity: showingFlag ? 0 : 1 }}
      >
        {language}
      </button>
      
      {showingFlag && (
        <div className={styles.flagFlash} data-flag={flagToShow}>
          {flagToShow === 'BR' ? (
            <svg width="50" height="30" viewBox="0 0 50 30" className={styles.flagSvg}>
              <rect width="50" height="30" fill="#009639"/>
              <polygon points="25,5 45,15 25,25 5,15" fill="#FEDF00"/>
              <circle cx="25" cy="15" r="6" fill="#002776"/>
              <path d="M19,15 Q25,12 31,15 Q25,18 19,15" fill="#FEDF00" stroke="#FEDF00" strokeWidth="0.5"/>
            </svg>
          ) : (
            <svg width="50" height="30" viewBox="0 0 50 30" className={styles.flagSvg}>
              <rect width="50" height="30" fill="#B22234"/>
              <rect width="50" height="2.3" y="2.3" fill="white"/>
              <rect width="50" height="2.3" y="6.9" fill="white"/>
              <rect width="50" height="2.3" y="11.5" fill="white"/>
              <rect width="50" height="2.3" y="16.1" fill="white"/>
              <rect width="50" height="2.3" y="20.7" fill="white"/>
              <rect width="50" height="2.3" y="25.3" fill="white"/>
              <rect width="20" height="15" fill="#3C3B6E"/>
              <g fill="white" fontSize="1.5">
                <text x="2" y="3">★</text><text x="6" y="3">★</text><text x="10" y="3">★</text><text x="14" y="3">★</text><text x="18" y="3">★</text>
                <text x="4" y="6">★</text><text x="8" y="6">★</text><text x="12" y="6">★</text><text x="16" y="6">★</text>
                <text x="2" y="9">★</text><text x="6" y="9">★</text><text x="10" y="9">★</text><text x="14" y="9">★</text><text x="18" y="9">★</text>
                <text x="4" y="12">★</text><text x="8" y="12">★</text><text x="12" y="12">★</text><text x="16" y="12">★</text>
              </g>
            </svg>
          )}
        </div>
      )}
    </div>
  );
};
```

## 2. Header.module.css Changes

### Replace your existing `.rightSection` class with this updated version:

```css
.rightSection {
  display: flex;
  align-items: center;
  gap: 24px; /* Increased gap for more spacing */
  margin-left: 20px; /* Additional margin to push toggle further right */
}
```

### Replace your existing `.languageToggle` class with this updated version:

```css
.toggleContainer {
  position: relative;
  width: 50px;
  height: 30px;
}

.languageToggle {
  width: 50px;
  height: 30px;
  border: 1px solid rgba(0, 229, 255, 0.3);
  border-radius: 4px;
  background: transparent;
  box-shadow: 0 0 10px rgba(0, 229, 255, 0.05);
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
  font-family: 'Space Grotesk', sans-serif;
  position: relative;
  z-index: 2;
}

.languageToggle[data-hovered="true"] {
  border-color: var(--primary-cyan);
  background: rgba(0, 229, 255, 0.1);
  box-shadow: 0 0 15px rgba(0, 229, 255, 0.2);
  color: var(--primary-cyan);
}
```

### Add these new CSS classes for the flag flash animation:

```css
.flagFlash {
  position: absolute;
  top: 0;
  left: 0;
  width: 50px;
  height: 30px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
  animation: flagFlashAnimation 0.25s ease-out;
  border: 1px solid var(--primary-cyan);
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.4);
  overflow: hidden;
}

.flagSvg {
  width: 100%;
  height: 100%;
  border-radius: 3px;
}

@keyframes flagFlashAnimation {
  0% {
    opacity: 0;
    transform: scale(1);
  }
  40% {
    opacity: 1;
    transform: scale(1.02);
    box-shadow: 0 0 15px rgba(0, 229, 255, 0.4);
  }
  100% {
    opacity: 0;
    transform: scale(1);
  }
}

/* Flag-specific styling */
.flagFlash[data-flag="BR"] {
  background: linear-gradient(135deg, #009639 0%, #FEDF00 100%);
}

.flagFlash[data-flag="US"] {
  background: linear-gradient(135deg, #B22234 0%, #3C3B6E 100%);
}
```

### Update your existing responsive CSS:

```css
/* Responsive adjustments */
@media (max-width: 1100px) {
  .rightSection {
    gap: 16px;
    margin-left: 16px;
  }
}

@media (max-width: 900px) {
  .rightSection {
    flex-direction: column;
    gap: 8px;
    align-items: flex-end;
    margin-left: 12px;
  }
  
  .toggleContainer {
    align-self: flex-end;
  }
}

@media (max-width: 768px) {
  .rightSection {
    margin-left: 8px;
  }
  
  .flagFlash {
    border-width: 1px;
    box-shadow: 0 0 15px rgba(0, 229, 255, 0.3);
  }
}
```

## 3. index.css Changes

**No additional changes needed** - Uses existing CSS variables.

## 4. What's New in This Implementation

### Flag Flash Features:
- **Single subtle flash**: 250ms animation with gentle scaling
- **Flag logic**: EN→PT shows Brazilian flag, PT→EN shows US flag
- **Immediate language change**: No double-blink issues
- **SVG flags**: High-quality vector graphics for both countries

### Positioning Updates:
- **Increased gap**: 24px spacing between CTAs and toggle
- **Additional margin**: 20px left margin pushes toggle further right
- **Responsive scaling**: Margins adjust for different screen sizes

### Animation Details:
- **Timing**: Language changes instantly, flag flashes for 250ms
- **Visual**: Button fades out during flag display, returns with new language
- **Scaling**: Subtle 1→1.02→1 scale with opacity fade
- **Colors**: Flag-specific background gradients with cyan glow border

### Usage:
Click the toggle to see the flag flash animation that indicates which language you're switching to:
- **EN → PT**: Brazilian flag flash 🇧🇷
- **PT → EN**: US flag flash 🇺🇸

The toggle now appears further to the right and provides delightful visual feedback for language switching while maintaining the header's design consistency.