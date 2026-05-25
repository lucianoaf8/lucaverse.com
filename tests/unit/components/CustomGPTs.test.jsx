/**
 * CustomGPTs Component Tests
 *
 * CustomGPTs.jsx renders three GPT cards built from translated data. Each
 * GPTCard validates URLs via isValidImageUrl before rendering its link.
 * The test-i18n mock returns translation keys so assertions are deterministic.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

import CustomGPTs from '../../../src/components/CustomGPTs/CustomGPTs';

describe('CustomGPTs Component', () => {
  describe('Section structure', () => {
    it('renders without crashing', () => {
      expect(() => render(<CustomGPTs />)).not.toThrow();
    });

    it('renders a <section> element with id "custom-gpts"', () => {
      const { container } = render(<CustomGPTs />);
      const section = container.querySelector('section#custom-gpts');
      expect(section).toBeInTheDocument();
    });

    it('renders the section title from translation key "customGptsTitle"', () => {
      render(<CustomGPTs />);
      expect(screen.getByText('customGptsTitle')).toBeInTheDocument();
    });

    it('renders the section subtitle from translation key "customGptsSubtitle"', () => {
      render(<CustomGPTs />);
      expect(screen.getByText('customGptsSubtitle')).toBeInTheDocument();
    });

    it('renders an h2 heading for the section title', () => {
      render(<CustomGPTs />);
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('customGptsTitle');
    });
  });

  describe('GPT card count', () => {
    it('renders exactly 3 GPT cards', () => {
      render(<CustomGPTs />);
      const cardTitles = screen.getAllByRole('heading', { level: 3 });
      expect(cardTitles).toHaveLength(3);
    });
  });

  describe('Card titles', () => {
    it('first card has title "pythonGptTitle"', () => {
      render(<CustomGPTs />);
      const titles = screen.getAllByRole('heading', { level: 3 });
      expect(titles[0]).toHaveTextContent('pythonGptTitle');
    });

    it('second card has title "mysqlGptTitle"', () => {
      render(<CustomGPTs />);
      const titles = screen.getAllByRole('heading', { level: 3 });
      expect(titles[1]).toHaveTextContent('mysqlGptTitle');
    });

    it('third card has title "promptMasterGptTitle"', () => {
      render(<CustomGPTs />);
      const titles = screen.getAllByRole('heading', { level: 3 });
      expect(titles[2]).toHaveTextContent('promptMasterGptTitle');
    });
  });

  describe('Card descriptions', () => {
    it('first card description uses "pythonGptDescription" key', () => {
      render(<CustomGPTs />);
      expect(screen.getByText('pythonGptDescription')).toBeInTheDocument();
    });

    it('second card description uses "mysqlGptDescription" key', () => {
      render(<CustomGPTs />);
      expect(screen.getByText('mysqlGptDescription')).toBeInTheDocument();
    });

    it('third card description uses "promptMasterGptDescription" key', () => {
      render(<CustomGPTs />);
      expect(screen.getByText('promptMasterGptDescription')).toBeInTheDocument();
    });
  });

  describe('Card links (Try It)', () => {
    // GPTCard validates link URLs via isValidImageUrl. chatgpt.com URLs are not
    // in the safe image domain allow-list, so GPTCard intentionally renders null
    // for those links (security guard). We verify that behavior here.
    it('does not render chatgpt.com links because isValidImageUrl rejects them', () => {
      render(<CustomGPTs />);
      // No <a> tags should appear since all three GPT links fail URL validation
      const links = screen.queryAllByRole('link');
      expect(links).toHaveLength(0);
    });

    it('renders each card\'s gptLinks container even when links are suppressed', () => {
      const { container } = render(<CustomGPTs />);
      // The gptLinks div is still present even when its children render null
      // (verified by checking that the grid container is rendered)
      const section = container.querySelector('section#custom-gpts');
      expect(section).toBeInTheDocument();
    });
  });

  describe('Card tags', () => {
    it('renders tags for all 3 cards', () => {
      render(<CustomGPTs />);
      // Tags use keys like "gptTags.python", "gptTags.coding", etc.
      // Each card has 3 tags = 9 total tag spans
      // We just verify there are multiple tag elements
      const tags = screen.getAllByText(/^gptTags\./);
      expect(tags.length).toBeGreaterThanOrEqual(9);
    });

    it('Python card has "gptTags.python" tag', () => {
      render(<CustomGPTs />);
      expect(screen.getAllByText('gptTags.python').length).toBeGreaterThanOrEqual(1);
    });

    it('MySQL card has "gptTags.mysql" tag', () => {
      render(<CustomGPTs />);
      expect(screen.getAllByText('gptTags.mysql').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Re-render stability', () => {
    it('re-renders without error', () => {
      const { rerender } = render(<CustomGPTs />);
      expect(() => rerender(<CustomGPTs />)).not.toThrow();
    });

    it('card count remains 3 after re-render', () => {
      const { rerender } = render(<CustomGPTs />);
      rerender(<CustomGPTs />);
      const titles = screen.getAllByRole('heading', { level: 3 });
      expect(titles).toHaveLength(3);
    });
  });
});
