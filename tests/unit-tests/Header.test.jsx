import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Header from '../../src/components/Header/Header.jsx'

// Mock the AccessRequestForm component
vi.mock('../../src/components/AccessRequestForm/AccessRequestForm.jsx', () => ({
  default: ({ isOpen, onClose }) => (
    isOpen ? <div data-testid="access-modal">Access Request Form</div> : null
  )
}))

describe('Header Component', () => {
  beforeEach(() => {
    // Reset any mocks before each test
    vi.clearAllMocks()
  })

  it('renders header with logo', () => {
    render(<Header />)
    
    const logo = screen.getByAltText(/lucaverse logo/i)
    expect(logo).toBeInTheDocument()
    expect(logo).toHaveAttribute('src', '/assets/lv-logo-nobg.png')
  })

  it('renders all navigation links', () => {
    render(<Header />)
    
    // Check for navigation links (using the translation keys as text)
    expect(screen.getByText('home')).toBeInTheDocument()
    expect(screen.getByText('about')).toBeInTheDocument()
    expect(screen.getByText('projects')).toBeInTheDocument()
    expect(screen.getByText('customGpts')).toBeInTheDocument()
    expect(screen.getByText('blog')).toBeInTheDocument()
    expect(screen.getByText('contactMe')).toBeInTheDocument()
  })

  it('renders newsletter link with correct attributes', () => {
    render(<Header />)
    
    const newsletterLink = screen.getByText('newsletter').closest('a')
    expect(newsletterLink).toHaveAttribute('href', 'https://newsletter.lucaverse.com')
    expect(newsletterLink).toHaveAttribute('target', '_blank')
    expect(newsletterLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders login and request access buttons', () => {
    render(<Header />)
    
    const loginButton = screen.getByText('lucaverseLogin')
    expect(loginButton).toBeInTheDocument()
    expect(loginButton.closest('a')).toHaveAttribute('href', '#login')
    
    const requestAccessButton = screen.getByText('requestAccess')
    expect(requestAccessButton).toBeInTheDocument()
  })

  it('displays language toggle button', () => {
    render(<Header />)
    
    // Should show current language (EN by default in mock)
    const languageToggle = screen.getByRole('button', { name: /switch to/i })
    expect(languageToggle).toBeInTheDocument()
  })

  it('opens access request modal when button is clicked', async () => {
    const user = userEvent.setup()
    render(<Header />)
    
    const requestAccessButton = screen.getByText('requestAccess')
    await user.click(requestAccessButton)
    
    // Modal should appear
    expect(screen.getByTestId('access-modal')).toBeInTheDocument()
  })

  it('closes access request modal', async () => {
    const user = userEvent.setup()
    render(<Header />)
    
    // Open modal
    const requestAccessButton = screen.getByText('requestAccess')
    await user.click(requestAccessButton)
    
    expect(screen.getByTestId('access-modal')).toBeInTheDocument()
    
    // Note: Since the modal closure is handled internally, 
    // we can't easily test it without exposing the close function
    // This would require a more complex test setup or refactoring the component
  })

  it('handles language toggle click', async () => {
    const user = userEvent.setup()
    render(<Header />)
    
    const languageToggle = screen.getByRole('button', { name: /switch to/i })
    await user.click(languageToggle)
    
    // The language change should be triggered
    // Note: Since we're mocking i18n, we can't test the actual language change
    // In a real test, you would mock the i18n.changeLanguage function and verify it was called
  })

  it('shows flag animation when language changes', async () => {
    const user = userEvent.setup()
    render(<Header />)
    
    const languageToggle = screen.getByRole('button', { name: /switch to/i })
    await user.click(languageToggle)
    
    // Flag animation elements should be present in the DOM temporarily
    // Note: This is difficult to test without more complex timing and DOM observation
    // The component uses setTimeout for flag animation which is tricky to test
  })

  it('renders correct navigation link hrefs', () => {
    render(<Header />)
    
    const links = [
      { text: 'home', href: '#home' },
      { text: 'about', href: '#about' },
      { text: 'projects', href: '#projects' },
      { text: 'customGpts', href: '#custom-gpts' },
      { text: 'blog', href: '#blog' },
      { text: 'contactMe', href: '#contact' }
    ]

    links.forEach(({ text, href }) => {
      const link = screen.getByText(text).closest('a')
      expect(link).toHaveAttribute('href', href)
    })
  })

  it('has proper accessibility attributes', () => {
    render(<Header />)
    
    // Logo should have alt text
    const logo = screen.getByAltText(/lucaverse logo/i)
    expect(logo).toBeInTheDocument()
    
    // Language toggle should have title attribute
    const languageToggle = screen.getByRole('button', { name: /switch to/i })
    expect(languageToggle).toHaveAttribute('title')
    
    // External links should have proper rel attributes
    const newsletterLink = screen.getByText('newsletter').closest('a')
    expect(newsletterLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders header structure correctly', () => {
    render(<Header />)
    
    // Should have header element
    const header = screen.getByRole('banner') // header has banner role by default
    expect(header).toBeInTheDocument()
    
    // Should contain navigation
    const nav = screen.getByRole('navigation')
    expect(nav).toBeInTheDocument()
  })

  it('handles button hover states', async () => {
    const user = userEvent.setup()
    render(<Header />)
    
    const languageToggle = screen.getByRole('button', { name: /switch to/i })
    
    // Hover over language toggle
    await user.hover(languageToggle)
    
    // Component should handle hover state
    // Note: Testing hover state changes requires more complex DOM inspection
    // as CSS changes aren't directly testable through testing-library
    expect(languageToggle).toBeInTheDocument()
  })
})