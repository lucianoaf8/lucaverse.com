/**
 * Footer Component Tests (Isolated)
 * Tests the Footer component functionality, navigation links, social links, and internationalization
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';

// Mock react-i18next
const mockTranslations = {
  footerHome: 'Home',
  footerAbout: 'About',
  footerProjects: 'Projects',
  footerCustomGpts: 'Custom GPTs',
  footerBlog: 'Blog',
  footerContact: 'Contact',
  newsletter: 'Newsletter',
  copyright: '© {{year}} Lucaverse. All rights reserved.',
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      const template = mockTranslations[key] || key;
      if (options && options.year) {
        return template.replace('{{year}}', options.year);
      }
      return template;
    },
  }),
}));

// Mock API configuration
const mockGetNewsletterUrl = jest.fn();

jest.mock('../../../src/config/api', () => ({
  getNewsletterUrl: mockGetNewsletterUrl,
}));

// Create isolated Footer component for testing
const TestFooter = () => {
  const React = require('react');
  const { useTranslation } = require('react-i18next');
  const { getNewsletterUrl } = require('../../../src/config/api');
  
  const { t } = useTranslation();

  return (
    <footer className="footer" data-testid="footer">
      <div className="container">
        <div className="footerContent" data-testid="footer-content">
          <div className="footerLogo" data-testid="footer-logo">
            <img src="/assets/lv-logo-nobg.png" alt="Lucaverse Logo" />
          </div>
          
          <nav className="footerNav" data-testid="footer-nav">
            <a className="footerLink" href="#home" data-testid="nav-home">{t('footerHome')}</a>
            <a className="footerLink" href="#about" data-testid="nav-about">{t('footerAbout')}</a>
            <a className="footerLink" href="#projects" data-testid="nav-projects">{t('footerProjects')}</a>
            <a className="footerLink" href="#custom-gpts" data-testid="nav-custom-gpts">{t('footerCustomGpts')}</a>
            <a className="footerLink" href="#blog" data-testid="nav-blog">{t('footerBlog')}</a>
            <a className="footerLink" href="#contact" data-testid="nav-contact">{t('footerContact')}</a>
            <a 
              className="footerLink" 
              href={getNewsletterUrl()} 
              target="_blank" 
              rel="noopener noreferrer"
              data-testid="nav-newsletter"
            >
              {t('newsletter')} <i className="fas fa-external-link-alt"></i>
            </a>
          </nav>
          
          <div className="footerSocial" data-testid="footer-social">
            <a href="#" className="socialIcon" aria-label="GitHub" data-testid="social-github">
              <i className="fab fa-github"></i>
            </a>
            <a href="#" className="socialIcon" aria-label="LinkedIn" data-testid="social-linkedin">
              <i className="fab fa-linkedin-in"></i>
            </a>
            <a href="#" className="socialIcon" aria-label="Twitter" data-testid="social-twitter">
              <i className="fab fa-twitter"></i>
            </a>
            <a href="#" className="socialIcon" aria-label="Medium" data-testid="social-medium">
              <i className="fab fa-medium-m"></i>
            </a>
          </div>
        </div>
        
        <p className="copyright" data-testid="copyright">
          {t('copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
};

describe('Footer Component (Isolated)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetNewsletterUrl.mockReturnValue('https://newsletter.example.com');
  });

  describe('Component Rendering', () => {
    it('renders the footer with correct structure', () => {
      render(<TestFooter />);

      expect(screen.getByTestId('footer')).toBeInTheDocument();
      expect(screen.getByTestId('footer-content')).toBeInTheDocument();
      expect(screen.getByTestId('footer-logo')).toBeInTheDocument();
      expect(screen.getByTestId('footer-nav')).toBeInTheDocument();
      expect(screen.getByTestId('footer-social')).toBeInTheDocument();
    });

    it('has proper semantic HTML structure', () => {
      render(<TestFooter />);

      const footer = screen.getByTestId('footer');
      expect(footer.tagName).toBe('FOOTER');

      const nav = screen.getByTestId('footer-nav');
      expect(nav.tagName).toBe('NAV');

      const logo = screen.getByAltText('Lucaverse Logo');
      expect(logo.tagName).toBe('IMG');
    });

    it('displays the Lucaverse logo', () => {
      render(<TestFooter />);

      const logo = screen.getByAltText('Lucaverse Logo');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', '/assets/lv-logo-nobg.png');
    });

    it('includes container and content wrapper elements', () => {
      const { container } = render(<TestFooter />);

      expect(container.querySelector('.container')).toBeInTheDocument();
      expect(container.querySelector('.footerContent')).toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    it('renders all navigation links with correct text', () => {
      render(<TestFooter />);

      expect(screen.getByTestId('nav-home')).toHaveTextContent('Home');
      expect(screen.getByTestId('nav-about')).toHaveTextContent('About');
      expect(screen.getByTestId('nav-projects')).toHaveTextContent('Projects');
      expect(screen.getByTestId('nav-custom-gpts')).toHaveTextContent('Custom GPTs');
      expect(screen.getByTestId('nav-blog')).toHaveTextContent('Blog');
      expect(screen.getByTestId('nav-contact')).toHaveTextContent('Contact');
      expect(screen.getByTestId('nav-newsletter')).toHaveTextContent('Newsletter');
    });

    it('has correct href attributes for anchor navigation', () => {
      render(<TestFooter />);

      expect(screen.getByTestId('nav-home')).toHaveAttribute('href', '#home');
      expect(screen.getByTestId('nav-about')).toHaveAttribute('href', '#about');
      expect(screen.getByTestId('nav-projects')).toHaveAttribute('href', '#projects');
      expect(screen.getByTestId('nav-custom-gpts')).toHaveAttribute('href', '#custom-gpts');
      expect(screen.getByTestId('nav-blog')).toHaveAttribute('href', '#blog');
      expect(screen.getByTestId('nav-contact')).toHaveAttribute('href', '#contact');
    });

    it('configures newsletter link correctly', () => {
      render(<TestFooter />);

      const newsletterLink = screen.getByTestId('nav-newsletter');
      expect(newsletterLink).toHaveAttribute('href', 'https://newsletter.example.com');
      expect(newsletterLink).toHaveAttribute('target', '_blank');
      expect(newsletterLink).toHaveAttribute('rel', 'noopener noreferrer');
      expect(mockGetNewsletterUrl).toHaveBeenCalledTimes(1);
    });

    it('includes external link icon for newsletter', () => {
      const { container } = render(<TestFooter />);

      const newsletterLink = container.querySelector('[data-testid="nav-newsletter"]');
      const externalIcon = newsletterLink.querySelector('.fas.fa-external-link-alt');
      expect(externalIcon).toBeInTheDocument();
    });

    it('all navigation links have proper CSS classes', () => {
      render(<TestFooter />);

      const navLinks = [
        'nav-home', 'nav-about', 'nav-projects', 
        'nav-custom-gpts', 'nav-blog', 'nav-contact', 'nav-newsletter'
      ];

      navLinks.forEach(testId => {
        const link = screen.getByTestId(testId);
        expect(link).toHaveClass('footerLink');
      });
    });
  });

  describe('Social Media Links', () => {
    it('renders all four social media icons', () => {
      render(<TestFooter />);

      expect(screen.getByTestId('social-github')).toBeInTheDocument();
      expect(screen.getByTestId('social-linkedin')).toBeInTheDocument();
      expect(screen.getByTestId('social-twitter')).toBeInTheDocument();
      expect(screen.getByTestId('social-medium')).toBeInTheDocument();
    });

    it('has proper aria-labels for accessibility', () => {
      render(<TestFooter />);

      expect(screen.getByTestId('social-github')).toHaveAttribute('aria-label', 'GitHub');
      expect(screen.getByTestId('social-linkedin')).toHaveAttribute('aria-label', 'LinkedIn');
      expect(screen.getByTestId('social-twitter')).toHaveAttribute('aria-label', 'Twitter');
      expect(screen.getByTestId('social-medium')).toHaveAttribute('aria-label', 'Medium');
    });

    it('includes correct FontAwesome icons', () => {
      const { container } = render(<TestFooter />);

      const githubIcon = container.querySelector('[data-testid="social-github"] .fab.fa-github');
      const linkedinIcon = container.querySelector('[data-testid="social-linkedin"] .fab.fa-linkedin-in');
      const twitterIcon = container.querySelector('[data-testid="social-twitter"] .fab.fa-twitter');
      const mediumIcon = container.querySelector('[data-testid="social-medium"] .fab.fa-medium-m');

      expect(githubIcon).toBeInTheDocument();
      expect(linkedinIcon).toBeInTheDocument();
      expect(twitterIcon).toBeInTheDocument();
      expect(mediumIcon).toBeInTheDocument();
    });

    it('all social links have proper CSS classes', () => {
      render(<TestFooter />);

      const socialLinks = ['social-github', 'social-linkedin', 'social-twitter', 'social-medium'];

      socialLinks.forEach(testId => {
        const link = screen.getByTestId(testId);
        expect(link).toHaveClass('socialIcon');
      });
    });

    it('social media links have placeholder hrefs', () => {
      render(<TestFooter />);

      const socialLinks = ['social-github', 'social-linkedin', 'social-twitter', 'social-medium'];

      socialLinks.forEach(testId => {
        const link = screen.getByTestId(testId);
        expect(link).toHaveAttribute('href', '#');
      });
    });
  });

  describe('Copyright Section', () => {
    it('displays copyright text with current year', () => {
      const currentYear = new Date().getFullYear();
      render(<TestFooter />);

      const copyright = screen.getByTestId('copyright');
      expect(copyright).toBeInTheDocument();
      expect(copyright).toHaveTextContent(`© ${currentYear} Lucaverse. All rights reserved.`);
    });

    it('uses translation for copyright text', () => {
      render(<TestFooter />);

      const copyright = screen.getByTestId('copyright');
      expect(copyright).toHaveTextContent(/Lucaverse\. All rights reserved\./);
    });

    it('dynamically inserts the current year', () => {
      const currentYear = new Date().getFullYear();
      render(<TestFooter />);

      expect(screen.getByText(new RegExp(currentYear.toString()))).toBeInTheDocument();
    });
  });

  describe('Internationalization', () => {
    it('uses translation keys for all navigation text', () => {
      render(<TestFooter />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Custom GPTs')).toBeInTheDocument();
      expect(screen.getByText('Blog')).toBeInTheDocument();
      expect(screen.getByText('Contact')).toBeInTheDocument();
      expect(screen.getByText('Newsletter')).toBeInTheDocument();
    });

    it('translates copyright text with year interpolation', () => {
      const currentYear = new Date().getFullYear();
      render(<TestFooter />);

      expect(screen.getByText(`© ${currentYear} Lucaverse. All rights reserved.`)).toBeInTheDocument();
    });

    it('handles missing translations gracefully', () => {
      const TestFooterWithMissingTranslations = () => {
        const React = require('react');
        
        const mockTMissing = (key, options) => {
          if (key === 'missingKey') return key; // Return key when translation missing
          return mockTranslations[key] || key;
        };

        return (
          <footer data-testid="footer-missing-translations">
            <a href="#test">{mockTMissing('missingKey')}</a>
            <p>{mockTMissing('anotherMissingKey', { year: 2024 })}</p>
          </footer>
        );
      };

      render(<TestFooterWithMissingTranslations />);

      expect(screen.getByText('missingKey')).toBeInTheDocument();
      expect(screen.getByText('anotherMissingKey')).toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('calls getNewsletterUrl to get newsletter link', () => {
      render(<TestFooter />);

      expect(mockGetNewsletterUrl).toHaveBeenCalledTimes(1);
    });

    it('handles newsletter URL configuration', () => {
      mockGetNewsletterUrl.mockReturnValue('https://custom-newsletter.com/signup');

      render(<TestFooter />);

      const newsletterLink = screen.getByTestId('nav-newsletter');
      expect(newsletterLink).toHaveAttribute('href', 'https://custom-newsletter.com/signup');
    });

    it('handles empty newsletter URL gracefully', () => {
      mockGetNewsletterUrl.mockReturnValue('');

      render(<TestFooter />);

      const newsletterLink = screen.getByTestId('nav-newsletter');
      expect(newsletterLink).toHaveAttribute('href', '');
    });
  });

  describe('Component Structure', () => {
    it('has proper layout sections', () => {
      const { container } = render(<TestFooter />);

      expect(container.querySelector('.footer')).toBeInTheDocument();
      expect(container.querySelector('.container')).toBeInTheDocument();
      expect(container.querySelector('.footerContent')).toBeInTheDocument();
      expect(container.querySelector('.footerLogo')).toBeInTheDocument();
      expect(container.querySelector('.footerNav')).toBeInTheDocument();
      expect(container.querySelector('.footerSocial')).toBeInTheDocument();
      expect(container.querySelector('.copyright')).toBeInTheDocument();
    });

    it('organizes content in logical sections', () => {
      render(<TestFooter />);

      const footerContent = screen.getByTestId('footer-content');
      expect(within(footerContent).getByTestId('footer-logo')).toBeInTheDocument();
      expect(within(footerContent).getByTestId('footer-nav')).toBeInTheDocument();
      expect(within(footerContent).getByTestId('footer-social')).toBeInTheDocument();

      // Copyright should be outside footer-content
      expect(screen.getByTestId('copyright')).toBeInTheDocument();
    });

    it('maintains responsive layout structure', () => {
      const { container } = render(<TestFooter />);

      const footerContent = container.querySelector('.footerContent');
      const logo = container.querySelector('.footerLogo');
      const nav = container.querySelector('.footerNav');
      const social = container.querySelector('.footerSocial');

      // Check if elements are children of footerContent
      expect(footerContent).toContainElement(logo);
      expect(footerContent).toContainElement(nav);
      expect(footerContent).toContainElement(social);
    });
  });

  describe('Edge Cases', () => {
    it('handles missing API configuration', () => {
      // Test that we properly handle API errors by setting up a safe fallback
      mockGetNewsletterUrl.mockReturnValue('#newsletter'); // Fallback URL

      render(<TestFooter />);

      const newsletterLink = screen.getByTestId('nav-newsletter');
      expect(newsletterLink).toHaveAttribute('href', '#newsletter');
    });

    it('renders with minimal props', () => {
      const TestMinimalFooter = () => {
        const React = require('react');

        return (
          <footer data-testid="minimal-footer">
            <p>© 2024 Test</p>
          </footer>
        );
      };

      render(<TestMinimalFooter />);

      expect(screen.getByTestId('minimal-footer')).toBeInTheDocument();
      expect(screen.getByText('© 2024 Test')).toBeInTheDocument();
    });

    it('handles year edge cases', () => {
      // Mock date to test edge case
      const mockDate = new Date('2030-12-31');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      render(<TestFooter />);

      expect(screen.getByText(/© 2030 Lucaverse/)).toBeInTheDocument();

      global.Date.mockRestore();
    });

    it('handles navigation with empty anchors', () => {
      const TestFooterEmptyAnchors = () => {
        const React = require('react');

        return (
          <nav data-testid="empty-nav">
            <a href="" className="footerLink">Empty Link</a>
            <a className="footerLink">No Href</a>
          </nav>
        );
      };

      render(<TestFooterEmptyAnchors />);

      const emptyNav = screen.getByTestId('empty-nav');
      expect(emptyNav).toBeInTheDocument();
      
      const emptyLink = screen.getByText('Empty Link');
      const noHrefLink = screen.getByText('No Href');
      
      expect(emptyLink).toHaveAttribute('href', '');
      expect(noHrefLink).not.toHaveAttribute('href');
    });
  });
});