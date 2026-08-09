import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const getMe = vi.fn();
const getUsage = vi.fn();
const listRequests = vi.fn();
const getFxRates = vi.fn();

vi.mock('../../sdk', () => ({
  rovie: {
    portal: {
      getMe: (...args: unknown[]) => getMe(...args),
      getUsage: (...args: unknown[]) => getUsage(...args),
      listRequests: (...args: unknown[]) => listRequests(...args),
      usageCsvUrl: (days: number) => `http://portal.test/me/usage.csv?window=${days}`,
      signOut: vi.fn(),
    },
    account: {
      getFxRates: (...args: unknown[]) => getFxRates(...args),
    },
  },
}));

import { AuthProvider } from '../../context/AuthContext';
import { Usage } from '../Dashboard/Usage';

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

const SNAPSHOT = {
  windowDays: 30,
  since: '2026-07-09',
  generatedAt: '2026-08-08T00:00:00.000Z',
  totals: {
    tokens: 1_240_000,
    promptTokens: 900_000,
    completionTokens: 340_000,
    spendUsd: 12.5,
    requests: 412,
    successfulRequests: 400,
    failedRequests: 12,
    cachedTokens: 180_000,
  },
  trend: [
    { date: '2026-08-06', tokens: 400_000, spendUsd: 4, requests: 140 },
    { date: '2026-08-07', tokens: 840_000, spendUsd: 8.5, requests: 272 },
  ],
  models: [
    {
      model: 'claude-sonnet-5',
      provider: 'anthropic',
      tokens: 1_000_000,
      spendUsd: 10,
      requests: 300,
      failedRequests: 2,
    },
    {
      model: 'gpt-5.6-luna',
      provider: 'openai',
      tokens: 240_000,
      spendUsd: 2.5,
      requests: 112,
      failedRequests: 10,
    },
  ],
  providers: [
    { provider: 'anthropic', tokens: 1_000_000, spendUsd: 10, requests: 300 },
    { provider: 'openai', tokens: 240_000, spendUsd: 2.5, requests: 112 },
  ],
  projects: [],
  sessions: {
    sessions: 18,
    medianSpendUsd: 0.42,
    p90SpendUsd: 1.8,
    medianTokens: 24_000,
    medianRequests: 9,
  },
  latency: [],
};

function renderUsage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Usage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Dashboard usage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMe.mockResolvedValue({ user: USER, needsCountry: false });
    getUsage.mockResolvedValue(SNAPSHOT);
    listRequests.mockResolvedValue({ requests: [] });
    getFxRates.mockResolvedValue({ currencies: {}, supported: [], fetchedAt: Date.now() });
  });

  it('reports what was spent, on what, over the window', async () => {
    renderUsage();

    expect(await screen.findByText('Spent')).toBeInTheDocument();
    expect(screen.getByText('412')).toBeInTheDocument();
    // Ranked by spend, not tokens - the screen answers where the money went.
    expect(await screen.findByText('claude-sonnet-5')).toBeInTheDocument();
    expect(screen.getByText('gpt-5.6-luna')).toBeInTheDocument();
  });

  it('defaults to 30 days and refetches when the period changes', async () => {
    const user = userEvent.setup();
    renderUsage();

    await screen.findByText('Spent');
    expect(getUsage).toHaveBeenCalledWith(30, expect.anything());

    await user.selectOptions(screen.getByLabelText('Period'), '7');
    expect(getUsage).toHaveBeenCalledWith(7, expect.anything());
  });

  it('says how to tag projects rather than showing an empty chart', async () => {
    renderUsage();
    expect(await screen.findByText(/Nothing tagged yet/)).toBeInTheDocument();
  });

  it('offers the export for the period on screen', async () => {
    renderUsage();
    const link = await screen.findByRole('link', { name: 'Export CSV' });
    expect(link).toHaveAttribute('href', expect.stringContaining('window=30'));
  });
});
