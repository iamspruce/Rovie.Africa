import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModelsTable } from '../../components/ModelsTable/ModelsTable';
import type { Model } from '../../lib/models';
import type { FxRates } from '../../lib/currency';

const models: Model[] = [
  {
    litellmModelName: 'claude-sonnet-5',
    provider: 'anthropic',
    name: 'Claude 3.5 Sonnet',
    description: 'Balanced frontier model.',
    limit: { context: 200000, output: 8192 },
    // USD per million tokens, as account-service returns it.
    cost: { input: 3, output: 15, cache_read: 0.3 },
    modalities: { input: ['text', 'image'], output: ['text'] },
    tool_call: true,
    reasoning: true,
    knowledge: '2025-04',
    release_date: '2026-02-11',
  },
  {
    litellmModelName: 'kimi-k2.5',
    provider: 'moonshot',
    name: 'Kimi K2.5',
    limit: { context: 128000, output: 4096 },
  },
];

const fxRates: FxRates = {
  currencies: { NGN: { ratePerUsd: 1500 } },
  supported: ['NGN'],
  fetchedAt: Date.now(),
};

describe('ModelsTable', () => {
  it('renders one row per model', () => {
    render(<ModelsTable models={models} />);
    expect(screen.getByText('Claude 3.5 Sonnet')).toBeInTheDocument();
    expect(screen.getByText('Kimi K2.5')).toBeInTheDocument();
  });

  it('formats context window sizes', () => {
    render(<ModelsTable models={models} />);
    expect(screen.getByText('200K')).toBeInTheDocument();
    expect(screen.getByText('128K')).toBeInTheDocument();
  });

  it('shows capability badges for what a model declares', () => {
    render(<ModelsTable models={models} />);
    expect(screen.getByText('Tools')).toBeInTheDocument();
    expect(screen.getByText('Reasoning')).toBeInTheDocument();
    // Kimi declares none, so nothing is invented for it.
    expect(screen.queryByText('Structured output')).not.toBeInTheDocument();
  });

  it('prices in USD when no rate is available', () => {
    render(<ModelsTable models={models} />);
    expect(screen.getByText('$3.00')).toBeInTheDocument();
    expect(screen.getByText('$15.00')).toBeInTheDocument();
  });

  it('prices in the selected local currency when a rate exists', () => {
    render(<ModelsTable models={models} fxRates={fxRates} currency="NGN" />);
    // $3 at 1500/USD = ₦4,500 - and past 1000 the minor units are dropped.
    expect(screen.getByText('₦4,500')).toBeInTheDocument();
    expect(screen.getByText('₦22,500')).toBeInTheDocument();
  });

  it('falls back to USD for a currency the FX service does not quote', () => {
    render(<ModelsTable models={models} fxRates={fxRates} currency="ZWG" />);
    expect(screen.getByText('$3.00')).toBeInTheDocument();
  });

  it('dashes the price cells of a model with no published pricing', () => {
    render(<ModelsTable models={models} />);
    const row = screen.getByText('Kimi K2.5').closest('tr')!;
    expect(within(row).getAllByText('—')).toHaveLength(2);
  });

  it('reveals a detail row on demand and hides it again', async () => {
    const user = userEvent.setup();
    render(<ModelsTable models={models} />);

    expect(screen.queryByText('Balanced frontier model.')).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: /show details for claude 3\.5 sonnet/i });
    await user.click(toggle);

    expect(screen.getByText('Balanced frontier model.')).toBeInTheDocument();
    expect(screen.getByText('claude-sonnet-5')).toBeInTheDocument();
    expect(screen.getByText('text, image')).toBeInTheDocument();
    expect(screen.getByText('Apr 2025')).toBeInTheDocument();
    // $0.30 cache read against $3.00 input.
    expect(screen.getByText(/90% off/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /hide details for claude 3\.5 sonnet/i }));
    expect(screen.queryByText('Balanced frontier model.')).not.toBeInTheDocument();
  });

  it('explains missing pricing in the detail row rather than in the table cell', async () => {
    const user = userEvent.setup();
    render(<ModelsTable models={models} />);
    await user.click(screen.getByRole('button', { name: /show details for kimi k2\.5/i }));
    expect(screen.getByText(/not published for this model/i)).toBeInTheDocument();
  });

  it('reports the active sort on the column header and cycles direction', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(<ModelsTable models={models} sort="cost-asc" onSortChange={onSortChange} />);

    const header = screen.getByRole('columnheader', { name: /input \/ 1m/i });
    expect(header).toHaveAttribute('aria-sort', 'ascending');

    await user.click(within(header).getByRole('button'));
    expect(onSortChange).toHaveBeenCalledWith('cost-desc');
  });

  it('marks unsorted columns as such', () => {
    render(<ModelsTable models={models} sort="cost-asc" onSortChange={vi.fn()} />);
    expect(screen.getByRole('columnheader', { name: /provider/i })).toHaveAttribute(
      'aria-sort',
      'none'
    );
  });

  it('renders plain headers when the table is not sortable', () => {
    render(<ModelsTable models={models} />);
    expect(screen.getByRole('columnheader', { name: /provider/i })).not.toHaveAttribute('aria-sort');
  });

  it('shows an empty state when there are no models', () => {
    render(<ModelsTable models={[]} />);
    expect(screen.getByText(/no models are available/i)).toBeInTheDocument();
  });
});
