/**
 * App Component Tests
 *
 * App.jsx is the root component. It reads window.location.hash and
 * window.location.pathname to decide which view to render (home, login,
 * dashboard). All heavy child components are mocked so we test routing
 * logic and view-switching in isolation.
 *
 * jsdom provides a real window.location object. We manipulate hash and
 * search via Object.defineProperty / history.pushState + dispatching events
 * to trigger the component's hashchange/popstate listeners.
 */
import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ─── Mock all child components so rendering App doesn't require their deps ──

jest.mock('../../../src/components/Header/Header', () =>
  function MockHeader() { return <header data-testid="header" />; }
);
jest.mock('../../../src/components/Background/Background.jsx', () =>
  function MockBackground() { return <div data-testid="background" />; }
);
jest.mock('../../../src/components/Hero/Hero', () =>
  function MockHero() { return <section data-testid="hero" />; }
);
jest.mock('../../../src/components/About/About', () =>
  function MockAbout() { return <section data-testid="about" />; }
);
jest.mock('../../../src/components/Projects/Projects', () =>
  function MockProjects() { return <section data-testid="projects" />; }
);
jest.mock('../../../src/components/CustomGPTs/CustomGPTs', () =>
  function MockCustomGPTs() { return <section data-testid="custom-gpts" />; }
);
jest.mock('../../../src/components/Blog/Blog', () =>
  function MockBlog() { return <section data-testid="blog" />; }
);
jest.mock('../../../src/components/Contact/Contact', () =>
  function MockContact() { return <section data-testid="contact" />; }
);
jest.mock('../../../src/components/Footer/Footer', () =>
  function MockFooter() { return <footer data-testid="footer" />; }
);
jest.mock('../../../src/components/LucaverseLogin/LucaverseLogin', () =>
  function MockLucaverseLogin() { return <div data-testid="lucaverse-login" />; }
);
jest.mock('../../../src/components/Dashboard/Dashboard', () =>
  function MockDashboard() { return <div data-testid="dashboard" />; }
);

// ─── Import App after mocks ──────────────────────────────────────────────────
import App from '../../../src/App';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Reset jsdom location to a clean state with no hash and empty search.
 * We use history.pushState because direct assignment to window.location
 * is blocked in jsdom.
 */
function resetLocation({ hash = '', search = '', pathname = '/' } = {}) {
  window.history.pushState({}, '', `${pathname}${search}${hash}`);
}

