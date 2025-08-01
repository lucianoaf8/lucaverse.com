import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LucaverseLogin from '../../src/components/LucaverseLogin/LucaverseLogin.jsx'

// Mock the utility modules
vi.mock('../../src/utils/oauth-security.js', () => ({
  createOAuthSecurityParams: vi.fn().mockResolvedValue({
    state: 'mock-state-123',
    codeChallenge: 'mock-code-challenge',
    codeChallengeMethod: 'S256',
    sessionId: 'mock-session-id'
  }),
  validateMessageSource: vi.fn().mockReturnValue(true),
  oauthStorage: {
    clear: vi.fn(),
    get: vi.fn(),
    set: vi.fn()
  }
}))

vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    security: vi.fn(),
    getUserFriendlyError: vi.fn().mockReturnValue('Something went wrong. Please try again.')
  }
}))

vi.mock('../../src/components/Background/TronGrid.tsx', () => ({
  default: () => <div data-testid="tron-grid">TronGrid Background</div>
}))

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => {
      const translations = {
        'login.enterThe': 'Enter the',
        'login.lucaverse': 'Lucaverse',
        'login.chooseGateway': 'Choose Your Gateway',
        'login.connectWith': 'Connect with your preferred authentication method',
        'login.continueWithGoogle': 'Continue with Google',
        'login.continueWithMicrosoft': 'Continue with Microsoft',
        'login.initializing': 'Initializing connection...',
        'login.secureAuth': 'Secure Authentication',
        'login.termsAgreement': 'By continuing, you agree to our Terms of Service',
        'login.encryption': 'Protected by enterprise-grade encryption',
        'login.secureConnection': 'SECURE CONNECTION ESTABLISHED'
      }
      return translations[key] || defaultValue || key
    }
  })
}))

