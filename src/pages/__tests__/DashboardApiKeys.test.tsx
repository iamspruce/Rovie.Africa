import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const getMe = vi.fn();
const listApiKeys = vi.fn();
const createApiKey = vi.fn();
const revokeApiKey = vi.fn();
const rotateApiKey = vi.fn();
const updateApiKey = vi.fn();
const getModels = vi.fn();
const getFxRates = vi.fn();

vi.mock('../../sdk', () => ({
  rovie: {
    portal: {
      getMe: (...args: unknown[]) => getMe(...args),
      listApiKeys: (...args: unknown[]) => listApiKeys(...args),
      createApiKey: (...args: unknown[]) => createApiKey(...args),
      revokeApiKey: (...args: unknown[]) => revokeApiKey(...args),
      rotateApiKey: (...args: unknown[]) => rotateApiKey(...args),
      updateApiKey: (...args: unknown[]) => updateApiKey(...args),
      signOut: vi.fn(),
    },
    account: {
      getModels: (...args: unknown[]) => getModels(...args),
      getFxRates: (...args: unknown[]) => getFxRates(...args),
    },
  },
}));

import { AuthProvider } from '../../context/AuthContext';
import { ApiKeys } from '../Dashboard/ApiKeys';

const USER = {
  id: 'user-1',
  email: 'dev@example.com',
  name: 'Dev',
  emailVerified: false,
  image: null,
  phone: null,
  country: 'NG',
  kycTier: 0,
  createdAt: new Date().toISOString(),
};

function renderApiKeys() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ApiKeys />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Dashboard API keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMe.mockResolvedValue({ user: USER, needsCountry: false });
    listApiKeys.mockResolvedValue({ keys: [] });
    getModels.mockResolvedValue({ models: [{ litellmModelName: 'claude-sonnet-5' }] });
    getFxRates.mockResolvedValue({ currencies: {}, supported: [], fetchedAt: Date.now() });
  });

  it('invites the user to create a key when they have none', async () => {
    renderApiKeys();
    expect(await screen.findByText(/No keys yet/)).toBeInTheDocument();
  });

  it('shows a new key once, and only once', async () => {
    const user = userEvent.setup();
    createApiKey.mockResolvedValue({ apiKey: 'sk-live-secret-value', shownOnce: true });
    listApiKeys.mockResolvedValue({ keys: [] });

    renderApiKeys();
    await user.type(await screen.findByLabelText('Label'), 'Laptop');
    await user.click(screen.getByRole('button', { name: 'Create key' }));

    const revealed = await screen.findByLabelText('Your new API key');
    expect(revealed).toHaveValue('sk-live-secret-value');
    expect(screen.getByText('Copy your key now')).toBeInTheDocument();

    // Dismissing removes it from the DOM entirely - "shown once" has to mean
    // it is gone, not merely visually hidden.
    await user.click(screen.getByRole('button', { name: /I’ve saved it|I've saved it/ }));
    await waitFor(() =>
      expect(screen.queryByLabelText('Your new API key')).not.toBeInTheDocument()
    );
  });

  it('lists only the prefix of existing keys', async () => {
    listApiKeys.mockResolvedValue({
      keys: [
        {
          id: 'k1',
          keyPrefix: 'sk-abc12345',
          label: 'Laptop',
          createdAt: new Date().toISOString(),
          revokedAt: null,
        },
      ],
    });

    renderApiKeys();
    expect(await screen.findByText('sk-abc12345…')).toBeInTheDocument();
    expect(screen.getByText('Laptop')).toBeInTheDocument();
  });

  it('keeps revoked keys visible so a failing key can be explained', async () => {
    listApiKeys.mockResolvedValue({
      keys: [
        {
          id: 'k1',
          keyPrefix: 'sk-dead0000',
          label: 'Old CI',
          createdAt: new Date('2026-01-01').toISOString(),
          revokedAt: new Date('2026-02-01').toISOString(),
        },
      ],
    });

    renderApiKeys();
    expect(await screen.findByText('sk-dead0000…')).toBeInTheDocument();
    expect(screen.getByText(/Revoked/)).toBeInTheDocument();
    // A revoked key offers no revoke button.
    expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument();
  });

  it('asks before revoking and does nothing if the user cancels', async () => {
    const user = userEvent.setup();
    listApiKeys.mockResolvedValue({
      keys: [
        {
          id: 'k1',
          keyPrefix: 'sk-abc12345',
          label: 'Laptop',
          createdAt: new Date().toISOString(),
          revokedAt: null,
        },
      ],
    });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderApiKeys();
    await user.click(await screen.findByRole('button', { name: 'Revoke' }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(revokeApiKey).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('blocks key creation until a country is set', async () => {
    getMe.mockResolvedValue({ user: { ...USER, country: '' }, needsCountry: true });
    renderApiKeys();

    expect(await screen.findByText(/Set your country first/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create key' })).toBeDisabled();
  });

  it('shows what each key has cost and when it was last used', async () => {
    listApiKeys.mockResolvedValue({
      keys: [
        {
          id: 'k1',
          keyPrefix: 'sk-abc12345',
          label: 'CI',
          createdAt: new Date().toISOString(),
          revokedAt: null,
          usage: {
            windowDays: 30,
            spendUsd: 4.25,
            tokens: 512_000,
            requests: 128,
            lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
          limits: null,
        },
      ],
    });

    renderApiKeys();
    expect(await screen.findByText('$4.25')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('2h ago')).toBeInTheDocument();
  });

  it('reports a key the gateway is blocking, which would otherwise look healthy', async () => {
    listApiKeys.mockResolvedValue({
      keys: [
        {
          id: 'k1',
          keyPrefix: 'sk-abc12345',
          label: 'Laptop',
          createdAt: new Date().toISOString(),
          revokedAt: null,
          usage: null,
          limits: {
            lifetimeSpendUsd: 0,
            maxBudgetUsd: 20,
            tpmLimit: null,
            rpmLimit: null,
            maxParallelRequests: null,
            models: [],
            blocked: true,
            expiresAt: null,
          },
        },
      ],
    });

    renderApiKeys();
    expect(await screen.findByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('Cap $20')).toBeInTheDocument();
  });

  it('reveals the replacement once when a key is rotated', async () => {
    const user = userEvent.setup();
    listApiKeys.mockResolvedValue({
      keys: [
        {
          id: 'k1',
          keyPrefix: 'sk-abc12345',
          label: 'Laptop',
          createdAt: new Date().toISOString(),
          revokedAt: null,
          usage: null,
          limits: null,
        },
      ],
    });
    rotateApiKey.mockResolvedValue({ apiKey: 'sk-live-replacement', id: 'k2', shownOnce: true });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderApiKeys();
    await user.click(await screen.findByRole('button', { name: 'Rotate' }));

    expect(rotateApiKey).toHaveBeenCalledWith('k1');
    expect(await screen.findByLabelText('Your new API key')).toHaveValue('sk-live-replacement');
    confirmSpy.mockRestore();
  });
});
