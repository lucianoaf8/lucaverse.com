# Language Toggle Implementation Guide

## 1. Header.jsx Changes

### Add these state variables after the existing useState declarations:

```jsx
const [language, setLanguage] = useState('EN');
const [hoveredToggle, setHoveredToggle] = useState(false);
```

### Add this component before the return statement:

```jsx
// Language Toggle Component
const LanguageToggle = () => {
  return (
    <button
      className={styles.languageToggle}
      onMouseEnter={() => setHoveredToggle(true)}
      onMouseLeave={() => setHoveredToggle(false)}
      onClick={() => setLanguage(language === 'EN' ? 'PT' : 'EN')}
      title={`Switch to ${language === 'EN' ? 'Portuguese' : 'English'}`}
      data-hovered={hoveredToggle}
    >
      {language}
    </button>
  );
};
```

### Update the rightSection div structure:

Find this section in the JSX:
```jsx
<div className={styles.ctas}>
  <a href="#login" className={`${styles.ctaBtn} ${styles.ctaLogin}`}>Lucaverse Login</a>
  <button type="button" className={`${styles.ctaBtn} ${styles.ctaRequest}`} onClick={() => setAccessOpen(true)}>
    Request Access
  </button>
</div>
```

Replace it with:
```jsx
<div className={styles.rightSection}>
  <div className={styles.ctas}>
    <a href="#login" className={`${styles.ctaBtn} ${styles.ctaLogin}`}>Lucaverse Login</a>
    <button type="button" className={`${styles.ctaBtn} ${styles.ctaRequest}`} onClick={() => setAccessOpen(true)}>
      Request Access
    </button>
  </div>
  <LanguageToggle />
</div>
```

## 2. Header.module.css Changes

### Add these new CSS classes at the end of the file:

```css
.rightSection {
  display: flex;
  align-items: center;
  gap: 16px;
}

.languageToggle {
  width: 50px;
  height: 30px;
  border: 1px solid rgba(0, 229, 255, 0.3);
  border-radius: 4px;
  background: transparent;
  box-shadow: 0 0 10px rgba(0, 229, 255, 0.05);
  transition: var(--transition-smooth);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
  font-family: 'Space Grotesk', sans-serif;
}

.languageToggle[data-hovered="true"] {
  border-color: var(--primary-cyan);
  background: rgba(0, 229, 255, 0.1);
  box-shadow: 0 0 15px rgba(0, 229, 255, 0.2);
  color: var(--primary-cyan);
}

/* Responsive adjustments */
@media (max-width: 1100px) {
  .rightSection {
    gap: 12px;
  }
}

@media (max-width: 900px) {
  .rightSection {
    flex-direction: column;
    gap: 8px;
    align-items: flex-end;
  }
}
```

## 3. index.css Changes

**No changes needed** - The implementation uses existing CSS variables.

## 4. Implementation Summary

### What gets added:
- **Language state management** (EN/PT toggle)
- **Hover state tracking** for visual feedback
- **LanguageToggle component** with button styling
- **rightSection wrapper** to properly layout CTAs and toggle
- **Responsive CSS classes** for the new elements

### What stays unchanged:
- All existing header functionality
- All existing navigation and CTA styling
- All existing responsive behavior
- All existing animations and effects

### Final Result:
The language toggle will appear to the right of the "Request Access" button, maintaining the header's design system with:
- Space Grotesk font
- Primary cyan color scheme  
- Hover effects with glow and background tint
- 50px × 30px button size
- Smooth transitions
- Proper responsive behavior

### Usage:
Click the toggle to switch between "EN" and "PT". The button maintains hover states and provides visual feedback consistent with the rest of the header design.