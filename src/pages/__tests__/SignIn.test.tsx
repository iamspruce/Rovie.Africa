import { StrictMode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const getMe = vi.fn();
const getAuthMethods = vi.fn();
const signInWithEmail = vi.fn();
const sendMagicLink = vi.fn();
const detectVisitorCountry = vi.fn();

vi.mock('../../sdk', () => ({
  rovie: {
    portal: {
      getMe: (...args: unknown[]) => getMe(...args),
      getAuthMethods: (...args: unknown[]) => getAuthMethods(...args),
      signInWithEmail: (...args: unknown[]) => signInWithEmail(...args),
      sendMagicLink: (...args: unknown[]) => sendMagicLink(...args),
      signOut: vi.fn(),
      googleSignInUrl: (callback: string) =>
        `http://localhost:4002/auth/sign-in/social?provider=google&callbackURL=${encodeURIComponent(callback)}`,
    },
    geo: { detectVisitorCountry: (...args: unknown[]) => detectVisitorCountry(...args) },
  },
}));

import { AuthProvider } from '../../context/AuthContext';
import { SignIn } from '../SignIn/SignIn';

function renderSignIn(initialEntry = '/signin') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <SignIn />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('SignIn page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMe.mockResolvedValue(null); // signed out
    getAuthMethods.mockResolvedValue({ google: false, magicLink: true, emailPassword: true });
    detectVisitorCountry.mockResolvedValue({ countryCode: 'NG', countryName: 'Nigeria' });
  });

  it('renders the form and the Africa plate beside it', async () => {
    renderSignIn();

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    // The plate is the left column - a real labelled map, not a decorative img.
    expect(screen.getByRole('img', { name: /Map of Africa/ })).toBeInTheDocument();
  });

  it('marks the visitor country on the plate once detection lands', async () => {
    renderSignIn();
    expect(
      await screen.findByRole('img', { name: 'Map of Africa with Nigeria marked' })
    ).toBeInTheDocument();
    expect(screen.getByText('Nigeria')).toBeInTheDocument();
    // The caption states the consequence, not the picture.
    expect(screen.getByText('NGN')).toBeInTheDocument();
  });

  it('falls back to neutral copy when the country cannot be detected', async () => {
    detectVisitorCountry.mockRejectedValue(new Error('blocked'));
    renderSignIn();

    expect(await screen.findByText(/Frontier AI, priced for Africa/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Map of Africa' })).toBeInTheDocument();
  });

  it('signs in with email and password', async () => {
    const user = userEvent.setup();
    signInWithEmail.mockResolvedValue({ token: 'abc' });
    renderSignIn();

    await user.type(await screen.findByLabelText('Email'), 'dev@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse-battery');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() =>
      expect(signInWithEmail).toHaveBeenCalledWith({
        email: 'dev@example.com',
        password: 'correct-horse-battery',
      })
    );
  });

  it('shows a readable message when the credentials are rejected', async () => {
    const user = userEvent.setup();
    const { RovieApiError } = await import('../../sdk/httpClient');
    signInWithEmail.mockRejectedValue(
      new RovieApiError('failed', { status: 401, body: { code: 'INVALID_EMAIL_OR_PASSWORD' } })
    );
    renderSignIn();

    await user.type(await screen.findByLabelText('Email'), 'dev@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password-here');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That email and password don’t match an account.'
    );
  });

  it('switches to a magic link and confirms where it was sent', async () => {
    const user = userEvent.setup();
    sendMagicLink.mockResolvedValue({ status: true });
    renderSignIn();

    await user.type(await screen.findByLabelText('Email'), 'dev@example.com');
    await user.click(await screen.findByRole('button', { name: 'Sign in with a link instead' }));

    // The password field is gone - a link flow has no password to give.
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Email me a link' }));

    await waitFor(() => expect(sendMagicLink).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent(/Check dev@example.com/);
  });

  it('does not show a connection error when StrictMode aborts the first request', async () => {
    // The reported bug: React mounts effects twice in development, the
    // cleanup aborts the first /auth-config request, and that abort was
    // surfacing as "Can't reach Rovie right now" on a healthy backend.
    // Here the mock behaves the way the real SDK now does - an aborted
    // request rejects with a genuine AbortError.
    getAuthMethods.mockImplementation((signal?: AbortSignal) => {
      if (signal?.aborted) {
        return Promise.reject(
          Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' })
        );
      }
      return new Promise((resolve, reject) => {
        signal?.addEventListener('abort', () =>
          reject(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' }))
        );
        setTimeout(() => resolve({ google: false, magicLink: true, emailPassword: true }), 0);
      });
    });

    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/signin']}>
          <AuthProvider>
            <SignIn />
          </AuthProvider>
        </MemoryRouter>
      </StrictMode>
    );

    // The alternative sign-in link only renders once the methods resolve, so
    // waiting for it proves the second request landed.
    expect(
      await screen.findByRole('button', { name: 'Sign in with a link instead' })
    ).toBeInTheDocument();
    expect(screen.queryByText(/Can’t reach Rovie|Can't reach Rovie/)).not.toBeInTheDocument();
  });

  it('hides the Google button when the provider is not configured', async () => {
    renderSignIn();
    await screen.findByLabelText('Email');
    expect(screen.queryByRole('button', { name: /Continue with Google/ })).not.toBeInTheDocument();
  });

  it('shows the Google button when portal-api reports it configured', async () => {
    getAuthMethods.mockResolvedValue({ google: true, magicLink: true, emailPassword: true });
    renderSignIn();
    expect(await screen.findByRole('button', { name: /Continue with Google/ })).toBeInTheDocument();
  });
});
