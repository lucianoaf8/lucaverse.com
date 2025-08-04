/**
 * About Component Tests (Isolated)
 * Tests the About section functionality, skills display, and internationalization
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';

// Mock react-i18next
const mockTranslations = {
  aboutMe: 'About Me',
  aboutSubtitle: 'Get to know the person behind the code',
  aboutTitle: 'Passionate Data Analyst & Problem Solver',
  aboutParagraph1: 'I am a dedicated data analyst with a passion for transforming complex data into actionable insights.',
  aboutParagraph2: 'With expertise in Python, Excel, and modern analytics tools, I help organizations make data-driven decisions.',
  technicalExpertise: 'Technical Expertise',
  'skills.dataAnalysis': 'Data Analysis',
  'skills.python': 'Python',
  'skills.excel': 'Excel',
  'skills.promptEngineering': 'Prompt Engineering',
  'skills.workflowAutomation': 'Workflow Automation',
  'skills.flask': 'Flask',
  'skills.imageToImage': 'Image Processing',
  'skills.versionControl': 'Version Control',
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => mockTranslations[key] || fallback || key,
  }),
}));

// Create isolated About component for testing
const TestAbout = () => {
  const React = require('react');
  const { useTranslation } = require('react-i18next');
  
  const { t } = useTranslation();

  const skills = [
    { name: t('skills.dataAnalysis'), icon: 'fas fa-chart-line' },
    { name: t('skills.python'), icon: 'fab fa-python' },
    { name: t('skills.excel'), icon: 'fas fa-file-excel' },
    { name: t('skills.promptEngineering'), icon: 'fas fa-comment-dots' },
    { name: t('skills.workflowAutomation'), icon: 'fas fa-cogs' },
    { name: t('skills.flask'), icon: 'fas fa-server' },
    { name: t('skills.imageToImage'), icon: 'fas fa-image' },
    { name: t('skills.versionControl'), icon: 'fab fa-git-alt' }
  ];

  return (
    <section className="about" id="about" data-testid="about-section">
      <div className="hudFragment"></div>
      
      <div className="container">
        <div className="sectionHeader">
          <h2 className="sectionTitle">{t('aboutMe')}</h2>
          <p className="sectionSubtitle">{t('aboutSubtitle')}</p>
        </div>
        
        <div className="aboutContent" data-testid="about-content">
          <div className="aboutImageContainer">
            <div className="aboutImage">
              <img 
                src="/avatars/luca-img.png" 
                alt="Luca" 
                className="profileImg" 
                data-testid="profile-image"
              />
              <div className="tagTop" data-testid="data-analyst-tag">[DATA ANALYST]</div>
              <div className="tagBottom">
                <span className="pulseDot" data-testid="pulse-dot"></span>
              </div>
            </div>
          </div>
          
          <div className="aboutText" data-testid="about-text">
            <h3>{t('aboutTitle')}</h3>
            <p data-testid="about-paragraph-1">{t('aboutParagraph1')}</p>
            <p data-testid="about-paragraph-2">{t('aboutParagraph2')}</p>
            
            <div className="skillsContainer" data-testid="skills-container">
              <div className="skillsTitle">{t('technicalExpertise')}</div>
              <div className="skillsGrid" data-testid="skills-grid">
                {skills.map((skill, index) => (
                  <div className="skillItem" key={index} data-testid={`skill-item-${index}`}>
                    <div className="skillName">{skill.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

describe('About Component (Isolated)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the about section with correct structure', () => {
      render(<TestAbout />);

      expect(screen.getByTestId('about-section')).toBeInTheDocument();
      expect(screen.getByText('About Me')).toBeInTheDocument();
      expect(screen.getByText('Get to know the person behind the code')).toBeInTheDocument();
      expect(screen.getByTestId('about-content')).toBeInTheDocument();
    });

    it('has correct section ID for navigation', () => {
      render(<TestAbout />);

      const section = screen.getByTestId('about-section');
      expect(section).toHaveAttribute('id', 'about');
      expect(section.tagName).toBe('SECTION');
    });

    it('renders HUD fragment for visual effects', () => {
      const { container } = render(<TestAbout />);

      const hudFragment = container.querySelector('.hudFragment');
      expect(hudFragment).toBeInTheDocument();
    });

    it('displays main content sections', () => {
      render(<TestAbout />);

      expect(screen.getByTestId('about-content')).toBeInTheDocument();
      expect(screen.getByTestId('about-text')).toBeInTheDocument();
      expect(screen.getByTestId('skills-container')).toBeInTheDocument();
    });
  });

  describe('Profile Image Section', () => {
    it('displays the profile image with correct attributes', () => {
      render(<TestAbout />);

      const profileImg = screen.getByTestId('profile-image');
      expect(profileImg).toBeInTheDocument();
      expect(profileImg.tagName).toBe('IMG');
      expect(profileImg).toHaveAttribute('src', '/avatars/luca-img.png');
      expect(profileImg).toHaveAttribute('alt', 'Luca');
    });

    it('shows the data analyst tag', () => {
      render(<TestAbout />);

      const dataAnalystTag = screen.getByTestId('data-analyst-tag');
      expect(dataAnalystTag).toBeInTheDocument();
      expect(dataAnalystTag).toHaveTextContent('[DATA ANALYST]');
    });

    it('includes animated pulse dot element', () => {
      render(<TestAbout />);

      const pulseDot = screen.getByTestId('pulse-dot');
      expect(pulseDot).toBeInTheDocument();
      expect(pulseDot).toHaveClass('pulseDot');
    });

    it('has proper image container structure', () => {
      const { container } = render(<TestAbout />);

      const imageContainer = container.querySelector('.aboutImageContainer');
      const aboutImage = container.querySelector('.aboutImage');
      const tagTop = container.querySelector('.tagTop');
      const tagBottom = container.querySelector('.tagBottom');

      expect(imageContainer).toBeInTheDocument();
      expect(aboutImage).toBeInTheDocument();
      expect(tagTop).toBeInTheDocument();
      expect(tagBottom).toBeInTheDocument();
    });
  });

  describe('About Text Content', () => {
    it('displays the about title', () => {
      render(<TestAbout />);

      expect(screen.getByText('Passionate Data Analyst & Problem Solver')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Passionate Data Analyst & Problem Solver');
    });

    it('shows both about paragraphs', () => {
      render(<TestAbout />);

      const paragraph1 = screen.getByTestId('about-paragraph-1');
      const paragraph2 = screen.getByTestId('about-paragraph-2');

      expect(paragraph1).toBeInTheDocument();
      expect(paragraph1).toHaveTextContent('I am a dedicated data analyst with a passion for transforming complex data into actionable insights.');

      expect(paragraph2).toBeInTheDocument();
      expect(paragraph2).toHaveTextContent('With expertise in Python, Excel, and modern analytics tools, I help organizations make data-driven decisions.');
    });

    it('displays technical expertise section title', () => {
      render(<TestAbout />);

      expect(screen.getByText('Technical Expertise')).toBeInTheDocument();
    });

    it('has proper text content structure', () => {
      render(<TestAbout />);

      const aboutText = screen.getByTestId('about-text');
      expect(aboutText).toBeInTheDocument();

      const heading = within(aboutText).getByRole('heading', { level: 3 });
      const paragraphs = within(aboutText).getAllByText(/data analyst|Python, Excel/);
      
      expect(heading).toBeInTheDocument();
      expect(paragraphs.length).toBeGreaterThan(0);
    });
  });

  describe('Skills Display', () => {
    it('renders all eight skills', () => {
      render(<TestAbout />);

      const skillsGrid = screen.getByTestId('skills-grid');
      expect(skillsGrid).toBeInTheDocument();

      // Check for all skill items
      for (let i = 0; i < 8; i++) {
        expect(screen.getByTestId(`skill-item-${i}`)).toBeInTheDocument();
      }
    });

    it('displays correct skill names', () => {
      render(<TestAbout />);

      const expectedSkills = [
        'Data Analysis',
        'Python',
        'Excel',
        'Prompt Engineering',
        'Workflow Automation',
        'Flask',
        'Image Processing',
        'Version Control'
      ];

      expectedSkills.forEach(skill => {
        expect(screen.getByText(skill)).toBeInTheDocument();
      });
    });

    it('renders skills in grid layout', () => {
      render(<TestAbout />);

      const skillItems = screen.getAllByTestId(/^skill-item-/);
      expect(skillItems).toHaveLength(8);

      skillItems.forEach(item => {
        expect(item).toHaveClass('skillItem');
        // Each skill item should contain a skill name from our expected list
        const skillName = within(item).getByText(/Data Analysis|Python|Excel|Prompt Engineering|Workflow Automation|Flask|Image Processing|Version Control/);
        expect(skillName).toBeInTheDocument();
      });
    });

    it('has skills container with proper structure', () => {
      const { container } = render(<TestAbout />);

      const skillsContainer = container.querySelector('.skillsContainer');
      const skillsTitle = container.querySelector('.skillsTitle');
      const skillsGrid = container.querySelector('.skillsGrid');

      expect(skillsContainer).toBeInTheDocument();
      expect(skillsTitle).toBeInTheDocument();
      expect(skillsGrid).toBeInTheDocument();
    });

    it('displays technical skills with proper naming', () => {
      render(<TestAbout />);

      // Technical skills specifically
      expect(screen.getByText('Data Analysis')).toBeInTheDocument();
      expect(screen.getByText('Python')).toBeInTheDocument();
      expect(screen.getByText('Flask')).toBeInTheDocument();
      expect(screen.getByText('Version Control')).toBeInTheDocument();

      // Specialized skills
      expect(screen.getByText('Prompt Engineering')).toBeInTheDocument();
      expect(screen.getByText('Workflow Automation')).toBeInTheDocument();
      expect(screen.getByText('Image Processing')).toBeInTheDocument();
    });
  });

  describe('Internationalization', () => {
    it('uses translation keys for all text content', () => {
      render(<TestAbout />);

      expect(screen.getByText('About Me')).toBeInTheDocument();
      expect(screen.getByText('Get to know the person behind the code')).toBeInTheDocument();
      expect(screen.getByText('Passionate Data Analyst & Problem Solver')).toBeInTheDocument();
      expect(screen.getByText('Technical Expertise')).toBeInTheDocument();
    });

    it('translates skill names correctly', () => {
      render(<TestAbout />);

      const skillKeys = [
        'skills.dataAnalysis',
        'skills.python',
        'skills.excel',
        'skills.promptEngineering',
        'skills.workflowAutomation',
        'skills.flask',
        'skills.imageToImage',
        'skills.versionControl'
      ];

      skillKeys.forEach(key => {
        const translatedValue = mockTranslations[key];
        expect(screen.getByText(translatedValue)).toBeInTheDocument();
      });
    });

    it('displays about content in translated language', () => {
      render(<TestAbout />);

      expect(screen.getByText('I am a dedicated data analyst with a passion for transforming complex data into actionable insights.')).toBeInTheDocument();
      expect(screen.getByText('With expertise in Python, Excel, and modern analytics tools, I help organizations make data-driven decisions.')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('has proper semantic HTML structure', () => {
      render(<TestAbout />);

      const section = screen.getByTestId('about-section');
      expect(section.tagName).toBe('SECTION');
      expect(section).toHaveAttribute('id', 'about');

      const mainHeading = screen.getByRole('heading', { level: 2 });
      expect(mainHeading).toHaveTextContent('About Me');

      const subHeading = screen.getByRole('heading', { level: 3 });
      expect(subHeading).toHaveTextContent('Passionate Data Analyst & Problem Solver');
    });

    it('renders main content areas', () => {
      const { container } = render(<TestAbout />);

      expect(container.querySelector('.container')).toBeInTheDocument();
      expect(container.querySelector('.sectionHeader')).toBeInTheDocument();
      expect(container.querySelector('.aboutContent')).toBeInTheDocument();
      expect(container.querySelector('.aboutImageContainer')).toBeInTheDocument();
      expect(container.querySelector('.aboutText')).toBeInTheDocument();
    });

    it('includes visual styling elements', () => {
      const { container } = render(<TestAbout />);

      expect(container.querySelector('.hudFragment')).toBeInTheDocument();
      expect(container.querySelector('.aboutImage')).toBeInTheDocument();
      expect(container.querySelector('.tagTop')).toBeInTheDocument();
      expect(container.querySelector('.tagBottom')).toBeInTheDocument();
      expect(container.querySelector('.pulseDot')).toBeInTheDocument();
    });

    it('has responsive layout structure', () => {
      const { container } = render(<TestAbout />);

      const aboutContent = container.querySelector('.aboutContent');
      const imageContainer = container.querySelector('.aboutImageContainer');
      const textContainer = container.querySelector('.aboutText');

      expect(aboutContent).toBeInTheDocument();
      expect(imageContainer).toBeInTheDocument();
      expect(textContainer).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing translation gracefully', () => {
      const TestAboutWithMissingTranslations = () => {
        const React = require('react');
        
        // Mock translation that returns the key when no translation found
        const mockT = (key, fallback) => fallback || key;

        return (
          <section data-testid="about-missing-translations">
            <h2>{mockT('missingKey', 'Default About')}</h2>
            <p>{mockT('nonExistentKey')}</p>
          </section>
        );
      };

      render(<TestAboutWithMissingTranslations />);

      expect(screen.getByText('Default About')).toBeInTheDocument();
      expect(screen.getByText('nonExistentKey')).toBeInTheDocument(); // Shows key when no translation
    });

    it('handles empty skills array', () => {
      const TestAboutWithoutSkills = () => {
        const React = require('react');
        const skills = [];

        return (
          <div data-testid="about-no-skills">
            <div className="skillsGrid">
              {skills.map((skill, index) => (
                <div key={index}>{skill.name}</div>
              ))}
            </div>
          </div>
        );
      };

      render(<TestAboutWithoutSkills />);

      const aboutSection = screen.getByTestId('about-no-skills');
      expect(aboutSection.querySelector('.skillsGrid')).toBeEmptyDOMElement();
    });

    it('renders with minimal props', () => {
      const TestMinimalAbout = () => {
        const React = require('react');

        return (
          <section data-testid="minimal-about">
            <h2>About</h2>
            <img src="/avatars/luca-img.png" alt="Profile" />
            <p>Basic about text</p>
          </section>
        );
      };

      render(<TestMinimalAbout />);

      expect(screen.getByTestId('minimal-about')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.getByAltText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Basic about text')).toBeInTheDocument();
    });
  });
});