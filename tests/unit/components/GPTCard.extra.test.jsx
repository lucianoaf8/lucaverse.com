/**
 * Extra GPTCard tests to cover:
 * - trustedRender fallback branch (typeof content !== 'string' || !content)
 * - links.map() when URL is invalid → returns null (line 32: if (!isValidUrl) return null)
 * - tags rendering when tags is not an array → null
 * - links rendering when links is not an array → null
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import GPTCard from '../../../src/components/CustomGPTs/GPTCard';

describe('GPTCard — extra coverage', () => {
  describe('trustedRender fallback branch', () => {
    it('uses fallback for icon when icon is undefined (non-string)', () => {
      const gpt = {
        title: 'My GPT',
        icon: undefined,    // non-string → fallback 'fas fa-robot'
        tags: [],
        description: 'A description',
        links: [],
      };

      const { container } = render(<GPTCard gpt={gpt} />);
      const iconEl = container.querySelector('i');
      expect(iconEl.className).toContain('fas fa-robot');
    });

    it('uses fallback for title when title is empty string', () => {
      const gpt = {
        title: '',          // falsy → fallback 'Untitled GPT'
        icon: 'fas fa-robot',
        tags: [],
        description: 'A description',
        links: [],
      };

      render(<GPTCard gpt={gpt} />);
      expect(screen.getByText('Untitled GPT')).toBeInTheDocument();
    });

    it('uses fallback for description when description is null', () => {
      const gpt = {
        title: 'My GPT',
        icon: 'fas fa-robot',
        tags: [],
        description: null,  // non-string → fallback 'No description available'
        links: [],
      };

      render(<GPTCard gpt={gpt} />);
      expect(screen.getByText('No description available')).toBeInTheDocument();
    });
  });

  describe('links.map() — invalid URL returns null (lines 32-33)', () => {
    it('skips rendering link when link.url is invalid', () => {
      const gpt = {
        title: 'TestGPT',
        icon: 'fas fa-robot',
        tags: ['AI'],
        description: 'Test',
        links: [
          { url: 'not-a-valid-url', icon: 'fas fa-link', text: 'Invalid Link' },  // invalid → null
          // lh3.googleusercontent.com is in safeDomains → valid
          { url: 'https://lh3.googleusercontent.com/photo.jpg', icon: 'fas fa-link', text: 'Valid Link' },
        ],
      };

      render(<GPTCard gpt={gpt} />);
      // Only the valid link should render; invalid returns null
      expect(screen.getByText('Valid Link')).toBeInTheDocument();
      expect(screen.queryByText('Invalid Link')).not.toBeInTheDocument();
    });

    it('skips rendering link when link.url is missing (undefined)', () => {
      const gpt = {
        title: 'TestGPT',
        icon: 'fas fa-robot',
        tags: [],
        description: 'Test',
        links: [
          { url: undefined, icon: 'fas fa-link', text: 'Missing URL' },  // url falsy → invalid
        ],
      };

      render(<GPTCard gpt={gpt} />);
      // The link with missing URL returns null from map
      expect(screen.queryByText('Missing URL')).not.toBeInTheDocument();
    });

    it('skips rendering link when link.url is not a string', () => {
      const gpt = {
        title: 'TestGPT',
        icon: 'fas fa-robot',
        tags: [],
        description: 'Test',
        links: [
          { url: 42, icon: 'fas fa-link', text: 'Number URL' },  // non-string → invalid
        ],
      };

      render(<GPTCard gpt={gpt} />);
      expect(screen.queryByText('Number URL')).not.toBeInTheDocument();
    });
  });

  describe('non-array tags → renders null', () => {
    it('renders no tag spans when tags is not an array', () => {
      const gpt = {
        title: 'TestGPT',
        icon: 'fas fa-robot',
        tags: 'not-an-array',  // non-array → null branch in JSX
        description: 'Test',
        links: [],
      };

      const { container } = render(<GPTCard gpt={gpt} />);
      // No span elements for tags
      const tagSpans = container.querySelectorAll('[class*="gptTag"]');
      expect(tagSpans).toHaveLength(0);
    });
  });

  describe('non-array links → renders null', () => {
    it('renders no link anchors when links is not an array', () => {
      const gpt = {
        title: 'TestGPT',
        icon: 'fas fa-robot',
        tags: [],
        description: 'Test',
        links: 'not-an-array',  // non-array → null branch in JSX
      };

      const { container } = render(<GPTCard gpt={gpt} />);
      const linkAnchors = container.querySelectorAll('a');
      expect(linkAnchors).toHaveLength(0);
    });
  });

  describe('valid full GPT data', () => {
    it('renders all fields correctly with valid data', () => {
      const gpt = {
        title: 'PythonGPT',
        icon: 'fas fa-python',
        tags: ['Python', 'Coding'],
        description: 'Python expert',
        // Use a safe domain URL so isValidImageUrl returns true
        links: [
          { url: 'https://lh3.googleusercontent.com/python-icon.jpg', icon: 'fas fa-link', text: 'Try It' },
        ],
      };

      render(<GPTCard gpt={gpt} />);
      expect(screen.getByText('PythonGPT')).toBeInTheDocument();
      expect(screen.getByText('Python expert')).toBeInTheDocument();
      expect(screen.getByText('Python')).toBeInTheDocument();
      expect(screen.getByText('Try It')).toBeInTheDocument();
    });
  });
});
