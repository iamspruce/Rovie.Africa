import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const getMe = vi.fn();
const getBalance = vi.fn();
const listApiKeys = vi.fn();
const getUsage = vi.fn();
const getFxRates = vi.fn();

vi.mock('../../sdk', async () => {
  const config = await import('../../sdk/config');
  return {
    config: config.config,
    rovie: {
      portal: {
        getMe: (...args: unknown[]) => getMe(...args),
        getBalance: (...args: unknown[]) => getBalance(...args),
        listApiKeys: (...args: unknown[]) => listApiKeys(...args),
        getUsage: (...args: unknown[]) => getUsage(...args),
        signOut: vi.fn(),
      },
      account: {
        getFxRates: (...args: unknown[]) => getFxRates(...args),
      },
    },
  };
});

import { AuthProvider } from '../../context/AuthContext';
import { Overview } from '../Dashboard/Overview';

const USER = {
  id: 'user-1',
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

const EMPTY_USAGE = {
  windowDays: 7,
  since: '2026-08-01',
  generatedAt: '2026-08-08T00:00:00.000Z',
  totals: {
    tokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    spendUsd: 0,
    requests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cachedTokens: 0,
  },
  trend: [],
  models: [],
  providers: [],
  projects: [],
  sessions: { sessions: 0, medianSpendUsd: 0, p90SpendUsd: 0, medianTokens: 0, medianRequests: 0 },
  latency: [],
};

function balanceOf(availableUsd: number, maxBudgetUsd: number) {
  return {
    availableUsd,
    spendUsd: maxBudgetUsd - availableUsd,
    maxBudgetUsd,
    localCurrency: 'USD',
    availableLocal: availableUsd,
    spendLocal: maxBudgetUsd - availableUsd,
    maxBudgetLocal: maxBudgetUsd,
    currency: 'USD',
    country: 'NG',
  };
}

function renderOverview() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Overview />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Dashboard overview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMe.mockResolvedValue({ user: USER, needsCountry: false });
    listApiKeys.mockResolvedValue({ keys: [] });
    getUsage.mockResolvedValue(EMPTY_USAGE);
    getFxRates.mockResolvedValue({ currencies: {}, supported: [], fetchedAt: Date.now() });
  });

  it('warns while there is still credit left to act on', async () => {
    getBalance.mockResolvedValue(balanceOf(1.5, 20));
    renderOverview();

    expect(await screen.findByText(/Balance running low/)).toBeInTheDocument();
    expect(screen.queryByText(/balance is empty/)).not.toBeInTheDocument();
  });

  it('says requests are being refused once the balance is gone', async () => {
    getBalance.mockResolvedValue(balanceOf(0, 20));
    renderOverview();

    expect(await screen.findByText(/balance is empty/)).toBeInTheDocument();
  });

  it('stays quiet on a healthy balance', async () => {
    getBalance.mockResolvedValue(balanceOf(18, 20));
    renderOverview();

    await screen.findByText('Available');
    expect(screen.queryByText(/Balance running low/)).not.toBeInTheDocument();
    expect(screen.queryByText(/balance is empty/)).not.toBeInTheDocument();
  });

  it('gives a runnable request, not just a base URL', async () => {
    getBalance.mockResolvedValue(balanceOf(18, 20));
    renderOverview();

    expect(await screen.findByText(/curl /)).toBeInTheDocument();
    expect(screen.getByText('Base URL')).toBeInTheDocument();
  });

  it('names the limits a key runs under so a 429 is explainable', async () => {
    getBalance.mockResolvedValue(balanceOf(18, 20));
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
            lifetimeSpendUsd: 2,
            maxBudgetUsd: null,
            tpmLimit: null,
            rpmLimit: 60,
            maxParallelRequests: null,
            models: [],
            blocked: false,
            expiresAt: null,
          },
        },
      ],
    });

    renderOverview();
    expect(await screen.findByText('60')).toBeInTheDocument();
    // An absent limit is stated, not left blank - "unlimited" is an answer.
    expect(screen.getAllByText('Unlimited').length).toBeGreaterThan(0);
  });
});
