/**
 * Extra BlogCard tests to cover:
 * - trustedRender fallback branch: when content is non-string or falsy
 *   (line 10: `if (typeof content !== 'string' || !content) return fallback`)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import BlogCard from '../../../src/components/Blog/BlogCard';

describe('BlogCard — extra coverage (trustedRender fallback)', () => {
  it('uses fallback for icon when icon is undefined (non-string)', () => {
    const post = {
      title: 'My Post',
      icon: undefined,      // non-string → trustedRender returns fallback 'fas fa-blog'
      date: '2026-01-01',
      excerpt: 'An excerpt',
      url: 'https://example.com/post',
    };

    const { container } = render(<BlogCard post={post} />);
    // The icon element should use the fallback class 'fas fa-blog'
    const iconEl = container.querySelector('i');
    expect(iconEl.className).toContain('fas fa-blog');
  });

  it('uses fallback for title when title is empty string (falsy)', () => {
    const post = {
      title: '',            // empty string → falsy → trustedRender returns fallback 'Untitled Post'
      icon: 'fas fa-pen',
      date: '2026-01-01',
      excerpt: 'An excerpt',
      url: 'https://example.com/post',
    };

    render(<BlogCard post={post} />);
    expect(screen.getByText('Untitled Post')).toBeInTheDocument();
  });

  it('uses fallback for date when date is null (non-string)', () => {
    const post = {
      title: 'My Post',
      icon: 'fas fa-pen',
      date: null,           // non-string → trustedRender returns fallback 'No date'
      excerpt: 'An excerpt',
      url: 'https://example.com/post',
    };

    render(<BlogCard post={post} />);
    expect(screen.getByText('No date')).toBeInTheDocument();
  });

  it('uses fallback for excerpt when excerpt is undefined (non-string)', () => {
    const post = {
      title: 'My Post',
      icon: 'fas fa-pen',
      date: '2026-01-01',
      excerpt: undefined,   // non-string → trustedRender returns fallback 'No excerpt available'
      url: 'https://example.com/post',
    };

    render(<BlogCard post={post} />);
    expect(screen.getByText('No excerpt available')).toBeInTheDocument();
  });

  it('renders correctly with all valid string fields', () => {
    const post = {
      title: 'Valid Title',
      icon: 'fas fa-star',
      date: '2026-05-01',
      excerpt: 'A valid excerpt',
      url: 'https://valid.com/post',
    };

    render(<BlogCard post={post} />);
    expect(screen.getByText('Valid Title')).toBeInTheDocument();
    expect(screen.getByText('A valid excerpt')).toBeInTheDocument();
    expect(screen.getByText('2026-05-01')).toBeInTheDocument();
  });

  it('falls back to # for url when url is not a valid image URL (invalid URL format)', () => {
    const post = {
      title: 'Post',
      icon: 'fas fa-pen',
      date: '2026-01-01',
      excerpt: 'Excerpt',
      url: 'not-a-url',   // not starting with https?:// → isValidImageUrl returns false → href='#'
    };

    const { container } = render(<BlogCard post={post} />);
    const link = container.querySelector('a');
    expect(link).toHaveAttribute('href', '#');
  });

  it('uses url as href when url passes isValidImageUrl (safe domain)', () => {
    const post = {
      title: 'Post',
      icon: 'fas fa-pen',
      date: '2026-01-01',
      excerpt: 'Excerpt',
      // lh3.googleusercontent.com is in safeDomains → isValidImageUrl returns true
      url: 'https://lh3.googleusercontent.com/post-cover.jpg',
    };

    const { container } = render(<BlogCard post={post} />);
    const link = container.querySelector('a');
    // trustedRender(url, '#') returns htmlEncode(url) ≈ the url string
    expect(link.getAttribute('href')).toContain('lh3.googleusercontent.com');
  });
});
