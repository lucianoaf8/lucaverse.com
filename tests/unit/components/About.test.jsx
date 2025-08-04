/**
 * About Component Tests
 * Tests the real About component from src/components/About/About.jsx
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import About from '../../../src/components/About/About';

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

describe('About Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the about section with correct structure', () => {
      render(<About />);

      expect(screen.getByText('About Me')).toBeInTheDocument();
      expect(screen.getByText('Get to know the person behind the code')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'Luca' })).toBeInTheDocument();
    });

    it('has correct section ID for navigation', () => {
      const { container } = render(<About />);
      
      const section = container.querySelector('section');
      expect(section).toHaveAttribute('id', 'about');
    });

    it('displays main content sections', () => {
      render(<About />);

      expect(screen.getByText('Passionate Data Analyst & Problem Solver')).toBeInTheDocument();
      expect(screen.getByText('Technical Expertise')).toBeInTheDocument();
    });
  });

  describe('Profile Image Section', () => {
    it('displays the profile image with correct attributes', () => {
      render(<About />);

      const profileImg = screen.getByRole('img', { name: 'Luca' });
      expect(profileImg).toHaveAttribute('src', '/avatars/luca-img.png');
      expect(profileImg).toHaveAttribute('alt', 'Luca');
    });

    it('shows the data analyst tag', () => {
      render(<About />);

      expect(screen.getByText('[DATA ANALYST]')).toBeInTheDocument();
    });
  });

  describe('About Text Content', () => {
    it('displays the about title', () => {
      render(<About />);

      expect(screen.getByText('Passionate Data Analyst & Problem Solver')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Passionate Data Analyst & Problem Solver');
    });

    it('shows both about paragraphs', () => {
      render(<About />);

      expect(screen.getByText('I am a dedicated data analyst with a passion for transforming complex data into actionable insights.')).toBeInTheDocument();
      expect(screen.getByText('With expertise in Python, Excel, and modern analytics tools, I help organizations make data-driven decisions.')).toBeInTheDocument();
    });

    it('displays technical expertise section title', () => {
      render(<About />);

      expect(screen.getByText('Technical Expertise')).toBeInTheDocument();
    });
  });

  describe('Skills Display', () => {
    it('renders all eight skills', () => {
      render(<About />);

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

    it('displays technical skills with proper naming', () => {
      render(<About />);

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
      render(<About />);

      expect(screen.getByText('About Me')).toBeInTheDocument();
      expect(screen.getByText('Get to know the person behind the code')).toBeInTheDocument();
      expect(screen.getByText('Passionate Data Analyst & Problem Solver')).toBeInTheDocument();
      expect(screen.getByText('Technical Expertise')).toBeInTheDocument();
    });

    it('displays about content in translated language', () => {
      render(<About />);

      expect(screen.getByText('I am a dedicated data analyst with a passion for transforming complex data into actionable insights.')).toBeInTheDocument();
      expect(screen.getByText('With expertise in Python, Excel, and modern analytics tools, I help organizations make data-driven decisions.')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('has proper semantic HTML structure', () => {
      render(<About />);

      const mainHeading = screen.getByRole('heading', { level: 2 });
      expect(mainHeading).toHaveTextContent('About Me');

      const subHeading = screen.getByRole('heading', { level: 3 });
      expect(subHeading).toHaveTextContent('Passionate Data Analyst & Problem Solver');
    });
  });
});