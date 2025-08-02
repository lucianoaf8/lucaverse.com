import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock i18next with translation mappings
const mockTranslations = {
  // Contact form translations
  getInTouch: 'Get In Touch',
  contactSubtitle: 'Let\'s discuss your project',
  yourNamePlaceholder: 'Your Name',
  yourEmailPlaceholder: 'Your Email',
  subjectPlaceholder: 'Subject',
  messagePlaceholder: 'Your Message',
  sendMessage: 'Send Message',
  sendingMessage: 'Sending...',
  contactSuccess: 'Message sent successfully!',
  contactLocalDev: 'Development mode - form submitted locally',
  contactTitle: 'Let\'s Work Together',
  contactParagraph: 'Ready to build something amazing?',
  address: 'Location',
  canada: 'Canada',
  origin: 'Origin',
  brazilianBorn: 'Brazilian Born',
  email: 'Email',
  contactEmail: 'contact@lucaverse.com',
  // Header translations
  home: 'Home',
  about: 'About',
  projects: 'Projects',
  contact: 'Contact',
  // Add more as needed
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => mockTranslations[key] || key,
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 0)
})

// Mock HTMLCanvasElement
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Array(4) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => ({ data: new Array(4) })),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
}))

// Setup global fetch mock
global.fetch = vi.fn()

// Setup localStorage mock
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
vi.stubGlobal('localStorage', localStorageMock)

// Setup sessionStorage mock
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
vi.stubGlobal('sessionStorage', sessionStorageMock)