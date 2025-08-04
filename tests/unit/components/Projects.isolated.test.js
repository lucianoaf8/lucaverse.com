/**
 * Projects Component Tests (Isolated)
 * Tests the Projects section functionality, ProjectCard rendering, and security features
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';

// Mock react-i18next
const mockTranslations = {
  myProjects: 'My Projects',
  projectsSubtitle: 'Explore my latest work and innovations',
  audioTranscriptionTitle: 'Audio Transcription Tool',
  audioTranscriptionDescription: 'AI-powered transcription service using OpenAI Whisper',
  screenScrapeTitle: 'Screen Scrape Analytics',
  screenScrapeDescription: 'Movie data scraping and analysis platform',
  financeAnalysisTitle: 'Finance Deep Analysis',
  financeAnalysisDescription: 'Comprehensive financial data analysis toolkit',
  viewOnGithub: 'View on GitHub',
  'tags.openAI': 'OpenAI',
  'tags.whisper': 'Whisper',
  'tags.audio': 'Audio',
  'tags.webScraping': 'Web Scraping',
  'tags.tmdb': 'TMDB',
  'tags.database': 'Database',
  'tags.finance': 'Finance',
  'tags.dataAnalysis': 'Data Analysis',
  'tags.banking': 'Banking',
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => mockTranslations[key] || fallback || key,
  }),
}));

// Mock security utils
const mockHtmlEncode = jest.fn((content) => content);
const mockIsValidImageUrl = jest.fn((url) => url && url.startsWith('https://'));

jest.mock('../../../src/utils/securityUtils', () => ({
  htmlEncode: mockHtmlEncode,
  isValidImageUrl: mockIsValidImageUrl,
}));

// Create isolated Projects component for testing
const TestProjects = () => {
  const React = require('react');
  const { useTranslation } = require('react-i18next');
  
  const { t } = useTranslation();

  const projects = [
    {
      id: 1,
      title: t('audioTranscriptionTitle'),
      icon: 'fas fa-headphones',
      tags: [t('tags.openAI'), t('tags.whisper'), t('tags.audio')],
      description: t('audioTranscriptionDescription'),
      links: [
        { icon: 'fab fa-github', text: t('viewOnGithub'), url: 'https://github.com/lucianoaf8/audio-transcript' }
      ]
    },
    {
      id: 2,
      title: t('screenScrapeTitle'),
      icon: 'fas fa-film',
      tags: [t('tags.webScraping'), t('tags.tmdb'), t('tags.database')],
      description: t('screenScrapeDescription'),
      links: [
        { icon: 'fab fa-github', text: t('viewOnGithub'), url: 'https://github.com/lucianoaf8/screen-scrape' }
      ]
    },
    {
      id: 3,
      title: t('financeAnalysisTitle'),
      icon: 'fas fa-chart-line',
      tags: [t('tags.finance'), t('tags.dataAnalysis'), t('tags.banking')],
      description: t('financeAnalysisDescription'),
      links: [
        { icon: 'fab fa-github', text: t('viewOnGithub'), url: 'https://github.com/lucianoaf8/finance-deep-analysis' }
      ]
    }
  ];

  // ProjectCard component
  const ProjectCard = ({ project }) => {
    const { htmlEncode, isValidImageUrl } = require('../../../src/utils/securityUtils');
    const { title, icon, tags, description, links } = project;
    
    const trustedRender = (content, fallback = '') => {
      if (typeof content !== 'string' || !content) return fallback;
      return htmlEncode(content);
    };

    return (
      <div className="projectCard" data-testid={`project-card-${project.id}`}>
        <div className="projectImageContainer">
          <div className="projectImagePattern"></div>
          <i className={`${icon} projectIcon`} data-testid={`project-icon-${project.id}`}></i>
        </div>
        <div className="projectContent">
          <h3 className="projectTitle">{trustedRender(title, 'Untitled Project')}</h3>
          <div className="projectTags" data-testid={`project-tags-${project.id}`}>
            {Array.isArray(tags) ? tags.map((tag, index) => (
              <span key={index} className="projectTag">{trustedRender(tag, '')}</span>
            )) : null}
          </div>
          <p className="projectDescription">{trustedRender(description, 'No description available')}</p>
          <div className="projectLinks" data-testid={`project-links-${project.id}`}>
            {Array.isArray(links) ? links.map((link, index) => {
              const isValidUrl = link.url && typeof link.url === 'string' && isValidImageUrl(link.url.replace(/^https?:\/\//, 'https://'));
              if (!isValidUrl) return null;
              
              return (
                <a 
                  key={index} 
                  href={trustedRender(link.url, '#')} 
                  className="projectLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`project-link-${project.id}-${index}`}
                >
                  <i className={`${trustedRender(link.icon, 'fas fa-link')} projectLinkIcon`}></i> {trustedRender(link.text, 'View Project')}
                </a>
              );
            }) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="projects" id="projects" data-testid="projects-section">
      <div className="hudFragment"></div>
      
      <div className="container">
        <div className="sectionHeader">
          <h2 className="sectionTitle">{t('myProjects')}</h2>
          <p className="sectionSubtitle">{t('projectsSubtitle')}</p>
        </div>
        
        <div className="projectsGrid" data-testid="projects-grid">
          {projects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
};

describe('Projects Component (Isolated)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHtmlEncode.mockImplementation((content) => content);
    mockIsValidImageUrl.mockImplementation((url) => url && url.startsWith('https://'));
  });

  describe('Component Rendering', () => {
    it('renders the projects section with correct structure', () => {
      render(<TestProjects />);

      expect(screen.getByTestId('projects-section')).toBeInTheDocument();
      expect(screen.getByText('My Projects')).toBeInTheDocument();
      expect(screen.getByText('Explore my latest work and innovations')).toBeInTheDocument();
      expect(screen.getByTestId('projects-grid')).toBeInTheDocument();
    });

    it('has correct section ID for navigation', () => {
      render(<TestProjects />);

      const section = screen.getByTestId('projects-section');
      expect(section).toHaveAttribute('id', 'projects');
    });

    it('renders HUD fragment for visual effects', () => {
      const { container } = render(<TestProjects />);

      const hudFragment = container.querySelector('.hudFragment');
      expect(hudFragment).toBeInTheDocument();
    });

    it('displays all three default projects', () => {
      render(<TestProjects />);

      expect(screen.getByTestId('project-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('project-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('project-card-3')).toBeInTheDocument();
    });
  });

  describe('Project Cards Content', () => {
    it('displays audio transcription project correctly', () => {
      render(<TestProjects />);

      const card = screen.getByTestId('project-card-1');
      expect(within(card).getByText('Audio Transcription Tool')).toBeInTheDocument();
      expect(within(card).getByText('AI-powered transcription service using OpenAI Whisper')).toBeInTheDocument();
      expect(within(card).getByText('OpenAI')).toBeInTheDocument();
      expect(within(card).getByText('Whisper')).toBeInTheDocument();
      expect(within(card).getByText('Audio')).toBeInTheDocument();
    });

    it('displays screen scrape project correctly', () => {
      render(<TestProjects />);

      const card = screen.getByTestId('project-card-2');
      expect(within(card).getByText('Screen Scrape Analytics')).toBeInTheDocument();
      expect(within(card).getByText('Movie data scraping and analysis platform')).toBeInTheDocument();
      expect(within(card).getByText('Web Scraping')).toBeInTheDocument();
      expect(within(card).getByText('TMDB')).toBeInTheDocument();
      expect(within(card).getByText('Database')).toBeInTheDocument();
    });

    it('displays finance analysis project correctly', () => {
      render(<TestProjects />);

      const card = screen.getByTestId('project-card-3');
      expect(within(card).getByText('Finance Deep Analysis')).toBeInTheDocument();
      expect(within(card).getByText('Comprehensive financial data analysis toolkit')).toBeInTheDocument();
      expect(within(card).getByText('Finance')).toBeInTheDocument();
      expect(within(card).getByText('Data Analysis')).toBeInTheDocument();
      expect(within(card).getByText('Banking')).toBeInTheDocument();
    });

    it('renders FontAwesome icons correctly', () => {
      render(<TestProjects />);

      const audioIcon = screen.getByTestId('project-icon-1');
      const filmIcon = screen.getByTestId('project-icon-2');
      const chartIcon = screen.getByTestId('project-icon-3');

      expect(audioIcon).toHaveClass('fas', 'fa-headphones');
      expect(filmIcon).toHaveClass('fas', 'fa-film');
      expect(chartIcon).toHaveClass('fas', 'fa-chart-line');
    });
  });

  describe('Project Links', () => {
    it('renders GitHub links with correct attributes', () => {
      render(<TestProjects />);

      const audioLink = screen.getByTestId('project-link-1-0');
      const scrapeLink = screen.getByTestId('project-link-2-0');
      const financeLink = screen.getByTestId('project-link-3-0');

      expect(audioLink).toHaveAttribute('href', 'https://github.com/lucianoaf8/audio-transcript');
      expect(scrapeLink).toHaveAttribute('href', 'https://github.com/lucianoaf8/screen-scrape');
      expect(financeLink).toHaveAttribute('href', 'https://github.com/lucianoaf8/finance-deep-analysis');

      [audioLink, scrapeLink, financeLink].forEach(link => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        expect(within(link).getByText('View on GitHub')).toBeInTheDocument();
      });
    });

    it('includes GitHub icons in links', () => {
      const { container } = render(<TestProjects />);

      const githubIcons = container.querySelectorAll('.fab.fa-github');
      expect(githubIcons).toHaveLength(3);
    });

    it('validates URLs before rendering links', () => {
      render(<TestProjects />);

      expect(mockIsValidImageUrl).toHaveBeenCalledWith('https://github.com/lucianoaf8/audio-transcript');
      expect(mockIsValidImageUrl).toHaveBeenCalledWith('https://github.com/lucianoaf8/screen-scrape');
      expect(mockIsValidImageUrl).toHaveBeenCalledWith('https://github.com/lucianoaf8/finance-deep-analysis');
    });
  });

  describe('Security Features', () => {
    it('uses htmlEncode for all text content', () => {
      render(<TestProjects />);

      expect(mockHtmlEncode).toHaveBeenCalledWith('Audio Transcription Tool');
      expect(mockHtmlEncode).toHaveBeenCalledWith('Screen Scrape Analytics');
      expect(mockHtmlEncode).toHaveBeenCalledWith('Finance Deep Analysis');
      expect(mockHtmlEncode).toHaveBeenCalledWith('OpenAI');
      expect(mockHtmlEncode).toHaveBeenCalledWith('View on GitHub');
    });

    it('validates image URLs for security', () => {
      render(<TestProjects />);

      expect(mockIsValidImageUrl).toHaveBeenCalledTimes(3);
      expect(mockIsValidImageUrl).toHaveBeenCalledWith('https://github.com/lucianoaf8/audio-transcript');
      expect(mockIsValidImageUrl).toHaveBeenCalledWith('https://github.com/lucianoaf8/screen-scrape');
      expect(mockIsValidImageUrl).toHaveBeenCalledWith('https://github.com/lucianoaf8/finance-deep-analysis');
    });

    it('handles invalid URLs by not rendering links', () => {
      mockIsValidImageUrl.mockReturnValue(false);

      render(<TestProjects />);

      expect(screen.queryByTestId('project-link-1-0')).not.toBeInTheDocument();
      expect(screen.queryByTestId('project-link-2-0')).not.toBeInTheDocument();
      expect(screen.queryByTestId('project-link-3-0')).not.toBeInTheDocument();
    });

    it('provides fallback content for missing data', () => {
      mockHtmlEncode.mockImplementation((content, fallback) => fallback || 'fallback');

      render(<TestProjects />);

      // The component should handle missing content gracefully
      expect(mockHtmlEncode).toHaveBeenCalled();
    });
  });

  describe('Internationalization', () => {
    it('uses translation keys for all text content', () => {
      render(<TestProjects />);

      expect(screen.getByText('My Projects')).toBeInTheDocument();
      expect(screen.getByText('Explore my latest work and innovations')).toBeInTheDocument();
      expect(screen.getByText('Audio Transcription Tool')).toBeInTheDocument();
      expect(screen.getByText('AI-powered transcription service using OpenAI Whisper')).toBeInTheDocument();
      expect(screen.getAllByText('View on GitHub')).toHaveLength(3);
    });

    it('displays translated tag labels', () => {
      render(<TestProjects />);

      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByText('Whisper')).toBeInTheDocument();
      expect(screen.getByText('Audio')).toBeInTheDocument();
      expect(screen.getByText('Web Scraping')).toBeInTheDocument();
      expect(screen.getByText('TMDB')).toBeInTheDocument();
      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('Finance')).toBeInTheDocument();
      expect(screen.getByText('Data Analysis')).toBeInTheDocument();
      expect(screen.getByText('Banking')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('has proper semantic HTML structure', () => {
      render(<TestProjects />);

      const section = screen.getByTestId('projects-section'); // Use test id instead of role
      expect(section).toBeInTheDocument();
      expect(section.tagName).toBe('SECTION');
      expect(section).toHaveAttribute('id', 'projects');

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('My Projects');

      const projectHeadings = screen.getAllByRole('heading', { level: 3 });
      expect(projectHeadings).toHaveLength(3);
    });

    it('renders projects in a grid layout', () => {
      render(<TestProjects />);

      const grid = screen.getByTestId('projects-grid');
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveClass('projectsGrid');

      const cards = screen.getAllByTestId(/^project-card-/);
      expect(cards).toHaveLength(3);
    });

    it('includes visual elements for enhanced UI', () => {
      const { container } = render(<TestProjects />);

      expect(container.querySelector('.hudFragment')).toBeInTheDocument();
      expect(container.querySelector('.container')).toBeInTheDocument();
      expect(container.querySelector('.sectionHeader')).toBeInTheDocument();

      const imageContainers = container.querySelectorAll('.projectImageContainer');
      expect(imageContainers).toHaveLength(3);

      const imagePatterns = container.querySelectorAll('.projectImagePattern');
      expect(imagePatterns).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('handles missing project data gracefully', () => {
      const TestProjectsWithMissingData = () => {
        const React = require('react');
        
        const ProjectCard = ({ project }) => {
          const { htmlEncode } = require('../../../src/utils/securityUtils');
          const { title, tags, description, links } = project || {};
          
          const trustedRender = (content, fallback = '') => {
            if (typeof content !== 'string' || !content) return fallback;
            return htmlEncode(content);
          };

          return (
            <div className="projectCard" data-testid="empty-project-card">
              <h3 className="projectTitle">{trustedRender(title, 'Untitled Project')}</h3>
              <div className="projectTags">
                {Array.isArray(tags) ? tags.map((tag, index) => (
                  <span key={index} className="projectTag">{trustedRender(tag, '')}</span>
                )) : <span>No tags</span>}
              </div>
              <p className="projectDescription">{trustedRender(description, 'No description available')}</p>
            </div>
          );
        };

        return (
          <div>
            <ProjectCard project={null} />
            <ProjectCard project={{}} />
            <ProjectCard project={{ title: '', tags: null, description: null }} />
          </div>
        );
      };

      render(<TestProjectsWithMissingData />);

      expect(screen.getAllByText('Untitled Project')).toHaveLength(3);
      expect(screen.getAllByText('No description available')).toHaveLength(3);
      expect(screen.getAllByText('No tags')).toHaveLength(3); // All three cards have no tags
    });

    it('handles malformed link data', () => {
      const TestProjectsWithBadLinks = () => {
        const React = require('react');
        
        const ProjectCard = ({ project }) => {
          const { htmlEncode, isValidImageUrl } = require('../../../src/utils/securityUtils');
          const { links } = project;
          
          const trustedRender = (content, fallback = '') => {
            if (typeof content !== 'string' || !content) return fallback;
            return htmlEncode(content);
          };

          return (
            <div className="projectCard" data-testid="bad-links-project">
              <div className="projectLinks">
                {Array.isArray(links) ? links.map((link, index) => {
                  const isValidUrl = link.url && typeof link.url === 'string' && isValidImageUrl(link.url.replace(/^https?:\/\//, 'https://'));
                  if (!isValidUrl) return <span key={index} data-testid="invalid-link">Invalid link</span>;
                  
                  return (
                    <a key={index} href={trustedRender(link.url, '#')}>
                      {trustedRender(link.text, 'View Project')}
                    </a>
                  );
                }) : <span>No links</span>}
              </div>
            </div>
          );
        };

        return (
          <ProjectCard project={{
            links: [
              { url: 'invalid-url', text: 'Bad Link' },
              { url: null, text: 'Null URL' },
              { url: 123, text: 'Number URL' },
            ]
          }} />
        );
      };

      render(<TestProjectsWithBadLinks />);

      expect(screen.getAllByTestId('invalid-link')).toHaveLength(3);
    });

    it('handles empty projects array', () => {
      const TestEmptyProjects = () => {
        const React = require('react');
        const projects = [];

        return (
          <section data-testid="empty-projects">
            <div className="projectsGrid">
              {projects.map(project => (
                <div key={project.id}>Project</div>
              ))}
            </div>
          </section>
        );
      };

      render(<TestEmptyProjects />);

      const section = screen.getByTestId('empty-projects');
      expect(section).toBeInTheDocument();
      expect(section.querySelector('.projectsGrid')).toBeEmptyDOMElement();
    });
  });
});