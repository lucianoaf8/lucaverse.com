import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Contact from '../../src/components/Contact/Contact.jsx'

// Mock the utility modules
vi.mock('../../src/utils/httpClient.js', () => ({
  httpClient: {
    post: vi.fn()
  },
  handleApiResponse: vi.fn()
}))

vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('../../src/utils/spamProtection.js', () => ({
  SpamProtection: vi.fn().mockImplementation(() => ({
    validateSubmission: vi.fn().mockResolvedValue({ passed: true }),
    getErrorMessage: vi.fn(),
    destroy: vi.fn(),
    getHoneypotFields: vi.fn().mockReturnValue([])
  }))
}))

vi.mock('../../src/utils/csrfProtection.js', () => ({
  csrfProtection: {
    validate: vi.fn().mockResolvedValue({ valid: true }),
    protectFormData: vi.fn().mockImplementation((data) => Promise.resolve(data)),
    protectHeaders: vi.fn().mockResolvedValue({}),
    getErrorMessage: vi.fn()
  }
}))

// Mock SpamProtection static method
beforeEach(async () => {
  vi.clearAllMocks()
  // Mock the static method
  const { SpamProtection } = await import('../../src/utils/spamProtection.js')
  SpamProtection.getHoneypotFields = vi.fn().mockReturnValue([])
})