describe('LucaverseLogin Component', () => {
  let mockWindowOpen
  let mockAddEventListener
  let mockRemoveEventListener
  let mockSetTimeout
  let mockClearTimeout
  let mockSetInterval
  let mockClearInterval

  beforeEach(() => {
    // Mock window.open
    mockWindowOpen = vi.fn()
    Object.defineProperty(window, 'open', {
      value: mockWindowOpen,
      writable: true
    })

    // Mock event listeners
    mockAddEventListener = vi.fn()
    mockRemoveEventListener = vi.fn()
    Object.defineProperty(window, 'addEventListener', {
      value: mockAddEventListener,
      writable: true
    })
    Object.defineProperty(window, 'removeEventListener', {
      value: mockRemoveEventListener,
      writable: true
    })

    // Mock timers
    mockSetTimeout = vi.fn((callback, delay) => setTimeout(callback, delay))
    mockClearTimeout = vi.fn(clearTimeout)
    mockSetInterval = vi.fn((callback, delay) => setInterval(callback, delay))
    mockClearInterval = vi.fn(clearInterval)

    Object.defineProperty(window, 'setTimeout', { value: mockSetTimeout, writable: true })
    Object.defineProperty(window, 'clearTimeout', { value: mockClearTimeout, writable: true })
    Object.defineProperty(window, 'setInterval', { value: mockSetInterval, writable: true })
    Object.defineProperty(window, 'clearInterval', { value: mockClearInterval, writable: true })

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        hash: '',
        origin: 'http://localhost:3000'
      },
      writable: true
    })

    // Mock window.screen
    Object.defineProperty(window, 'screen', {
      value: {
        width: 1920,
        height: 1080
      },
      writable: true
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render all essential login elements', () => {
      render(<LucaverseLogin />)

      // Check main title
      expect(screen.getByText('Enter the')).toBeInTheDocument()
      expect(screen.getByText('Lucaverse')).toBeInTheDocument()
      
      // Check subtitle
      expect(screen.getByText('Choose Your Gateway')).toBeInTheDocument()
      expect(screen.getByText('Connect with your preferred authentication method')).toBeInTheDocument()

      // Check login buttons
      expect(screen.getByText('Continue with Google')).toBeInTheDocument()
      expect(screen.getByText('Continue with Microsoft')).toBeInTheDocument()

      // Check security elements
      expect(screen.getByText('SECURE CONNECTION ESTABLISHED')).toBeInTheDocument()
      expect(screen.getByText('Protected by enterprise-grade encryption')).toBeInTheDocument()
      expect(screen.getByText('By continuing, you agree to our Terms of Service')).toBeInTheDocument()
    })

    it('should render background components', () => {
      render(<LucaverseLogin />)
      
      // Should render TronGrid background
      expect(screen.getByTestId('tron-grid')).toBeInTheDocument()
    })

    it('should render logo with proper attributes', () => {
      render(<LucaverseLogin />)
      
      const logo = screen.getByAltText('Lucaverse Logo')
      expect(logo).toBeInTheDocument()
      expect(logo).toHaveAttribute('src', '/assets/lv-logo-nobg.png')
    })

    it('should have proper button states initially', () => {
      render(<LucaverseLogin />)
      
      const googleButton = screen.getByText('Continue with Google')
      const microsoftButton = screen.getByText('Continue with Microsoft')
      
      expect(googleButton).toBeEnabled()
      expect(microsoftButton).toBeEnabled()
    })

    it('should not show loading state initially', () => {
      render(<LucaverseLogin />)
      
      expect(screen.queryByText('Initializing connection...')).not.toBeInTheDocument()
    })
  })

  describe('Google OAuth Authentication Flow', () => {
    it('should initiate Google OAuth flow when Google button is clicked', async () => {
      const user = userEvent.setup()
      const mockPopup = {
        closed: false,
        close: vi.fn()
      }
      mockWindowOpen.mockReturnValue(mockPopup)

      render(<LucaverseLogin />)
      
      const googleButton = screen.getByText('Continue with Google')
      await user.click(googleButton)

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Initializing connection...')).toBeInTheDocument()
      })

      // Should call window.open with correct OAuth URL
      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalledWith(
          expect.stringContaining('lucaverse-auth.lucianoaf8.workers.dev/auth/google'),
          'googleAuth',
          expect.stringContaining('width=500,height=600')
        )
      })

      // Should disable the button during authentication
      expect(googleButton).toBeDisabled()
    })

    it('should generate secure OAuth parameters', async () => {
      const user = userEvent.setup()
      const mockPopup = { closed: false, close: vi.fn() }
      mockWindowOpen.mockReturnValue(mockPopup)
      
      const { createOAuthSecurityParams } = await import('../../src/utils/oauth-security.js')

      render(<LucaverseLogin />)
      
      const googleButton = screen.getByText('Continue with Google')
      await user.click(googleButton)

      await waitFor(() => {
        expect(createOAuthSecurityParams).toHaveBeenCalled()
      })

      // Verify OAuth URL contains security parameters
      await waitFor(() => {
        const openCall = mockWindowOpen.mock.calls[0]
        const oauthUrl = new URL(openCall[0])
        
        expect(oauthUrl.searchParams.get('state')).toBe('mock-state-123')
        expect(oauthUrl.searchParams.get('code_challenge')).toBe('mock-code-challenge')
        expect(oauthUrl.searchParams.get('code_challenge_method')).toBe('S256')
        expect(oauthUrl.searchParams.get('session_id')).toBe('mock-session-id')
      })
    })

    it('should handle popup blocking gracefully', async () => {
      const user = userEvent.setup()
      mockWindowOpen.mockReturnValue(null) // Simulate blocked popup

      // Mock window.alert
      const mockAlert = vi.fn()
      Object.defineProperty(window, 'alert', { value: mockAlert, writable: true })

      render(<LucaverseLogin />)
      
      const googleButton = screen.getByText('Continue with Google')
      await user.click(googleButton)

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Popup was blocked. Please allow popups for this site.')
      })

      // Button should be re-enabled
      await waitFor(() => {
        expect(googleButton).toBeEnabled()
      })
    })

    it('should handle OAuth success message', async () => {
      const user = userEvent.setup()
      const mockPopup = { closed: false, close: vi.fn() }
      mockWindowOpen.mockReturnValue(mockPopup)

      render(<LucaverseLogin />)
      
      const googleButton = screen.getByText('Continue with Google')
      await user.click(googleButton)

      // Wait for event listener to be added
      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalledWith('message', expect.any(Function))
      })

      // Get the message handler
      const messageHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'message'
      )[1]

      // Simulate OAuth success message
      const successEvent = {
        origin: 'http://localhost:3000',
        source: mockPopup,
        data: {
          type: 'OAUTH_SUCCESS',
          timestamp: Date.now(),
          user: { email: 'test@example.com' }
        }
      }

      messageHandler(successEvent)

      // Should redirect to dashboard
      await waitFor(() => {
        expect(window.location.hash).toBe('dashboard')
      })

      // Should clean up resources
      expect(mockPopup.close).toHaveBeenCalled()
    })

    it('should handle OAuth error messages', async () => {
      const user = userEvent.setup()
      const mockPopup = { closed: false, close: vi.fn() }
      mockWindowOpen.mockReturnValue(mockPopup)
      const mockAlert = vi.fn()
      Object.defineProperty(window, 'alert', { value: mockAlert, writable: true })

      render(<LucaverseLogin />)
      
      const googleButton = screen.getByText('Continue with Google')
      await user.click(googleButton)

      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalledWith('message', expect.any(Function))
      })

      const messageHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'message'
      )[1]

      // Test different error scenarios
      const errorScenarios = [
        { errorCode: 'access_denied', expectedMessage: 'Authentication was cancelled. Please try again.' },
        { errorCode: 'popup_blocked', expectedMessage: 'Popup was blocked. Please allow popups and try again.' },
        { errorCode: 'session_expired', expectedMessage: 'Session expired. Please try again.' }
      ]

      for (const scenario of errorScenarios) {
        mockAlert.mockClear()
        
        const errorEvent = {
          origin: 'http://localhost:3000',
          source: mockPopup,
          data: {
            type: 'OAUTH_ERROR',
            timestamp: Date.now(),
            error: `Test error: ${scenario.errorCode}`,
            errorCode: scenario.errorCode
          }
        }

        messageHandler(errorEvent)

        await waitFor(() => {
          expect(mockAlert).toHaveBeenCalledWith(scenario.expectedMessage)
        })
      }
    })

    it('should validate message security', async () => {
      const user = userEvent.setup()
      const mockPopup = { closed: false, close: vi.fn() }
      mockWindowOpen.mockReturnValue(mockPopup)

      render(<LucaverseLogin />)
      
      const googleButton = screen.getByText('Continue with Google')
      await user.click(googleButton)

      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalledWith('message', expect.any(Function))
      })

      const messageHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'message'
      )[1]

      // Test invalid origin (should be ignored)
      const invalidOriginEvent = {
        origin: 'https://malicious-site.com',
        source: mockPopup,
        data: {
          type: 'OAUTH_SUCCESS',
          timestamp: Date.now()
        }
      }

      messageHandler(invalidOriginEvent)

      // Should not redirect (hash should remain empty)
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(window.location.hash).toBe('')

      // Test invalid timestamp (too old)
      const oldTimestampEvent = {
        origin: 'http://localhost:3000',
        source: mockPopup,
        data: {
          type: 'OAUTH_SUCCESS',
          timestamp: Date.now() - 700000 // 11+ minutes old
        }
      }

      messageHandler(oldTimestampEvent)

      // Should not redirect
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(window.location.hash).toBe('')
    })

    it('should handle popup closed manually by user', async () => {
      const user = userEvent.setup()
      const mockPopup = { closed: false, close: vi.fn() }
      mockWindowOpen.mockReturnValue(mockPopup)

      render(<LucaverseLogin />)
      
      const googleButton = screen.getByText('Continue with Google')
      await user.click(googleButton)

      // Verify interval was set up for checking popup status
      await waitFor(() => {
        expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 1000)
      })

      // Simulate popup being closed
      mockPopup.closed = true
      
      // Get the interval callback and call it
      const intervalCallback = mockSetInterval.mock.calls.find(
        call => call[1] === 1000
      )[0]
      
      intervalCallback()

      // Should clear loading state
      await waitFor(() => {
        expect(googleButton).toBeEnabled()
      })
    })

    it('should handle OAuth timeout', async () => {
      const user = userEvent.setup()
      const mockPopup = { closed: false, close: vi.fn() }
      mockWindowOpen.mockReturnValue(mockPopup)

      render(<LucaverseLogin />)
      
      const googleButton = screen.getByText('Continue with Google')
      await user.click(googleButton)

      // Verify timeout was set
      await waitFor(() => {
        expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 300000) // 5 minutes
      })

      // Get and execute timeout callback
      const timeoutCallback = mockSetTimeout.mock.calls.find(
        call => call[1] === 300000
      )[0]
      
      timeoutCallback()

      // Should close popup and clear loading state
      expect(mockPopup.close).toHaveBeenCalled()
      await waitFor(() => {
        expect(googleButton).toBeEnabled()
      })
    })
  })

  describe('Microsoft Authentication (Simulated)', () => {
    it('should handle Microsoft login button click', async () => {
      const user = userEvent.setup()
      
      render(<LucaverseLogin />)
      
      const microsoftButton = screen.getByText('Continue with Microsoft')
      await user.click(microsoftButton)

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Initializing connection...')).toBeInTheDocument()
      })

      // Button should be disabled
      expect(microsoftButton).toBeDisabled()

      // Should set timeout for simulation (2 seconds)
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 2000)
    })

    it('should complete Microsoft simulation after timeout', async () => {
      const user = userEvent.setup()
      
      render(<LucaverseLogin />)
      
      const microsoftButton = screen.getByText('Continue with Microsoft')
      await user.click(microsoftButton)

      // Get and execute the timeout callback
      const timeoutCallback = mockSetTimeout.mock.calls.find(
        call => call[1] === 2000
      )[0]
      
      timeoutCallback()

      // Should clear loading state
      await waitFor(() => {
        expect(microsoftButton).toBeEnabled()
      })

      expect(screen.queryByText('Initializing connection...')).not.toBeInTheDocument()
    })
  })

  describe('Button Hover Effects', () => {
    it('should handle Google button hover states', async () => {
      const user = userEvent.setup()
      
      render(<LucaverseLogin />)
      
      const googleButton = screen.getByText('Continue with Google')
      
      // Hover over button
      await user.hover(googleButton)
      
      // Should remain enabled and visible
      expect(googleButton).toBeEnabled()
      expect(googleButton).toBeVisible()

      // Unhover
      await user.unhover(googleButton)
      
      expect(googleButton).toBeEnabled()
      expect(googleButton).toBeVisible()
    })

    it('should handle Microsoft button hover states', async () => {
      const user = userEvent.setup()
      
      render(<LucaverseLogin />)
      
      const microsoftButton = screen.getByText('Continue with Microsoft')
      
      // Hover over button
      await user.hover(microsoftButton)
      
      // Should remain enabled and visible
      expect(microsoftButton).toBeEnabled()
      expect(microsoftButton).toBeVisible()

      // Unhover
      await user.unhover(microsoftButton)
      
      expect(microsoftButton).toBeEnabled()
      expect(microsoftButton).toBeVisible()
    })
  })

  describe('Component State Management', () => {
    it('should manage loading state correctly', async () => {
      const user = userEvent.setup()
      const mockPopup = { closed: false, close: vi.fn() }
      mockWindowOpen.mockReturnValue(mockPopup)
      
      render(<LucaverseLogin />)
      
      const googleButton = screen.getByText('Continue with Google')
      
      // Initially not loading
      expect(screen.queryByText('Initializing connection...')).not.toBeInTheDocument()
      expect(googleButton).toBeEnabled()
      
      // Click to start authentication
      await user.click(googleButton)
      
      // Should be in loading state
      await waitFor(() => {
        expect(screen.getByText('Initializing connection...')).toBeInTheDocument()
        expect(googleButton).toBeDisabled()
      })
    })

    it('should clear OAuth storage on authentication completion', async () => {
      const user = userEvent.setup()
      const mockPopup = { closed: false, close: vi.fn() }
      mockWindowOpen.mockReturnValue(mockPopup)
      
      const { oauthStorage } = await import('../../src/utils/oauth-security.js')
      
      render(<LucaverseLogin />)
      
      const googleButton = screen.getByText('Continue with Google')
      await user.click(googleButton)

      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalledWith('message', expect.any(Function))
      })

      const messageHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'message'
      )[1]

      // Simulate success
      const successEvent = {
        origin: 'http://localhost:3000',
        source: mockPopup,
        data: {
          type: 'OAUTH_SUCCESS',
          timestamp: Date.now()
        }
      }

      messageHandler(successEvent)

      // Should clear OAuth storage
      await waitFor(() => {
        expect(oauthStorage.clear).toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle OAuth security errors gracefully', async () => {
      const user = userEvent.setup()
      const mockAlert = vi.fn()
      Object.defineProperty(window, 'alert', { value: mockAlert, writable: true })
      
      // Mock createOAuthSecurityParams to throw error
      const { createOAuthSecurityParams } = await import('../../src/utils/oauth-security.js')
      createOAuthSecurityParams.mockRejectedValueOnce(new Error('Security error'))
      
      render(<LucaverseLogin />)
      
      const googleButton = screen.getByText('Continue with Google')
      await user.click(googleButton)

      // Should show error alert
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Something went wrong. Please try again.')
      })

      // Should clear loading state
      await waitFor(() => {
        expect(googleButton).toBeEnabled()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes and labels', () => {
      render(<LucaverseLogin />)
      
      // Buttons should have accessible text
      const googleButton = screen.getByRole('button', { name: /continue with google/i })
      const microsoftButton = screen.getRole('button', { name: /continue with microsoft/i })
      
      expect(googleButton).toBeInTheDocument()
      expect(microsoftButton).toBeInTheDocument()
      
      // Logo should have alt text
      const logo = screen.getByAltText('Lucaverse Logo')
      expect(logo).toBeInTheDocument()
    })

    it('should handle keyboard navigation properly', async () => {
      const user = userEvent.setup()
      
      render(<LucaverseLogin />)
      
      const googleButton = screen.getByText('Continue with Google')
      
      // Should be focusable
      await user.tab()
      expect(googleButton).toHaveFocus()
      
      // Should be activatable with Enter
      const mockPopup = { closed: false, close: vi.fn() }
      mockWindowOpen.mockReturnValue(mockPopup)
      
      await user.keyboard('{Enter}')
      
      // Should trigger OAuth flow
      await waitFor(() => {
        expect(screen.getByText('Initializing connection...')).toBeInTheDocument()
      })
    })
  })
});