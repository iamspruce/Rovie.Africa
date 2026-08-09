import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const resetPassword = vi.fn();
const detectVisitorCountry = vi.fn();

vi.mock('../../sdk', () => ({
  rovie: {
    portal: {
      resetPassword: (...args: unknown[]) => resetPassword(...args),
      getMe: vi.fn().mockResolvedValue(null),
    },
    geo: { detectVisitorCountry: (...args: unknown[]) => detectVisitorCountry(...args) },
  },
}));

import { ResetPassword } from '../ResetPassword/ResetPassword';

function renderAt(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/reset-password${search}`]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/signin" element={<h1>Sign in</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

const NEW_PASSWORD = 'correct-horse-battery';

describe('ResetPassword page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    detectVisitorCountry.mockResolvedValue({ countryCode: 'NG', countryName: 'Nigeria' });
  });

  it('sets a new password with the token from the link', async () => {
    const user = userEvent.setup();
    resetPassword.mockResolvedValue({ status: true });
    renderAt('?token=tok_123');

    await user.type(await screen.findByLabelText('New password'), NEW_PASSWORD);
    await user.type(screen.getByLabelText('Confirm new password'), NEW_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Set new password' }));

    await waitFor(() =>
      expect(resetPassword).toHaveBeenCalledWith({ newPassword: NEW_PASSWORD, token: 'tok_123' })
    );
    // Says the session consequence, because portal-api revokes the others.
    expect(await screen.findByRole('status')).toHaveTextContent(/signed out/);
  });

  // The whole reason the page reads the query string before rendering a form:
  // portal-api has already checked the token by the time anyone gets here.
  it('offers a fresh link instead of a form when the token is rejected', async () => {
    renderAt('?error=INVALID_TOKEN');

    expect(
      await screen.findByRole('heading', { name: 'This link has expired' })
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request a new link' })).toBeInTheDocument();
  });

  it('treats a hand-typed URL with no token the same way', async () => {
    renderAt('');
    expect(
      await screen.findByRole('heading', { name: 'This link has expired' })
    ).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('will not submit two passwords that differ', async () => {
    const user = userEvent.setup();
    renderAt('?token=tok_123');

    await user.type(await screen.findByLabelText('New password'), NEW_PASSWORD);
    await user.type(screen.getByLabelText('Confirm new password'), 'correct-horse-battary');

    expect(screen.getByText('These don’t match.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set new password' })).toBeDisabled();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('holds a password shorter than portal-api will accept', async () => {
    const user = userEvent.setup();
    renderAt('?token=tok_123');

    await user.type(await screen.findByLabelText('New password'), 'short');
    await user.type(screen.getByLabelText('Confirm new password'), 'short');

    expect(screen.getByRole('button', { name: 'Set new password' })).toBeDisabled();
  });

  it('surfaces a token the server rejects at submit time', async () => {
    const user = userEvent.setup();
    const { RovieApiError } = await import('../../sdk/httpClient');
    resetPassword.mockRejectedValue(
      new RovieApiError('failed', { status: 400, body: { code: 'INVALID_TOKEN' } })
    );
    renderAt('?token=tok_expired');

    await user.type(await screen.findByLabelText('New password'), NEW_PASSWORD);
    await user.type(screen.getByLabelText('Confirm new password'), NEW_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Set new password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That reset link has expired or was already used. Request a new one.'
    );
  });
});
