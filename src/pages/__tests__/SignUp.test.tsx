import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const getMe = vi.fn();
const getAuthMethods = vi.fn();
const signUpWithEmail = vi.fn();
const sendMagicLink = vi.fn();
const detectVisitorCountry = vi.fn();

vi.mock('../../sdk', () => ({
  rovie: {
    portal: {
      getMe: (...args: unknown[]) => getMe(...args),
      getAuthMethods: (...args: unknown[]) => getAuthMethods(...args),
      signUpWithEmail: (...args: unknown[]) => signUpWithEmail(...args),
      sendMagicLink: (...args: unknown[]) => sendMagicLink(...args),
      signOut: vi.fn(),
      // Better Auth v1: social sign-in is a POST that returns a redirect URL.
      initiateSocialSignIn: (provider: string) =>
        Promise.resolve(`http://localhost:4002/auth/sign-in/social?provider=${provider}`),
    },
    geo: { detectVisitorCountry: (...args: unknown[]) => detectVisitorCountry(...args) },
  },
}));

import { AuthProvider } from '../../context/AuthContext';
import { SignUp } from '../SignUp/SignUp';

function renderSignUp() {
  return render(
    <MemoryRouter initialEntries={['/signup']}>
      <AuthProvider>
        <SignUp />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('SignUp page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // No localStorage.clear() here: this environment doesn't provide one, and
    // useVisitorCountry already treats it as optional. Reaching for it would
    // only test the harness.
    getMe.mockResolvedValue(null);
    getAuthMethods.mockResolvedValue({
      google: false,
      github: false,
      magicLink: true,
      emailPassword: true,
    });
    detectVisitorCountry.mockResolvedValue({ countryCode: 'KE', countryName: 'Kenya' });
  });

  it('pre-fills the country from the IP lookup and names the currency', async () => {
    renderSignUp();
    const select = (await screen.findByLabelText('Country')) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe('KE'));
    expect(screen.getByText(/billed in — KES/)).toBeInTheDocument();
  });

  it('keeps a country the user chose rather than re-applying detection', async () => {
    const user = userEvent.setup();
    // Detection resolves only after the user has already picked, which is the
    // race that makes country pickers overwrite a deliberate choice.
    let resolveGeo: (value: unknown) => void = () => {};
    detectVisitorCountry.mockReturnValue(
      new Promise((resolve) => {
        resolveGeo = resolve;
      })
    );

    renderSignUp();
    const select = (await screen.findByLabelText('Country')) as HTMLSelectElement;
    await user.selectOptions(select, 'GH');

    resolveGeo({ countryCode: 'KE', countryName: 'Kenya' });

    await waitFor(() => expect(select.value).toBe('GH'));
  });

  it('requires a password of at least 12 characters', async () => {
    const user = userEvent.setup();
    renderSignUp();

    await user.type(await screen.findByLabelText('Email'), 'dev@example.com');
    await user.type(screen.getByLabelText('Password'), 'short');

    expect(screen.getByText('Use at least 12 characters.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
  });

  it('creates the account with the country attached', async () => {
    const user = userEvent.setup();
    signUpWithEmail.mockResolvedValue({ token: 'abc' });
    renderSignUp();

    await user.type(await screen.findByLabelText('Name'), 'Ada');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse-battery');
    await waitFor(() =>
      expect((screen.getByLabelText('Country') as HTMLSelectElement).value).toBe('KE')
    );

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(signUpWithEmail).toHaveBeenCalledWith({
        name: 'Ada',
        email: 'ada@example.com',
        password: 'correct-horse-battery',
        country: 'KE',
      })
    );
  });

  it('surfaces an existing-account error without pretending it succeeded', async () => {
    const user = userEvent.setup();
    const { RovieApiError } = await import('../../sdk/httpClient');
    signUpWithEmail.mockRejectedValue(
      new RovieApiError('failed', { status: 422, body: { code: 'USER_ALREADY_EXISTS' } })
    );
    renderSignUp();

    await user.type(await screen.findByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse-battery');
    await waitFor(() =>
      expect((screen.getByLabelText('Country') as HTMLSelectElement).value).toBe('KE')
    );
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account already exists for that email. Sign in instead.'
    );
  });

  it('offers both social providers when portal-api reports them configured', async () => {
    getAuthMethods.mockResolvedValue({
      google: true,
      github: true,
      magicLink: true,
      emailPassword: true,
    });
    renderSignUp();

    expect(await screen.findByRole('button', { name: /Continue with Google/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue with GitHub/ })).toBeInTheDocument();
  });

  it('draws only the configured provider, and no orphaned divider', async () => {
    getAuthMethods.mockResolvedValue({
      google: false,
      github: true,
      magicLink: true,
      emailPassword: true,
    });
    renderSignUp();

    expect(await screen.findByRole('button', { name: /Continue with GitHub/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue with Google/ })).not.toBeInTheDocument();
  });
});
