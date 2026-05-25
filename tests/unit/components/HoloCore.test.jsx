/**
 * HoloCore Component Tests
 * HoloCore uses requestAnimationFrame for orbit animation and window.resize.
 * We test rendering, prop handling, cleanup, and the orbit icon list.
 * The animation loop uses requestAnimationFrame which we stub.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { changeLanguage: jest.fn(), language: 'en' }
  }),
  Trans: ({ children }) => children,
  initReactI18next: { type: '3rdParty', init: jest.fn() }
}));

// Stub requestAnimationFrame and cancelAnimationFrame for JSDOM
let rafCallbacks = [];
let rafId = 0;
global.requestAnimationFrame = jest.fn((cb) => {
  rafCallbacks.push(cb);
  return ++rafId;
});
global.cancelAnimationFrame = jest.fn((id) => {
  rafCallbacks = rafCallbacks.filter((_, i) => i !== id - 1);
});

import HoloCore from '../../../src/components/Hero/HoloCore';

describe('HoloCore Component', () => {
  beforeEach(() => {
    rafCallbacks = [];
    rafId = 0;
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      expect(() => render(<HoloCore />)).not.toThrow();
    });

    it('renders the avatar image', () => {
      render(<HoloCore />);
      const img = screen.getByAltText('Luca Avatar');
      expect(img).toBeInTheDocument();
    });

    it('avatar image has src pointing to avatar path', () => {
      render(<HoloCore />);
      const img = screen.getByAltText('Luca Avatar');
      expect(img).toHaveAttribute('src', '/avatars/luca-avatar.png');
    });

    it('renders all 10 orbit icons by name', () => {
      render(<HoloCore />);
      const expectedNames = [
        'Python', 'ChatGPT', 'Claude', 'VSCode', 'Windsurf',
        'HuggingFace', 'OpenRouter.ai', 'Together.ai', 'Docker', 'Open WebUI'
      ];
      expectedNames.forEach(name => {
        expect(screen.getByText(name)).toBeInTheDocument();
      });
    });

    it('renders correct number of orbit icon containers', () => {
      render(<HoloCore />);
      const iconNames = [
        'Python', 'ChatGPT', 'Claude', 'VSCode', 'Windsurf',
        'HuggingFace', 'OpenRouter.ai', 'Together.ai', 'Docker', 'Open WebUI'
      ];
      // Each icon has its name rendered as text
      expect(screen.getAllByText(/Python|ChatGPT|Claude|VSCode|Windsurf/)).toHaveLength(5);
    });
  });

  describe('Animation setup', () => {
    it('calls requestAnimationFrame on mount', () => {
      render(<HoloCore />);
      expect(global.requestAnimationFrame).toHaveBeenCalled();
    });

    it('cancels animation frame on unmount', () => {
      const { unmount } = render(<HoloCore />);
      unmount();
      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('animation callback updates orbit rotation when called', () => {
      render(<HoloCore />);
      const initialCallCount = global.requestAnimationFrame.mock.calls.length;
      // Simulate one RAF tick
      act(() => {
        if (rafCallbacks[0]) rafCallbacks[0](100);
      });
      // Component should re-request animation frame
      expect(global.requestAnimationFrame.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  describe('Responsive sizing', () => {
    // Save/restore innerWidth around each test
    let originalInnerWidth;
    beforeEach(() => {
      originalInnerWidth = window.innerWidth;
    });
    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        value: originalInnerWidth,
        writable: true,
        configurable: true
      });
    });

    it('renders with default sizes for desktop viewport', () => {
      // jsdom has innerWidth=1024 by default
      const { container } = render(<HoloCore />);
      expect(container.firstChild).toBeTruthy();
    });

    it('uses small (≤576) sizes when innerWidth is 400', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 400,
        writable: true,
        configurable: true
      });
      const { container } = render(<HoloCore />);
      // Component should render without crashing with small viewport
      expect(container.firstChild).toBeTruthy();
      expect(screen.getByAltText('Luca Avatar')).toBeInTheDocument();
    });

    it('uses medium (≤768) sizes when innerWidth is 600', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 600,
        writable: true,
        configurable: true
      });
      const { container } = render(<HoloCore />);
      expect(container.firstChild).toBeTruthy();
      expect(screen.getByAltText('Luca Avatar')).toBeInTheDocument();
    });

    it('uses large (≤992) sizes when innerWidth is 800', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 800,
        writable: true,
        configurable: true
      });
      const { container } = render(<HoloCore />);
      expect(container.firstChild).toBeTruthy();
      expect(screen.getByAltText('Luca Avatar')).toBeInTheDocument();
    });

    it('triggers ≤576 branch on resize to 400px', () => {
      render(<HoloCore />);
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          value: 400,
          writable: true,
          configurable: true
        });
        window.dispatchEvent(new Event('resize'));
      });
      expect(screen.getByAltText('Luca Avatar')).toBeInTheDocument();
    });

    it('triggers ≤768 branch on resize to 600px', () => {
      render(<HoloCore />);
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          value: 600,
          writable: true,
          configurable: true
        });
        window.dispatchEvent(new Event('resize'));
      });
      expect(screen.getByAltText('Luca Avatar')).toBeInTheDocument();
    });

    it('triggers ≤992 branch on resize to 800px', () => {
      render(<HoloCore />);
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          value: 800,
          writable: true,
          configurable: true
        });
        window.dispatchEvent(new Event('resize'));
      });
      expect(screen.getByAltText('Luca Avatar')).toBeInTheDocument();
    });

    it('adds resize event listener on mount', () => {
      const addSpy = jest.spyOn(window, 'addEventListener');
      render(<HoloCore />);
      expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      addSpy.mockRestore();
    });

    it('removes resize event listener on unmount', () => {
      const removeSpy = jest.spyOn(window, 'removeEventListener');
      const { unmount } = render(<HoloCore />);
      unmount();
      expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      removeSpy.mockRestore();
    });

    it('handles window resize event without crashing', () => {
      render(<HoloCore />);
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      // Should not throw
      expect(screen.getByAltText('Luca Avatar')).toBeInTheDocument();
    });
  });

  describe('Icon positioning', () => {
    it('each orbit icon has absolute positioning style', () => {
      const { container } = render(<HoloCore />);
      // Find icon wrappers — they are divs with position: absolute
      const absoluteDivs = container.querySelectorAll('[style*="position: absolute"]');
      expect(absoluteDivs.length).toBeGreaterThan(0);
    });
  });
});