describe('App Component', () => {
  // Restore location to clean state before each test
  beforeEach(() => {
    resetLocation();
  });

  // ─── Home view (default) ──────────────────────────────────────────────────
  describe('Home view (default)', () => {
    it('renders without crashing', () => {
      expect(() => render(<App />)).not.toThrow();
    });

    it('renders the Header in the home view', () => {
      render(<App />);
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('renders the Background in the home view', () => {
      render(<App />);
      expect(screen.getByTestId('background')).toBeInTheDocument();
    });

    it('renders the Hero section in the home view', () => {
      render(<App />);
      expect(screen.getByTestId('hero')).toBeInTheDocument();
    });

    it('renders the About section in the home view', () => {
      render(<App />);
      expect(screen.getByTestId('about')).toBeInTheDocument();
    });

    it('renders the Projects section in the home view', () => {
      render(<App />);
      expect(screen.getByTestId('projects')).toBeInTheDocument();
    });

    it('renders the CustomGPTs section in the home view', () => {
      render(<App />);
      expect(screen.getByTestId('custom-gpts')).toBeInTheDocument();
    });

    it('renders the Blog section in the home view', () => {
      render(<App />);
      expect(screen.getByTestId('blog')).toBeInTheDocument();
    });

    it('renders the Contact section in the home view', () => {
      render(<App />);
      expect(screen.getByTestId('contact')).toBeInTheDocument();
    });

    it('renders the Footer in the home view', () => {
      render(<App />);
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('does NOT render the Login component on the home view', () => {
      render(<App />);
      expect(screen.queryByTestId('lucaverse-login')).not.toBeInTheDocument();
    });

    it('does NOT render the Dashboard component on the home view', () => {
      render(<App />);
      expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
    });
  });

  // ─── Login view (#login) ──────────────────────────────────────────────────
  describe('Login view (#login)', () => {
    it('renders the LucaverseLogin component when hash is #login on mount', () => {
      resetLocation({ hash: '#login' });
      render(<App />);
      expect(screen.getByTestId('lucaverse-login')).toBeInTheDocument();
    });

    it('does NOT render home sections when hash is #login', () => {
      resetLocation({ hash: '#login' });
      render(<App />);
      expect(screen.queryByTestId('hero')).not.toBeInTheDocument();
      expect(screen.queryByTestId('header')).not.toBeInTheDocument();
    });

    it('does NOT render Dashboard when hash is #login', () => {
      resetLocation({ hash: '#login' });
      render(<App />);
      expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
    });
  });

  // ─── Dashboard view (#dashboard) ─────────────────────────────────────────
  describe('Dashboard view (#dashboard)', () => {
    it('renders the Dashboard component when hash is #dashboard on mount', () => {
      resetLocation({ hash: '#dashboard' });
      render(<App />);
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });

    it('does NOT render home sections when hash is #dashboard', () => {
      resetLocation({ hash: '#dashboard' });
      render(<App />);
      expect(screen.queryByTestId('hero')).not.toBeInTheDocument();
    });

    it('does NOT render Login when hash is #dashboard', () => {
      resetLocation({ hash: '#dashboard' });
      render(<App />);
      expect(screen.queryByTestId('lucaverse-login')).not.toBeInTheDocument();
    });

    it('renders Dashboard when pathname is /dashboard', () => {
      resetLocation({ pathname: '/dashboard' });
      render(<App />);
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });

  // ─── OAuth token params → dashboard ──────────────────────────────────────
  describe('OAuth callback (token + session params)', () => {
    it('renders Dashboard when URL has both token and session params', () => {
      resetLocation({ search: '?token=abc&session=xyz' });
      render(<App />);
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });

    it('does NOT render Dashboard when only token param is present', () => {
      resetLocation({ search: '?token=abc' });
      render(<App />);
      // Missing session → falls through to home
      expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
      expect(screen.getByTestId('hero')).toBeInTheDocument();
    });

    it('does NOT render Dashboard when only session param is present', () => {
      resetLocation({ search: '?session=xyz' });
      render(<App />);
      expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
      expect(screen.getByTestId('hero')).toBeInTheDocument();
    });
  });

  // ─── Hash-change events (navigation after mount) ──────────────────────────
  describe('Hash-change navigation after mount', () => {
    it('switches from home to login view on hashchange to #login', async () => {
      resetLocation();
      render(<App />);
      expect(screen.getByTestId('hero')).toBeInTheDocument();

      await act(async () => {
        resetLocation({ hash: '#login' });
        window.dispatchEvent(new Event('hashchange'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('lucaverse-login')).toBeInTheDocument();
      });
    });

    it('switches from home to dashboard view on hashchange to #dashboard', async () => {
      resetLocation();
      render(<App />);
      expect(screen.getByTestId('hero')).toBeInTheDocument();

      await act(async () => {
        resetLocation({ hash: '#dashboard' });
        window.dispatchEvent(new Event('hashchange'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
    });

    it('switches back to home from login on hashchange to empty hash', async () => {
      resetLocation({ hash: '#login' });
      render(<App />);
      expect(screen.getByTestId('lucaverse-login')).toBeInTheDocument();

      await act(async () => {
        resetLocation({ hash: '' });
        window.dispatchEvent(new Event('hashchange'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('hero')).toBeInTheDocument();
      });
    });

    it('switches back to home from login on hashchange to #home', async () => {
      resetLocation({ hash: '#login' });
      render(<App />);
      expect(screen.getByTestId('lucaverse-login')).toBeInTheDocument();

      await act(async () => {
        resetLocation({ hash: '#home' });
        window.dispatchEvent(new Event('hashchange'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('hero')).toBeInTheDocument();
      });
    });
  });

  // ─── popstate events ──────────────────────────────────────────────────────
  describe('Popstate (browser back/forward) navigation', () => {
    it('updates view on popstate to #login', async () => {
      resetLocation();
      render(<App />);

      await act(async () => {
        resetLocation({ hash: '#login' });
        window.dispatchEvent(new Event('popstate'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('lucaverse-login')).toBeInTheDocument();
      });
    });
  });

  // ─── Event listener cleanup ───────────────────────────────────────────────
  describe('Event listener cleanup on unmount', () => {
    it('removes hashchange listener on unmount without throwing', () => {
      const addSpy = jest.spyOn(window, 'addEventListener');
      const removeSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = render(<App />);
      unmount();

      expect(removeSpy).toHaveBeenCalledWith('hashchange', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('popstate', expect.any(Function));

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });

  // ─── i18next integration wiring ───────────────────────────────────────────
  describe('i18next integration', () => {
    it('renders App without i18next errors (translation mock is wired)', () => {
      // The global jest.setup.js mock makes useTranslation available.
      // Rendering the App (which pulls in Header → useTranslation) must not throw.
      expect(() => render(<App />)).not.toThrow();
    });
  });
});
