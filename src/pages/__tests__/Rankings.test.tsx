import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { RankingsSnapshot } from '../../lib/rankings';

const useRankings = vi.fn();
const useModels = vi.fn();
const useFxRates = vi.fn();
const useVisitorCountry = vi.fn();

vi.mock('../../hooks/useRankings', () => ({ useRankings: (days: number) => useRankings(days) }));
vi.mock('../../hooks/useModels', () => ({ useModels: () => useModels() }));
vi.mock('../../hooks/useFxRates', () => ({ useFxRates: () => useFxRates() }));
vi.mock('../../hooks/useVisitorCountry', () => ({ useVisitorCountry: () => useVisitorCountry() }));

import { Rankings } from '../Rankings/Rankings';

const snapshot: RankingsSnapshot = {
  windowDays: 30,
  since: '2026-07-09',
  generatedAt: '2026-08-08T00:00:00.000Z',
  totals: { tokens: 12_400_000_000, spendUsd: 4820, requests: 980_000, developers: 1240, countries: 3 },
  trend: [
    { date: '2026-08-06', tokens: 400_000_000, spendUsd: 160, requests: 30_000 },
    { date: '2026-08-07', tokens: 460_000_000, spendUsd: 180, requests: 34_000 },
    { date: '2026-08-08', tokens: 510_000_000, spendUsd: 200, requests: 37_000 },
  ],
  models: [
    { model: 'claude-sonnet-5', provider: 'anthropic', tokens: 6_000_000_000, spendUsd: 3000, requests: 500_000 },
    { model: 'kimi-k2.5', provider: 'moonshot', tokens: 3_000_000_000, spendUsd: 900, requests: 300_000 },
  ],
  providers: [
    { provider: 'anthropic', tokens: 6_000_000_000, spendUsd: 3000, requests: 500_000 },
    { provider: 'moonshot', tokens: 3_000_000_000, spendUsd: 900, requests: 300_000 },
  ],
  countries: [
    { country: 'NG', tokens: 7_000_000_000, spendUsd: 2800, developers: 700, topModel: 'claude-sonnet-5' },
    { country: 'KE', tokens: 3_000_000_000, spendUsd: 1200, developers: 300, topModel: 'kimi-k2.5' },
    { country: 'GH', tokens: 2_400_000_000, spendUsd: 820, developers: 240, topModel: 'kimi-k2.5' },
  ],
  latency: [
    { model: 'kimi-k2.5', medianMs: 2400, medianTokensPerSecond: 92.4, medianFirstTokenMs: 380, requests: 300_000 },
    { model: 'claude-sonnet-5', medianMs: 4100, medianTokensPerSecond: 48.1, medianFirstTokenMs: 720, requests: 500_000 },
  ],
  sessions: { sessions: 18_400, medianSpendUsd: 0.12, p90SpendUsd: 0.94, medianTokens: 42_000, medianRequests: 14 },
  context: [
    { model: 'claude-sonnet-5', medianPromptTokens: 12_000, p90PromptTokens: 100_000, maxPromptTokens: 190_000, requests: 500_000 },
  ],
  tools: [{ tool: 'filesystem/read_file', calls: 92_000 }],
  apps: [{ app: 'opencode', tokens: 6_200_000_000, requests: 400_000 }],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <Rankings />
    </MemoryRouter>
  );
}

