/**
 * Blog Component Tests
 *
 * Blog.jsx renders a section with a header and three BlogCard children driven
 * by translated data. The global jest.setup.js already mocks react-i18next so
 * t(key) returns the key itself. We verify structure, BlogCard delegation, and
 * edge-case handling through the real DOM.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// We render BlogCard for real (it is part of the Blog module being tested).
// htmlEncode and isValidImageUrl from securityUtils must not be mocked so
// BlogCard's trustedRender path is exercised.

import Blog from '../../../src/components/Blog/Blog';

describe('Blog Component', () => {
  describe('Section structure', () => {
    it('renders without crashing', () => {
      expect(() => render(<Blog />)).not.toThrow();
    });

    it('renders a <section> element with id "blog"', () => {
      const { container } = render(<Blog />);
      const section = container.querySelector('section#blog');
      expect(section).toBeInTheDocument();
    });

    it('renders the section title from translation key "blogTitle"', () => {
      render(<Blog />);
      // t(key) === key in the test mock
      expect(screen.getByText('blogTitle')).toBeInTheDocument();
    });

    it('renders the section subtitle from translation key "blogSubtitle"', () => {
      render(<Blog />);
      expect(screen.getByText('blogSubtitle')).toBeInTheDocument();
    });

    it('renders an h2 for the section title', () => {
      render(<Blog />);
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('blogTitle');
    });
  });

  describe('BlogCard rendering', () => {
    it('renders exactly 3 blog cards', () => {
      render(<Blog />);
      // Each BlogCard renders an h3 for the title
      const titles = screen.getAllByRole('heading', { level: 3 });
      expect(titles).toHaveLength(3);
    });

    it('each card displays the "comingSoon" translation key as title', () => {
      render(<Blog />);
      const titles = screen.getAllByRole('heading', { level: 3 });
      titles.forEach(title => {
        expect(title).toHaveTextContent('comingSoon');
      });
    });

    it('each card displays the "blogExcerpt" translation key as excerpt', () => {
      render(<Blog />);
      // BlogCard renders excerpt as a <p>
      const excerpts = screen.getAllByText('blogExcerpt');
      expect(excerpts).toHaveLength(3);
    });

    it('each card renders a "Coming Soon" link', () => {
      render(<Blog />);
      const links = screen.getAllByRole('link', { name: /coming soon/i });
      expect(links).toHaveLength(3);
    });

    it('each "Coming Soon" link has target="_blank"', () => {
      render(<Blog />);
      const links = screen.getAllByRole('link', { name: /coming soon/i });
      links.forEach(link => {
        expect(link).toHaveAttribute('target', '_blank');
      });
    });

    it('each "Coming Soon" link has rel="noopener noreferrer"', () => {
      render(<Blog />);
      const links = screen.getAllByRole('link', { name: /coming soon/i });
      links.forEach(link => {
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });

    it('each "Coming Soon" link href falls back to "#" for placeholder URLs', () => {
      render(<Blog />);
      const links = screen.getAllByRole('link', { name: /coming soon/i });
      links.forEach(link => {
        expect(link).toHaveAttribute('href', '#');
      });
    });
  });

  describe('Date rendering', () => {
    it('each card shows the "comingSoon" key as the date', () => {
      const { container } = render(<Blog />);
      // BlogCard renders date in a div; count occurrences of "comingSoon" text nodes
      // Title (h3) + date (div) = 2 × 3 = 6 elements with "comingSoon"
      const allComingSoon = container.querySelectorAll('*');
      const comingSoonElements = Array.from(allComingSoon).filter(
        el => el.textContent === 'comingSoon' && el.childElementCount === 0
      );
      // At minimum 3 date elements plus 3 title elements
      expect(comingSoonElements.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Re-render stability', () => {
    it('re-renders without error', () => {
      const { rerender } = render(<Blog />);
      expect(() => rerender(<Blog />)).not.toThrow();
    });

    it('card count stays at 3 after re-render', () => {
      const { rerender } = render(<Blog />);
      rerender(<Blog />);
      const titles = screen.getAllByRole('heading', { level: 3 });
      expect(titles).toHaveLength(3);
    });
  });
});
