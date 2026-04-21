import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, vi, beforeEach, expect } from 'vitest';

// Mock errorTracker FIRST
vi.mock('../../../shared/observability/errorTracker', () => ({
  captureClientException: vi.fn(),
}));

// Import apiClient and spy on its methods
import * as apiClientModule from '../../utils/api/apiClient';
vi.spyOn(apiClientModule, 'apiGet').mockImplementation((path) => {
  if (path === '/me') return Promise.resolve({ user: null });
  return Promise.resolve({});
});
vi.spyOn(apiClientModule, 'apiPost').mockResolvedValue({});

const { apiGet, apiPost } = apiClientModule;

import { AuthProvider, useAuth } from '../../context/AuthContext';
import { STORAGE_AUTH_SESSION, STORAGE_USER } from '../../context/auth/constants';
import AuthModal from './AuthModal';

const MockComponent = () => {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="is-authenticated">{auth.isAuthenticated ? 'true' : 'false'}</span>
      <button data-testid="login-btn" onClick={() => auth.loginPassword('test@example.com', 'password123')}>
        Login
      </button>
      <button data-testid="register-btn" onClick={() => auth.registerWithUsername('testuser', '+79991234567', 'password123')}>
        Register
      </button>
      <button data-testid="logout-btn" onClick={auth.logout}>
        Logout
      </button>
    </div>
  );
};

const renderWithProvider = async (ui) => {
  render(<AuthProvider>{ui}</AuthProvider>);
  // AuthContext now calls GET /me on init, just wait for it to settle
  await new Promise((r) => setTimeout(r, 50));
};

const renderModal = async () => {
  await renderWithProvider(<AuthModal onClose={() => {}} />);
};

const clearAuthStorage = () => {
  localStorage.removeItem(STORAGE_AUTH_SESSION);
  localStorage.removeItem(STORAGE_USER);
};

describe('AuthContext Tests', () => {
   beforeEach(() => {
     vi.clearAllMocks();
     clearAuthStorage();

     // Reset mock implementations
     apiGet.mockImplementation((path) => {
       if (path === '/me') return Promise.resolve({ user: null });
       return Promise.resolve({});
     });
     apiPost.mockResolvedValue({});
   });

  it('should initialize with null values', async () => {
    await renderWithProvider(<MockComponent />);
    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
  });

  it('should allow user to login and become authenticated', async () => {
    const mockUser = { id: 1, name: 'Test User' };
    apiPost.mockResolvedValue({ user: mockUser });

    await renderWithProvider(<MockComponent />);

    fireEvent.click(screen.getByTestId('login-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
    });
  });

  it('should allow user to register', async () => {
    const mockUser = { id: 1, name: 'New User' };
    apiPost.mockResolvedValue({ user: mockUser });

    await renderWithProvider(<MockComponent />);

    fireEvent.click(screen.getByTestId('register-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
    });
  });

  it('should allow user to logout', async () => {
    const mockUser = { id: 1, name: 'Test User' };
    apiPost.mockResolvedValueOnce({ user: mockUser });

    await renderWithProvider(<MockComponent />);

    fireEvent.click(screen.getByTestId('login-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
    });

    fireEvent.click(screen.getByTestId('logout-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    });
  });
});

describe('AuthModal Component Tests', () => {
   beforeEach(() => {
     vi.clearAllMocks();
     clearAuthStorage();

     // Reset mock implementations
     apiGet.mockImplementation((path) => {
       if (path === '/me') return Promise.resolve({ user: null });
       return Promise.resolve({});
     });
     apiPost.mockResolvedValue({});
   });

  it('should render the modal with initial state', async () => {
    await renderModal();

    expect(screen.getByTestId('auth-modal-title')).toBeInTheDocument();
    expect(screen.getByTestId('auth-select-login')).toBeInTheDocument();
    expect(screen.getByTestId('auth-select-register')).toBeInTheDocument();
  });

  it('should switch to registration form when register button is clicked', async () => {
    await renderModal();

    fireEvent.click(screen.getByTestId('auth-select-register'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-register-username')).toBeInTheDocument();
    });

    expect(screen.getByTestId('auth-register-phone')).toBeInTheDocument();
    expect(screen.getByTestId('auth-register-password')).toBeInTheDocument();
    expect(screen.getByTestId('auth-register-confirm-password')).toBeInTheDocument();
    expect(screen.getByTestId('auth-register-request-code')).toBeInTheDocument();
  });

  it('should switch to login form when login button is clicked', async () => {
    await renderModal();

    fireEvent.click(screen.getByTestId('auth-select-register'));
    await waitFor(() => {
      expect(screen.getByTestId('auth-register-to-login')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('auth-register-to-login'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-login-submit')).toBeInTheDocument();
    });

    expect(screen.getByTestId('auth-login-to-register')).toBeInTheDocument();
  });

  it('should show error when login form is submitted with empty fields', async () => {
    await renderModal();

    fireEvent.click(screen.getByTestId('auth-select-login'));
    await waitFor(() => {
      expect(screen.getByTestId('auth-login-submit')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('auth-login-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-error')).toBeInTheDocument();
    });

    expect(apiPost).not.toHaveBeenCalled();
  });

  it('should show error when registration form is submitted with mismatched passwords', async () => {
    await renderModal();

    fireEvent.click(screen.getByTestId('auth-select-register'));
    await waitFor(() => {
      expect(screen.getByTestId('auth-register-request-code')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('auth-register-username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByTestId('auth-register-phone'), { target: { value: '+79991234567' } });
    fireEvent.change(screen.getByTestId('auth-register-password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByTestId('auth-register-confirm-password'), { target: { value: 'differentpassword' } });

    // Check required consents
    fireEvent.click(screen.getByTestId('terms-agreement-checkbox'));
    fireEvent.click(screen.getByTestId('sms-consent-checkbox'));
    fireEvent.click(screen.getByTestId('auth-register-request-code'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-error')).toBeInTheDocument();
    });

    expect(apiPost).not.toHaveBeenCalled();
  });
});
