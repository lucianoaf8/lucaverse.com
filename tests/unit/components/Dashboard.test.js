/**
 * Dashboard Component Tests
 * Tests the main dashboard component with authentication, user data display, and security features
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Dashboard from '../../../src/components/Dashboard/Dashboard';

// Mock the useAuth hook
const mockLogout = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock security utils
jest.mock('../../../src/utils/securityUtils', () => ({
  sanitizeOAuthUserData: jest.fn((user) => user),
  safeRender: jest.fn((value, fallback) => value || fallback),
  isValidImageUrl: jest.fn((url) => url && url.startsWith('https://')),
}));

// CSS modules are mocked in jest.setup.js

describe('Dashboard Component', () => {
  const mockUser = {
    id: 'test-user-123',
    name: 'John Doe',
    email: 'john@example.com',
    picture: 'https://example.com/avatar.jpg',
    permissions: ['user', 'dashboard'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogout.mockClear();
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading is true', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        logout: mockLogout,
      });

      render(<Dashboard />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('generic')).toHaveClass('dashboardLoading');
    });

    it('displays loading spinner with correct structure', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        logout: mockLogout,
      });

      render(<Dashboard />);

      const loadingContainer = screen.getByText('Loading...').parentElement;
      expect(loadingContainer).toHaveClass('loadingContainer');
      
      const spinner = loadingContainer.querySelector('.spinner');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Access Denied State', () => {
    it('shows access denied when user is null and not loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        logout: mockLogout,
      });

      render(<Dashboard />);

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('Please log in to access the Lucaverse.')).toBeInTheDocument();
      expect(screen.getByText('Return Home')).toBeInTheDocument();
    });

    it('has correct link to home page', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        logout: mockLogout,
      });

      render(<Dashboard />);

      const homeLink = screen.getByText('Return Home');
      expect(homeLink.tagName).toBe('A');
      expect(homeLink).toHaveAttribute('href', '/');
      expect(homeLink).toHaveClass('btn');
    });
  });

  describe('Authenticated User Dashboard', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        logout: mockLogout,
      });
    });

    it('displays welcome message with user name', () => {
      render(<Dashboard />);

      expect(screen.getByText('Welcome to the Lucaverse, John Doe!')).toBeInTheDocument();
    });

    it('shows user information correctly', () => {
      render(<Dashboard />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('displays user permissions', () => {
      render(<Dashboard />);

      expect(screen.getByText('Permissions:')).toBeInTheDocument();
      expect(screen.getByText('user, dashboard')).toBeInTheDocument();
    });

    it('shows default permissions when user has no permissions', () => {
      const userWithoutPermissions = { ...mockUser, permissions: [] };
      mockUseAuth.mockReturnValue({
        user: userWithoutPermissions,
        loading: false,
        logout: mockLogout,
      });

      render(<Dashboard />);

      expect(screen.getByText('Basic access')).toBeInTheDocument();
    });

    it('renders logout button and handles click', () => {
      render(<Dashboard />);

      const logoutButton = screen.getByText('Logout');
      expect(logoutButton).toBeInTheDocument();
      expect(logoutButton.tagName).toBe('BUTTON');

      fireEvent.click(logoutButton);
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('displays feature cards', () => {
      render(<Dashboard />);

      // Check for all three feature cards
      expect(screen.getByText('AI Assistants')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();

      // Check for feature descriptions
      expect(screen.getByText('Access your personalized AI tools and workflows.')).toBeInTheDocument();
      expect(screen.getByText('Manage and collaborate on your innovative projects.')).toBeInTheDocument();
      expect(screen.getByText('Track your progress and insights across all platforms.')).toBeInTheDocument();
    });
  });

  describe('User Avatar Display', () => {
    it('displays user image when valid URL is provided', () => {
      render(<Dashboard />);

      const avatar = screen.getByAltText('John Doe');
      expect(avatar.tagName).toBe('IMG');
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      expect(avatar).toHaveClass('userAvatar');
    });

    it('shows default avatar when no picture is provided', () => {
      const userWithoutPicture = { ...mockUser, picture: null };
      mockUseAuth.mockReturnValue({
        user: userWithoutPicture,
        loading: false,
        logout: mockLogout,
      });

      render(<Dashboard />);

      const defaultAvatar = screen.getByText('J'); // First letter of name
      expect(defaultAvatar.parentElement).toHaveClass('userAvatar');
      expect(defaultAvatar.parentElement).toHaveClass('defaultAvatar');
    });

    it('handles image load error by hiding the image', () => {
      render(<Dashboard />);

      const avatar = screen.getByAltText('John Doe');
      
      // Simulate image load error
      fireEvent.error(avatar);
      
      expect(avatar.style.display).toBe('none');
    });

    it('shows default avatar when image URL is invalid', () => {
      // Mock isValidImageUrl to return false
      const { isValidImageUrl } = require('../../../src/utils/securityUtils');
      isValidImageUrl.mockReturnValue(false);

      const userWithInvalidImage = { ...mockUser, picture: 'invalid-url' };
      mockUseAuth.mockReturnValue({
        user: userWithInvalidImage,
        loading: false,
        logout: mockLogout,
      });

      render(<Dashboard />);

      const defaultAvatar = screen.getByText('J'); // First letter of name
      expect(defaultAvatar.parentElement).toHaveClass('defaultAvatar');
    });
  });

  describe('Security Features', () => {
    it('calls sanitizeOAuthUserData for user data', () => {
      const { sanitizeOAuthUserData } = require('../../../src/utils/securityUtils');
      
      render(<Dashboard />);

      expect(sanitizeOAuthUserData).toHaveBeenCalledWith(mockUser);
    });

    it('uses safeRender for displaying user data', () => {
      const { safeRender } = require('../../../src/utils/securityUtils');
      
      render(<Dashboard />);

      expect(safeRender).toHaveBeenCalledWith(mockUser.name, 'User');
      expect(safeRender).toHaveBeenCalledWith(mockUser.name, 'Unknown User');
      expect(safeRender).toHaveBeenCalledWith(mockUser.email, 'No email');
    });

    it('validates image URLs before displaying', () => {
      const { isValidImageUrl } = require('../../../src/utils/securityUtils');
      
      render(<Dashboard />);

      expect(isValidImageUrl).toHaveBeenCalledWith(mockUser.picture);
    });

    it('handles missing user name gracefully', () => {
      const userWithoutName = { ...mockUser, name: null };
      mockUseAuth.mockReturnValue({
        user: userWithoutName,
        loading: false,
        logout: mockLogout,
      });

      render(<Dashboard />);

      // Should use fallback values from safeRender
      expect(screen.getByText('Welcome to the Lucaverse, User!')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        logout: mockLogout,
      });
    });

    it('has correct CSS classes applied', () => {
      const { container } = render(<Dashboard />);

      expect(container.firstChild).toHaveClass('dashboard');
      expect(screen.getByRole('banner')).toHaveClass('dashboardHeader');
      expect(screen.getByRole('main')).toHaveClass('dashboardContent');
    });

    it('has proper semantic HTML structure', () => {
      render(<Dashboard />);

      expect(screen.getByRole('banner')).toBeInTheDocument(); // header
      expect(screen.getByRole('main')).toBeInTheDocument(); // main
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });

    it('displays welcome section with emoji', () => {
      render(<Dashboard />);

      expect(screen.getByText('🎉 You\'re in the Lucaverse!')).toBeInTheDocument();
      expect(screen.getByText('This is your protected dashboard.')).toBeInTheDocument();
    });

    it('renders features grid with three cards', () => {
      render(<Dashboard />);

      const featureCards = screen.getAllByText(/AI Assistants|Projects|Analytics/);
      expect(featureCards).toHaveLength(3);
    });

    it('has responsive layout classes', () => {
      const { container } = render(<Dashboard />);

      const featuresGrid = container.querySelector('.featuresGrid');
      expect(featuresGrid).toBeInTheDocument();
      
      const featureCards = container.querySelectorAll('.featureCard');
      expect(featureCards).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined user gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: undefined,
        loading: false,
        logout: mockLogout,
      });

      render(<Dashboard />);

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    it('handles user without permissions array', () => {
      const userWithoutPermissionsArray = { ...mockUser };
      delete userWithoutPermissionsArray.permissions;
      
      mockUseAuth.mockReturnValue({
        user: userWithoutPermissionsArray,
        loading: false,
        logout: mockLogout,
      });

      render(<Dashboard />);

      expect(screen.getByText('Basic access')).toBeInTheDocument();
    });

    it('handles very long user names', () => {
      const userWithLongName = { 
        ...mockUser, 
        name: 'A'.repeat(100) // Very long name
      };
      
      mockUseAuth.mockReturnValue({
        user: userWithLongName,
        loading: false,
        logout: mockLogout,
      });

      render(<Dashboard />);

      // Should still render without errors
      expect(screen.getByText(`Welcome to the Lucaverse, ${'A'.repeat(100)}!`)).toBeInTheDocument();
    });

    it('handles missing email gracefully', () => {
      const userWithoutEmail = { ...mockUser, email: null };
      mockUseAuth.mockReturnValue({
        user: userWithoutEmail,
        loading: false,
        logout: mockLogout,
      });

      render(<Dashboard />);

      // Should use fallback from safeRender
      expect(screen.getByText('No email')).toBeInTheDocument();
    });
  });
});