describe('Rankings page', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} },
    });
    useRankings.mockReturnValue({
      data: snapshot,
      error: null,
      isLoading: false,
      isInitialLoad: false,
    });
    useModels.mockReturnValue({
      data: {
        models: [
          {
            litellmModelName: 'claude-sonnet-5',
            provider: 'anthropic',
            name: 'Claude Sonnet 5',
            limit: { context: 200_000 },
          },
        ],
      },
      error: null,
      isLoading: false,
    });
    useFxRates.mockReturnValue({ data: null });
    useVisitorCountry.mockReturnValue({ country: null, isLoading: false });
  });

  it('says so, loudly, when the figures on screen are sample data', () => {
    useRankings.mockReturnValue({
      data: snapshot,
      error: null,
      isLoading: false,
      isInitialLoad: false,
      isDemo: true,
    });
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent(/sample data/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/made up/i);
    // The claim that the figures are measured must not survive alongside it.
    expect(screen.queryByText(/every figure below is measured/i)).not.toBeInTheDocument();
  });

  it('makes no such claim when the data is real', () => {
    renderPage();
    expect(screen.queryByText(/sample data/i)).not.toBeInTheDocument();
    expect(screen.getByText(/every figure below is measured/i)).toBeInTheDocument();
  });

  it('leads with the headline totals', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /what africa is building with/i })).toBeInTheDocument();
    expect(screen.getByText('12B')).toBeInTheDocument();
    expect(screen.getByText('1,240')).toBeInTheDocument();
    expect(screen.getByText(/in 3 countries/i)).toBeInTheDocument();
  });

  it('shows a loading state only on the very first load', () => {
    useRankings.mockReturnValue({ data: null, error: null, isLoading: true, isInitialLoad: true });
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent(/loading usage data/i);
  });

  it('surfaces a failed fetch', () => {
    useRankings.mockReturnValue({
      data: null,
      error: new Error('boom'),
      isLoading: false,
      isInitialLoad: false,
    });
    renderPage();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('ranks countries by name with their developer counts', () => {
    renderPage();
    const section = screen.getByRole('region', { name: /where the continent is building/i });
    expect(within(section).getByText('Nigeria')).toBeInTheDocument();
    expect(within(section).getByText(/700 developers · mostly claude-sonnet-5/i)).toBeInTheDocument();
  });

  it('caps a long country list at eight and offers the rest behind a button', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 20 }, (_, index) => ({
      country: ['NG', 'KE', 'ZA', 'GH', 'EG', 'UG', 'TZ', 'ET', 'MA', 'RW', 'SN', 'CI', 'CM', 'ZM', 'TN', 'ZW', 'DZ', 'BJ', 'MU', 'BW'][index],
      tokens: (20 - index) * 1_000_000,
      spendUsd: 10,
      developers: 20 - index,
      topModel: 'kimi-k2.5',
    }));
    useRankings.mockReturnValue({
      data: { ...snapshot, countries: many },
      error: null,
      isLoading: false,
      isInitialLoad: false,
      isDemo: false,
    });
    renderPage();

    const section = screen.getByRole('region', { name: /where the continent is building/i });
    expect(within(section).queryByText('Botswana')).not.toBeInTheDocument();

    await user.click(within(section).getByRole('button', { name: /show all 20 countries/i }));
    expect(within(section).getByText('Botswana')).toBeInTheDocument();
  });

  it('refetches when the window changes', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(screen.getByRole('combobox', { name: /window/i }), '90');
    await waitFor(() => expect(useRankings).toHaveBeenCalledWith(90));
  });

  it('reads prompt sizes against the catalog context window', () => {
    renderPage();
    const section = screen.getByRole('region', { name: /context length/i });
    // 100K p90 against a 200K window.
    expect(within(section).getByText(/200K window · 50% used/i)).toBeInTheDocument();
  });

  it('reports how much traffic the app list actually covers', () => {
    renderPage();
    const section = screen.getByRole('region', { name: /top apps/i });
    // 6.2B of 12.4B tokens attributed.
    expect(within(section).getByText(/covers 50% of traffic/i)).toBeInTheDocument();
  });

  it('says an unidentified app list is empty rather than guessing', () => {
    useRankings.mockReturnValue({
      data: { ...snapshot, apps: [] },
      error: null,
      isLoading: false,
      isInitialLoad: false,
    });
    renderPage();
    const section = screen.getByRole('region', { name: /top apps/i });
    expect(within(section).getByText(/no apps have identified themselves/i)).toBeInTheDocument();
    expect(within(section).getByText(/don’t guess|don't guess/i)).toBeInTheDocument();
  });

  it('explains an empty session section instead of showing zeroes', () => {
    useRankings.mockReturnValue({
      data: {
        ...snapshot,
        sessions: { sessions: 0, medianSpendUsd: 0, p90SpendUsd: 0, medianTokens: 0, medianRequests: 0 },
      },
      error: null,
      isLoading: false,
      isInitialLoad: false,
    });
    renderPage();
    const section = screen.getByRole('region', { name: /cost per session/i });
    expect(within(section).getByText(/no sessions recorded yet/i)).toBeInTheDocument();
    expect(within(section).queryByText('$0.00')).not.toBeInTheDocument();
  });

  it('prices in local currency when a rate and country are available', () => {
    useFxRates.mockReturnValue({
      data: { currencies: { NGN: { ratePerUsd: 1500 } }, supported: ['NGN'], fetchedAt: 0 },
    });
    useVisitorCountry.mockReturnValue({
      country: { numericId: '566', alpha2: 'NG', alpha3: 'NGA', name: 'Nigeria' },
      isLoading: false,
    });
    renderPage();
    // $4,820 spend at 1500/USD.
    expect(screen.getByText('₦7,230,000')).toBeInTheDocument();
  });

  it('names every section it renders', () => {
    renderPage();
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual([
      'Daily volume',
      'Where the continent is building',
      'Top models',
      'Market share',
      'Fastest models',
      'Cost per session',
      'Context length',
      'Tool calls',
      'Top apps',
    ]);
  });
});
