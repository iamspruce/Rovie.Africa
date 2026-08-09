import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const getMe = vi.fn();
const updateMe = vi.fn();
const changePassword = vi.fn();
const getBalance = vi.fn();
const getDeletionPreview = vi.fn();

vi.mock('../../sdk', () => ({
  rovie: {
    portal: {
      getMe: (...a: unknown[]) => getMe(...a),
      updateMe: (...a: unknown[]) => updateMe(...a),
      changePassword: (...a: unknown[]) => changePassword(...a),
      getBalance: (...a: unknown[]) => getBalance(...a),
      getDeletionPreview: (...a: unknown[]) => getDeletionPreview(...a),
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}));

import { AuthProvider } from '../../context/AuthContext';
import { Account } from '../Dashboard/Account';

const USER = {
  id: 'u1',
  email: 'dev@example.com',
  name: 'Dev',
  emailVerified: true,
  image: null,
  phone: null,
  country: 'NG',
  kycTier: 0,
  createdAt: new Date().toISOString(),
  lowBalanceThresholdUsd: null,
};

const NEW_PASSWORD = 'correct-horse-battery';

function renderAccount() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Account />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Account password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMe.mockResolvedValue({ user: USER, needsCountry: false });
    getBalance.mockResolvedValue({ availableUsd: 0, localCurrency: 'NGN', availableLocal: 0 });
    getDeletionPreview.mockResolvedValue({
      availableUsd: 0,
      balanceKnown: true,
      activeKeys: 0,
      paymentCount: 0,
      retainsLedger: false,
    });
  });

  it('changes the password and signs other devices out', async () => {
    const user = userEvent.setup();
    changePassword.mockResolvedValue({});
    renderAccount();

    await user.type(await screen.findByLabelText('Current password'), 'old-password-here');
    await user.type(screen.getByLabelText('New password'), NEW_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    await waitFor(() =>
      expect(changePassword).toHaveBeenCalledWith({
        currentPassword: 'old-password-here',
        newPassword: NEW_PASSWORD,
        // A password change is how you shut out a device you've lost.
        revokeOtherSessions: true,
      })
    );
    expect(await screen.findByText('Password changed.')).toBeInTheDocument();
  });

  it('requires the current password, so a borrowed session cannot lock the owner out', async () => {
    const user = userEvent.setup();
    renderAccount();

    await user.type(await screen.findByLabelText('New password'), NEW_PASSWORD);

    expect(screen.getByRole('button', { name: 'Change password' })).toBeDisabled();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('holds a new password shorter than portal-api will accept', async () => {
    const user = userEvent.setup();
    renderAccount();

    await user.type(await screen.findByLabelText('Current password'), 'old-password-here');
    await user.type(screen.getByLabelText('New password'), 'short');

    expect(screen.getByRole('button', { name: 'Change password' })).toBeDisabled();
  });

  it('says the current password was wrong rather than blaming the new one', async () => {
    const user = userEvent.setup();
    const { RovieApiError } = await import('../../sdk/httpClient');
    changePassword.mockRejectedValue(
      new RovieApiError('failed', { status: 400, body: { code: 'INVALID_PASSWORD' } })
    );
    renderAccount();

    await user.type(await screen.findByLabelText('Current password'), 'wrong-password-x');
    await user.type(screen.getByLabelText('New password'), NEW_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That current password isn’t right.');
  });

  it('explains itself on an account that only ever used Google or GitHub', async () => {
    const user = userEvent.setup();
    const { RovieApiError } = await import('../../sdk/httpClient');
    changePassword.mockRejectedValue(
      new RovieApiError('failed', { status: 400, body: { code: 'CREDENTIAL_ACCOUNT_NOT_FOUND' } })
    );
    renderAccount();

    await user.type(await screen.findByLabelText('Current password'), 'anything-at-all');
    await user.type(screen.getByLabelText('New password'), NEW_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This account signs in with Google or GitHub, so it has no password to change.'
    );
  });
});