describe('Contact Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders contact section with title', () => {
    render(<Contact />)
    
    const section = screen.getByText('getInTouch')
    expect(section).toBeInTheDocument()
    
    const subtitle = screen.getByText('contactSubtitle')
    expect(subtitle).toBeInTheDocument()
  })

  it('renders contact form with all required fields', () => {
    render(<Contact />)
    
    // Check for form fields
    expect(screen.getByPlaceholderText('yourNamePlaceholder')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('yourEmailPlaceholder')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('subjectPlaceholder')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('messagePlaceholder')).toBeInTheDocument()
    
    // Check for submit button
    expect(screen.getByText('sendMessage')).toBeInTheDocument()
  })

  it('renders contact information', () => {
    render(<Contact />)
    
    expect(screen.getByText('contactTitle')).toBeInTheDocument()
    expect(screen.getByText('contactParagraph')).toBeInTheDocument()
    expect(screen.getByText('address')).toBeInTheDocument()
    expect(screen.getByText('canada')).toBeInTheDocument()
    expect(screen.getByText('origin')).toBeInTheDocument()
    expect(screen.getByText('brazilianBorn')).toBeInTheDocument()
    expect(screen.getByText('email')).toBeInTheDocument()
    expect(screen.getByText('contactEmail')).toBeInTheDocument()
  })

  it('renders social media links', () => {
    render(<Contact />)
    
    const socialLinks = screen.getAllByLabelText(/GitHub|LinkedIn|Twitter|Medium/i)
    expect(socialLinks.length).toBeGreaterThan(0)
    
    socialLinks.forEach(link => {
      expect(link).toHaveAttribute('href', '#')
      expect(link).toHaveAttribute('aria-label')
    })
  })

  it('handles form field input', async () => {
    const user = userEvent.setup()
    render(<Contact />)
    
    const nameField = screen.getByPlaceholderText('yourNamePlaceholder')
    const emailField = screen.getByPlaceholderText('yourEmailPlaceholder')
    const subjectField = screen.getByPlaceholderText('subjectPlaceholder')
    const messageField = screen.getByPlaceholderText('messagePlaceholder')
    
    await user.type(nameField, 'John Doe')
    await user.type(emailField, 'john@example.com')
    await user.type(subjectField, 'Test Subject')
    await user.type(messageField, 'Test message')
    
    expect(nameField).toHaveValue('John Doe')
    expect(emailField).toHaveValue('john@example.com')
    expect(subjectField).toHaveValue('Test Subject')
    expect(messageField).toHaveValue('Test message')
  })

  it('shows loading state when form is submitted', async () => {
    const user = userEvent.setup()
    const { httpClient } = await import('../../src/utils/httpClient.js')
    
    // Mock a delayed response
    httpClient.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
    
    render(<Contact />)
    
    // Fill out form
    await user.type(screen.getByPlaceholderText('yourNamePlaceholder'), 'John Doe')
    await user.type(screen.getByPlaceholderText('yourEmailPlaceholder'), 'john@example.com')
    await user.type(screen.getByPlaceholderText('messagePlaceholder'), 'Test message')
    
    // Submit form
    const submitButton = screen.getByText('sendMessage')
    await user.click(submitButton)
    
    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('sendingMessage')).toBeInTheDocument()
    })
  })

  it('handles successful form submission', async () => {
    const user = userEvent.setup()
    const { httpClient, handleApiResponse } = await import('../../src/utils/httpClient.js')
    
    // Mock successful response
    httpClient.post.mockResolvedValue({ status: 200 })
    handleApiResponse.mockResolvedValue({ success: true })
    
    render(<Contact />)
    
    // Fill out form
    await user.type(screen.getByPlaceholderText('yourNamePlaceholder'), 'John Doe')
    await user.type(screen.getByPlaceholderText('yourEmailPlaceholder'), 'john@example.com')
    await user.type(screen.getByPlaceholderText('messagePlaceholder'), 'Test message')
    
    // Submit form
    const submitButton = screen.getByText('sendMessage')
    await user.click(submitButton)
    
    // Should show success message
    await waitFor(() => {
      expect(screen.getByText('contactSuccess')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('handles form submission errors', async () => {
    const user = userEvent.setup()
    const { httpClient } = await import('../../src/utils/httpClient.js')
    
    // Mock error response
    httpClient.post.mockRejectedValue(new Error('Network error'))
    
    render(<Contact />)
    
    // Fill out form
    await user.type(screen.getByPlaceholderText('yourNamePlaceholder'), 'John Doe')
    await user.type(screen.getByPlaceholderText('yourEmailPlaceholder'), 'john@example.com')
    await user.type(screen.getByPlaceholderText('messagePlaceholder'), 'Test message')
    
    // Submit form
    const submitButton = screen.getByText('sendMessage')
    await user.click(submitButton)
    
    // Should show error message
    await waitFor(() => {
      const errorElements = screen.queryAllByText(/error|failed/i)
      expect(errorElements.length).toBeGreaterThan(0)
    }, { timeout: 5000 })
  })

  it('handles field focus tracking', async () => {
    const user = userEvent.setup()
    render(<Contact />)
    
    const nameField = screen.getByPlaceholderText('yourNamePlaceholder')
    const emailField = screen.getByPlaceholderText('yourEmailPlaceholder')
    
    // Focus on fields
    await user.click(nameField)
    await user.click(emailField)
    
    // Fields should handle focus events
    expect(nameField).toBeInTheDocument()
    expect(emailField).toBeInTheDocument()
  })

  it('validates spam protection', async () => {
    const user = userEvent.setup()
    const { SpamProtection } = await import('../../src/utils/spamProtection.js')
    
    // Mock spam protection failure
    const mockInstance = {
      validateSubmission: vi.fn().mockResolvedValue({ passed: false }),
      getErrorMessage: vi.fn().mockReturnValue('Spam detected'),
      destroy: vi.fn()
    }
    SpamProtection.mockImplementation(() => mockInstance)
    
    render(<Contact />)
    
    // Fill out and submit form
    await user.type(screen.getByPlaceholderText('yourNamePlaceholder'), 'John Doe')
    await user.type(screen.getByPlaceholderText('yourEmailPlaceholder'), 'john@example.com')
    await user.type(screen.getByPlaceholderText('messagePlaceholder'), 'Test message')
    
    const submitButton = screen.getByText('sendMessage')
    await user.click(submitButton)
    
    // Should show spam protection error
    await waitFor(() => {
      expect(screen.getByText('Spam detected')).toBeInTheDocument()
    })
  })

  it('handles CSRF protection validation', async () => {
    const user = userEvent.setup()
    const { csrfProtection } = await import('../../src/utils/csrfProtection.js')
    
    // Mock CSRF protection failure
    csrfProtection.validate.mockResolvedValue({ valid: false })
    csrfProtection.getErrorMessage.mockReturnValue('CSRF validation failed')
    
    render(<Contact />)
    
    // Fill out and submit form
    await user.type(screen.getByPlaceholderText('yourNamePlaceholder'), 'John Doe')
    await user.type(screen.getByPlaceholderText('yourEmailPlaceholder'), 'john@example.com')
    await user.type(screen.getByPlaceholderText('messagePlaceholder'), 'Test message')
    
    const submitButton = screen.getByText('sendMessage')
    await user.click(submitButton)
    
    // Should show CSRF error
    await waitFor(() => {
      expect(screen.getByText('CSRF validation failed')).toBeInTheDocument()
    })
  })

  it('handles localhost development mode', async () => {
    const user = userEvent.setup()
    const { httpClient } = await import('../../src/utils/httpClient.js')
    
    // Mock window.location.hostname for localhost
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost' },
      writable: true
    })
    
    // Mock error response
    httpClient.post.mockRejectedValue(new Error('Network error'))
    
    render(<Contact />)
    
    // Fill out and submit form
    await user.type(screen.getByPlaceholderText('yourNamePlaceholder'), 'John Doe')
    await user.type(screen.getByPlaceholderText('yourEmailPlaceholder'), 'john@example.com')
    await user.type(screen.getByPlaceholderText('messagePlaceholder'), 'Test message')
    
    const submitButton = screen.getByText('sendMessage')
    await user.click(submitButton)
    
    // Should show localhost success message
    await waitFor(() => {
      expect(screen.getByText('contactLocalDev')).toBeInTheDocument()
    })
  })

  it('closes notification when close button is clicked', async () => {
    const user = userEvent.setup()
    const { httpClient, handleApiResponse } = await import('../../src/utils/httpClient.js')
    
    // Mock successful response
    httpClient.post.mockResolvedValue({ status: 200 })
    handleApiResponse.mockResolvedValue({ success: true })
    
    render(<Contact />)
    
    // Fill out and submit form to trigger notification
    await user.type(screen.getByPlaceholderText('yourNamePlaceholder'), 'John Doe')
    await user.type(screen.getByPlaceholderText('yourEmailPlaceholder'), 'john@example.com')
    await user.type(screen.getByPlaceholderText('messagePlaceholder'), 'Test message')
    
    const submitButton = screen.getByText('sendMessage')
    await user.click(submitButton)
    
    // Wait for success notification
    await waitFor(() => {
      expect(screen.getByText('contactSuccess')).toBeInTheDocument()
    })
    
    // Click close button
    const closeButton = screen.getByText('×')
    await user.click(closeButton)
    
    // Notification should be hidden
    await waitFor(() => {
      expect(screen.queryByText('contactSuccess')).not.toBeInTheDocument()
    })
  })
})