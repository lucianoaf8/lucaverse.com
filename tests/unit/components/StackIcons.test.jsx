/**
 * StackIcons Component Tests
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';

import StackIcons from '../../../src/components/Hero/StackIcons';

describe('StackIcons Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      expect(() => render(<StackIcons />)).not.toThrow();
    });

    it('renders all 4 icon names', () => {
      render(<StackIcons />);
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('Node')).toBeInTheDocument();
      expect(screen.getByText('JS')).toBeInTheDocument();
      expect(screen.getByText('CSS')).toBeInTheDocument();
    });

    it('renders exactly 4 icon containers', () => {
      render(<StackIcons />);
      // Each icon has its name as a text node
      const iconNames = ['React', 'Node', 'JS', 'CSS'];
      iconNames.forEach(name => {
        expect(screen.getByText(name)).toBeInTheDocument();
      });
    });
  });

  describe('Layout', () => {
    it('renders a root container div with inline style', () => {
      const { container } = render(<StackIcons />);
      const root = container.firstChild;
      expect(root.tagName).toBe('DIV');
      expect(root.style.position).toBe('relative');
    });

    it('root container has correct dimensions based on ORBIT_RADIUS=180', () => {
      const { container } = render(<StackIcons />);
      const root = container.firstChild;
      // Width and height should be 2*180+80 = 440px
      expect(root.style.width).toBe('440px');
      expect(root.style.height).toBe('440px');
    });

    it('icon containers have absolute positioning', () => {
      const { container } = render(<StackIcons />);
      // Each icon is positioned absolutely
      const absoluteItems = container.querySelectorAll('[style*="position: absolute"]');
      expect(absoluteItems.length).toBe(4);
    });

    it('icons are distributed evenly (left:50%, top:50%)', () => {
      const { container } = render(<StackIcons />);
      const items = container.querySelectorAll('[style*="position: absolute"]');
      items.forEach(item => {
        expect(item.style.left).toBe('50%');
        expect(item.style.top).toBe('50%');
      });
    });

    it('each icon has a transform with calc and translate', () => {
      const { container } = render(<StackIcons />);
      const items = container.querySelectorAll('[style*="position: absolute"]');
      items.forEach(item => {
        expect(item.style.transform).toMatch(/translate\(calc/);
      });
    });
  });

  describe('Icon SVG rendering', () => {
    it('renders SVG elements for each icon', () => {
      const { container } = render(<StackIcons />);
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBe(4);
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(<StackIcons />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
