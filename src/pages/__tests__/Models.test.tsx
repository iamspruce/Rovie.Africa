import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { Model } from '../../lib/models';

const useModels = vi.fn();
const useFxRates = vi.fn();
const useVisitorCountry = vi.fn();

vi.mock('../../hooks/useModels', () => ({ useModels: () => useModels() }));
vi.mock('../../hooks/useFxRates', () => ({ useFxRates: () => useFxRates() }));
vi.mock('../../hooks/useVisitorCountry', () => ({
  useVisitorCountry: () => useVisitorCountry(),
}));

import { Models } from '../Models/Models';

const catalog: Model[] = [
  {
    litellmModelName: 'claude-sonnet-5',
    provider: 'anthropic',
    name: 'Claude Sonnet 5',
    limit: { context: 200_000, output: 8192 },
    cost: { input: 3, output: 15 },
    modalities: { input: ['text', 'image'], output: ['text'] },
    tool_call: true,
    reasoning: true,
    release_date: '2026-02-11',
  },
  {
    litellmModelName: 'kimi-k2.5',
    provider: 'moonshot',
    name: 'Kimi K2.5',
    limit: { context: 128_000, output: 4096 },
    cost: { input: 0.6, output: 2.5 },
    modalities: { input: ['text'], output: ['text'] },
    tool_call: true,
    release_date: '2025-11-02',
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <Models />
    </MemoryRouter>
  );
}

describe('Models page', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
      },
    });
    useModels.mockReturnValue({ data: { models: catalog }, error: null, isLoading: false });
    useFxRates.mockReturnValue({
      data: { currencies: { NGN: { ratePerUsd: 1500 } }, supported: ['NGN'], fetchedAt: 0 },
    });
    useVisitorCountry.mockReturnValue({
      country: { numericId: '566', alpha2: 'NG', alpha3: 'NGA', name: 'Nigeria' },
      isLoading: false,
    });
  });

  it('renders the heading and a loading state while the catalog is in flight', () => {
    useModels.mockReturnValue({ data: null, error: null, isLoading: true });
    renderPage();
    expect(screen.getByRole('heading', { name: /models & pricing/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
  });

  it('surfaces a failed catalog fetch without pretending the table is empty', () => {
    useModels.mockReturnValue({ data: null, error: new Error('boom'), isLoading: false });
    renderPage();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('prices in the detected country’s currency by default', () => {
    renderPage();
    // Nigeria detected, ₦1500/$: Kimi's $0.60 input becomes ₦900.00 - minor
    // units survive below a thousand, which is where these rates sit.
    expect(screen.getByText('₦900.00')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /show prices in/i })).toHaveValue('NG');
  });

  it('asks a visitor we cannot place to pick, rather than claiming to still be looking', () => {
    // Detection resolving outside Africa (or failing) leaves no country.
    useVisitorCountry.mockReturnValue({ country: null, isLoading: false });
    renderPage();

    const select = screen.getByRole('combobox', { name: /show prices in/i });
    expect(within(select).getByRole('option', { name: /select a country/i })).toBeInTheDocument();
    expect(
      within(select).queryByRole('option', { name: /detecting your country/i })
    ).not.toBeInTheDocument();
    // Prices stay honest in USD rather than defaulting to somebody else's currency.
    expect(screen.getByText('$0.60')).toBeInTheDocument();
  });

  it('says it is still detecting while the lookup is in flight', () => {
    useVisitorCountry.mockReturnValue({ country: null, isLoading: true });
    renderPage();
    const select = screen.getByRole('combobox', { name: /show prices in/i });
    expect(
      within(select).getByRole('option', { name: /detecting your country/i })
    ).toBeInTheDocument();
  });

  it('reprices the whole table when another country is selected', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(screen.getByRole('combobox', { name: /show prices in/i }), 'ZA');

    // No rate for ZAR in this fixture, so it falls back to dollars rather
    // than converting at a guessed rate.
    await waitFor(() => expect(screen.getByText('$0.60')).toBeInTheDocument());
    expect(screen.queryByText('₦900.00')).not.toBeInTheDocument();
    expect(screen.getByText(/don’t have a live rate|don't have a live rate/i)).toBeInTheDocument();
  });

  it('narrows the table as filters are applied and reports the count', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByText(/2 of 2 models/i)).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /reasoning/i }));

    expect(screen.getByText(/1 of 2 models match your filters/i)).toBeInTheDocument();
    expect(screen.getByText('Claude Sonnet 5')).toBeInTheDocument();
    expect(screen.queryByText('Kimi K2.5')).not.toBeInTheDocument();
  });

  it('offers a way out when filters match nothing', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByRole('searchbox', { name: /search/i }), 'nothing-matches-this');

    expect(await screen.findByText(/no models match these filters/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(
      within(screen.getByText(/no models match these filters/i).closest('div')!).getByRole(
        'button',
        { name: /clear all filters/i }
      )
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('reorders the table from the sort control', async () => {
    const user = userEvent.setup();
    renderPage();

    const namesInOrder = () =>
      screen.getAllByRole('rowheader').map((cell) => cell.textContent?.trim());

    // Default is cheapest first.
    expect(namesInOrder()[0]).toMatch(/Kimi K2\.5/);

    await user.selectOptions(screen.getByRole('combobox', { name: /sort by/i }), 'cost-desc');
    expect(namesInOrder()[0]).toMatch(/Claude Sonnet 5/);
  });
});
