/**
 * Projects Component Tests
 * Tests the real Projects component from src/components/Projects/Projects.jsx
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import Projects from '../../../src/components/Projects/Projects';

// Mock react-i18next — use keys that match the real component
const mockTranslations = {
  myProjects: 'My Projects',
  projectsSubtitle: 'Explore my latest work and innovations',
  audioTranscriptionTitle: 'Audio Transcription Tool',
  screenScrapeTitle: 'Screen Scrape Dashboard',
  financeAnalysisTitle: 'Finance Analysis',
  audioTranscriptionDescription: 'Advanced audio transcription using OpenAI Whisper API',
  screenScrapeDescription: 'Web scraping tool for movie data collection',
  financeAnalysisDescription: 'Finance deep analysis using data tools',
  'tags.openAI': 'OpenAI',
  'tags.whisper': 'Whisper',
  'tags.audio': 'Audio',
  'tags.webScraping': 'Web Scraping',
  'tags.tmdb': 'TMDB',
  'tags.database': 'Database',
  'tags.finance': 'Finance',
  'tags.dataAnalysis': 'Data Analysis',
  'tags.banking': 'Banking',
  viewOnGithub: 'View on GitHub',
  liveDemo: 'Live Demo',
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => mockTranslations[key] || fallback || key,
  }),
}));

// Mock ProjectCard component
jest.mock('../../../src/components/Projects/ProjectCard', () => {
  return function MockProjectCard({ project }) {
    return (
      <div data-testid={`project-card-${project.id}`}>
        <h3>{project.title}</h3>
        <p>{project.description}</p>
        <div data-testid="project-tags">
          {project.tags?.map((tag, index) => (
            <span key={index} data-testid={`tag-${index}`}>{tag}</span>
          ))}
        </div>
        <div data-testid="project-links">
          {project.links?.map((link, index) => (
            <a key={index} href={link.url} data-testid={`link-${index}`}>
              {link.text}
            </a>
          ))}
        </div>
      </div>
    );
  };
});

describe('Projects Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the projects section with correct structure', () => {
      render(<Projects />);

      // Component uses 'myProjects' key which resolves to 'My Projects'
      expect(screen.getByText('My Projects')).toBeInTheDocument();
      expect(screen.getByText('Explore my latest work and innovations')).toBeInTheDocument();
    });

    it('has correct section ID for navigation', () => {
      const { container } = render(<Projects />);

      const section = container.querySelector('section');
      expect(section).toHaveAttribute('id', 'projects');
    });
  });

  describe('Project Cards Rendering', () => {
    it('renders all project cards', () => {
      render(<Projects />);

      // Check for project titles (project 3 is Finance Analysis, not Workflow Automation)
      expect(screen.getByText('Audio Transcription Tool')).toBeInTheDocument();
      expect(screen.getByText('Screen Scrape Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Finance Analysis')).toBeInTheDocument();
    });

    it('displays project descriptions', () => {
      render(<Projects />);

      expect(screen.getByText('Advanced audio transcription using OpenAI Whisper API')).toBeInTheDocument();
      expect(screen.getByText('Web scraping tool for movie data collection')).toBeInTheDocument();
      expect(screen.getByText('Finance deep analysis using data tools')).toBeInTheDocument();
    });

    it('shows project tags', () => {
      render(<Projects />);

      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByText('Whisper')).toBeInTheDocument();
      expect(screen.getByText('Audio')).toBeInTheDocument();
      expect(screen.getByText('Web Scraping')).toBeInTheDocument();
      expect(screen.getByText('TMDB')).toBeInTheDocument();
      expect(screen.getByText('Database')).toBeInTheDocument();
    });

    it('includes project links', () => {
      render(<Projects />);

      const githubLinks = screen.getAllByText('View on GitHub');
      expect(githubLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Project Data Structure', () => {
    it('passes correct project data to ProjectCard components', () => {
      render(<Projects />);

      // Verify project cards are rendered with correct test IDs
      expect(screen.getByTestId('project-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('project-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('project-card-3')).toBeInTheDocument();
    });

    it('includes required project properties', () => {
      render(<Projects />);

      // Each project should have title, description, tags, and links
      const projectCards = screen.getAllByTestId(/^project-card-/);

      projectCards.forEach(card => {
        expect(card.querySelector('h3')).toBeInTheDocument(); // title
        expect(card.querySelector('p')).toBeInTheDocument(); // description
        expect(card.querySelector('[data-testid="project-tags"]')).toBeInTheDocument(); // tags
        expect(card.querySelector('[data-testid="project-links"]')).toBeInTheDocument(); // links
      });
    });
  });

  describe('Internationalization', () => {
    it('uses translation keys for section headers', () => {
      render(<Projects />);

      // Component uses 'myProjects' key (not 'projectsTitle')
      expect(screen.getByText('My Projects')).toBeInTheDocument();
      expect(screen.getByText('Explore my latest work and innovations')).toBeInTheDocument();
    });

    it('translates project content', () => {
      render(<Projects />);

      expect(screen.getByText('Audio Transcription Tool')).toBeInTheDocument();
      expect(screen.getByText('Screen Scrape Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Finance Analysis')).toBeInTheDocument();
    });

    it('translates project tags', () => {
      render(<Projects />);

      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByText('Web Scraping')).toBeInTheDocument();
      expect(screen.getByText('Database')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('has proper semantic HTML structure', () => {
      render(<Projects />);

      const mainHeading = screen.getByRole('heading', { level: 2 });
      expect(mainHeading).toHaveTextContent('My Projects');
    });

    it('renders project cards in a grid layout', () => {
      render(<Projects />);

      const projectCards = screen.getAllByTestId(/^project-card-/);
      expect(projectCards).toHaveLength(3);
    });
  });
});
