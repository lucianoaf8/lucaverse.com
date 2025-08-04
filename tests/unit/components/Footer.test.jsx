/**
 * Footer Component Tests
 * Tests the real Footer component from src/components/Footer/Footer.jsx
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import Footer from '../../../src/components/Footer/Footer';

// Mock react-i18next
const mockTranslations = {
  footerHome: 'Home',
  footerAbout: 'About',
  footerProjects: 'Projects',
  footerCustomGpts: 'Custom GPTs',
  footerBlog: 'Blog',
  footerContact: 'Contact',
  newsletter: 'Newsletter',
  footerQuickLinks: 'Quick Links',
  footerLegalInfo: 'Legal Information',
  footerConnect: 'Connect',
  footerCopyright: '© 2024 Lucaverse. All rights reserved.',
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => mockTranslations[key] || fallback || key,
  }),
}));

// Mock API config
jest.mock('../../../src/config/api', () => ({
  getNewsletterUrl: jest.fn(() => 'https://newsletter.example.com'),
}));

describe('Footer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the footer with correct structure', () => {
      render(<Footer />);

      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      expect(screen.getByAltText('Lucaverse Logo')).toBeInTheDocument();
    });

    it('displays footer logo', () => {
      render(<Footer />);

      const logo = screen.getByAltText('Lucaverse Logo');
      expect(logo).toHaveAttribute('src', '/assets/lv-logo-nobg.png');
    });
  });

  describe('Navigation Links', () => {
    it('renders all main navigation links', () => {
      render(<Footer />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Custom GPTs')).toBeInTheDocument();
      expect(screen.getByText('Blog')).toBeInTheDocument();
      expect(screen.getByText('Contact')).toBeInTheDocument();
    });

    it('has correct href attributes for navigation links', () => {
      render(<Footer />);

      expect(screen.getByText('Home')).toHaveAttribute('href', '#home');
      expect(screen.getByText('About')).toHaveAttribute('href', '#about');
      expect(screen.getByText('Projects')).toHaveAttribute('href', '#projects');
      expect(screen.getByText('Custom GPTs')).toHaveAttribute('href', '#custom-gpts');
      expect(screen.getByText('Blog')).toHaveAttribute('href', '#blog');
      expect(screen.getByText('Contact')).toHaveAttribute('href', '#contact');
    });

    it('renders newsletter link with external link icon', () => {
      render(<Footer />);

      const newsletterLink = screen.getByText(/Newsletter/);
      expect(newsletterLink).toBeInTheDocument();
      expect(newsletterLink).toHaveAttribute('href', 'https://newsletter.example.com');
      expect(newsletterLink).toHaveAttribute('target', '_blank');
      expect(newsletterLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Social Media Links', () => {
    it('includes social media icons with proper accessibility', () => {
      render(<Footer />);

      // Check for social media links with aria-labels
      const socialLinks = screen.getAllByRole('link');
      const socialIconLinks = socialLinks.filter(link => 
        link.getAttribute('aria-label') && 
        (link.getAttribute('aria-label').includes('GitHub') || 
         link.getAttribute('aria-label').includes('LinkedIn') ||
         link.getAttribute('aria-label').includes('Twitter'))
      );
      
      expect(socialIconLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Internationalization', () => {
    it('uses translation keys for all navigation text', () => {
      render(<Footer />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Newsletter')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('has proper semantic HTML structure', () => {
      render(<Footer />);

      const footer = screen.getByRole('contentinfo');
      expect(footer.tagName).toBe('FOOTER');

      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('contains all main footer sections', () => {
      const { container } = render(<Footer />);

      // Check for main structural elements that should exist based on typical footer patterns
      expect(container.querySelector('footer')).toBeInTheDocument();
      expect(screen.getByAltText('Lucaverse Logo')).toBeInTheDocument();
    });
  });
});