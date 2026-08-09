import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const getMe = vi.fn();
const getBalance = vi.fn();
const getDeletionPreview = vi.fn();
const deleteAccount = vi.fn();

vi.mock('../../sdk', () => ({
  rovie: {
    portal: {
      getMe: (...a: unknown[]) => getMe(...a),
      getBalance: (...a: unknown[]) => getBalance(...a),
      getDeletionPreview: (...a: unknown[]) => getDeletionPreview(...a),
      deleteAccount: (...a: unknown[]) => deleteAccount(...a),
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}));

import { AuthProvider } from '../../context/AuthContext';
import { DeleteAccount } from '../Dashboard/DeleteAccount';

const USER = {
  id: 'u1',
  email: 'dev@example.com',
  name: 'Dev',
  emailVerified: false,
  image: null,
  phone: null,
  country: 'NG',
  kycTier: 0,
  createdAt: new Date().toISOString(),
};

function renderDelete() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <DeleteAccount />
      </AuthProvider>
    </MemoryRouter>
  );
}

async function openPanel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Delete account' }));
}

describe('Delete account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMe.mockResolvedValue({ user: USER, needsCountry: false });
    getBalance.mockResolvedValue({
      availableUsd: 12.5,
      spendUsd: 0,
      maxBudgetUsd: 12.5,
      localCurrency: 'NGN',
      availableLocal: 17053.2,
      spendLocal: 0,
      maxBudgetLocal: 17053.2,
      currency: 'NGN',
      country: 'NG',
    });
    getDeletionPreview.mockResolvedValue({
      availableUsd: 12.5,
      balanceKnown: true,
      activeKeys: 2,
      paymentCount: 3,
      retainsLedger: true,
    });
  });

  it('warns with the real credit figure in the user’s own currency', async () => {
    const user = userEvent.setup();
    renderDelete();
    await openPanel(user);

    expect(await screen.findByText(/17,053/)).toBeInTheDocument();
    expect(screen.getByText(/It is forfeited and cannot be refunded/)).toBeInTheDocument();
  });

  it('says the payment record is kept when the account has paid', async () => {
    const user = userEvent.setup();
    renderDelete();
    await openPanel(user);

    expect(
      await screen.findByText(/stay on record without them/)
    ).toBeInTheDocument();
  });

  it('says the account is erased outright when it never paid', async () => {
    const user = userEvent.setup();
    getDeletionPreview.mockResolvedValue({
      availableUsd: 0,
      balanceKnown: true,
      activeKeys: 0,
      paymentCount: 0,
      retainsLedger: false,
    });
    renderDelete();
    await openPanel(user);

    expect(await screen.findByText(/your account is erased outright/)).toBeInTheDocument();
    expect(screen.getByText(/no unspent credit, so nothing is forfeited/)).toBeInTheDocument();
  });

  it('requires the exact confirmation phrase', async () => {
    const user = userEvent.setup();
    renderDelete();
    await openPanel(user);

    const confirm = await screen.findByRole('textbox');
    const button = screen.getByRole('button', { name: 'Delete my account' });

    expect(button).toBeDisabled();
    await user.type(confirm, 'delete');
    expect(button).toBeDisabled();

    await user.clear(confirm);
    await user.type(confirm, 'delete my account');
    expect(button).toBeEnabled();
  });

  it('sends the acknowledged balance so credit cannot be lost to a generic confirm', async () => {
    const user = userEvent.setup();
    deleteAccount.mockResolvedValue({ deleted: true, ledgerRetained: true });
    renderDelete();
    await openPanel(user);

    await user.type(await screen.findByRole('textbox'), 'delete my account');
    await user.click(screen.getByRole('button', { name: 'Delete my account' }));

    await waitFor(() => expect(deleteAccount).toHaveBeenCalledWith(12.5));
  });

  it('refuses to proceed when the balance could not be read', async () => {
    const user = userEvent.setup();
    getDeletionPreview.mockResolvedValue({
      availableUsd: 0,
      balanceKnown: false,
      activeKeys: 1,
      paymentCount: 0,
      retainsLedger: false,
    });
    renderDelete();
    await openPanel(user);

    // Must not imply there is nothing to lose on a figure it never verified.
    expect(await screen.findByText(/couldn’t be read just now|couldn't be read just now/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete my account' })).toBeDisabled();
  });

  it('re-reads the balance when the server reports it moved', async () => {
    const user = userEvent.setup();
    const { RovieApiError } = await import('../../sdk/httpClient');
    deleteAccount.mockRejectedValue(
      new RovieApiError('conflict', {
        status: 409,
        body: {
          error: { code: 'credit_remaining', message: 'You still have 20.00 US dollars of credit.' },
          availableUsd: 20,
        },
      })
    );

    renderDelete();
    await openPanel(user);
    await user.type(await screen.findByRole('textbox'), 'delete my account');
    await user.click(screen.getByRole('button', { name: 'Delete my account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('You still have 20.00 US dollars');
  });

  it('can be backed out of', async () => {
    const user = userEvent.setup();
    renderDelete();
    await openPanel(user);

    await user.click(await screen.findByRole('button', { name: 'Keep my account' }));
    expect(await screen.findByRole('button', { name: 'Delete account' })).toBeInTheDocument();
    expect(deleteAccount).not.toHaveBeenCalled();
  });
});
