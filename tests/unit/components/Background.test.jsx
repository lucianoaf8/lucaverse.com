/**
 * Background Component Tests
 *
 * Background.jsx is a thin wrapper that renders the TronGrid canvas animation
 * inside a fixed-position container. TronGrid uses requestAnimationFrame and
 * Canvas 2D APIs, both of which are unavailable in jsdom. We mock TronGrid so
 * the Background component's own logic (positioning, CSS attributes, children
 * rendering) is exercised without hitting canvas internals.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock the TronGrid TypeScript module — it drives a canvas animation loop that
// cannot run in jsdom. We replace it with a simple div so Background's own
// rendering logic is fully exercised.
jest.mock('../../../src/components/Background/TronGrid.tsx', () => {
  return function MockTronGrid() {
    return <div data-testid="tron-grid-mock" />;
  };
});

import Background from '../../../src/components/Background/Background';

describe('Background Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      expect(() => render(<Background />)).not.toThrow();
    });

    it('renders the background wrapper element with correct id', () => {
      const { container } = render(<Background />);
      const wrapper = container.querySelector('#background-wrapper');
      expect(wrapper).toBeInTheDocument();
    });

    it('renders TronGrid inside the wrapper', () => {
      render(<Background />);
      expect(screen.getByTestId('tron-grid-mock')).toBeInTheDocument();
    });

    it('wrapper has fixed positioning style', () => {
      const { container } = render(<Background />);
      const wrapper = container.querySelector('#background-wrapper');
      expect(wrapper).toHaveStyle({ position: 'fixed' });
    });

    it('wrapper covers full viewport (top: 0, left: 0)', () => {
      const { container } = render(<Background />);
      const wrapper = container.querySelector('#background-wrapper');
      expect(wrapper).toHaveStyle({ top: 0 });
      expect(wrapper).toHaveStyle({ left: 0 });
    });

    it('wrapper has 100% width and height', () => {
      const { container } = render(<Background />);
      const wrapper = container.querySelector('#background-wrapper');
      expect(wrapper).toHaveStyle({ width: '100%' });
      expect(wrapper).toHaveStyle({ height: '100%' });
    });

    it('wrapper has zIndex 0 (sits behind page content)', () => {
      const { container } = render(<Background />);
      const wrapper = container.querySelector('#background-wrapper');
      expect(wrapper).toHaveStyle({ zIndex: 0 });
    });

    it('wrapper has pointerEvents none (non-interactive)', () => {
      const { container } = render(<Background />);
      const wrapper = container.querySelector('#background-wrapper');
      expect(wrapper).toHaveStyle({ pointerEvents: 'none' });
    });
  });

  describe('TronGrid child mount', () => {
    it('renders exactly one TronGrid child', () => {
      render(<Background />);
      const grids = screen.getAllByTestId('tron-grid-mock');
      expect(grids).toHaveLength(1);
    });

    it('TronGrid is a descendant of the background-wrapper', () => {
      const { container } = render(<Background />);
      const wrapper = container.querySelector('#background-wrapper');
      expect(wrapper).toContainElement(screen.getByTestId('tron-grid-mock'));
    });
  });

  describe('Re-render stability', () => {
    it('re-renders without throwing', () => {
      const { rerender } = render(<Background />);
      expect(() => rerender(<Background />)).not.toThrow();
    });

    it('wrapper id remains stable after re-render', () => {
      const { rerender, container } = render(<Background />);
      rerender(<Background />);
      expect(container.querySelector('#background-wrapper')).toBeInTheDocument();
    });
  });
});
