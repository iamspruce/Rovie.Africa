import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { LeaderboardTable } from '../../components/LeaderboardTable/LeaderboardTable';
import type { Model } from '../../lib/models';

const models: Model[] = [
  {
    litellmModelName: 'claude-sonnet-5',
    provider: 'anthropic',
    name: 'Claude 3.5 Sonnet',
    limit: { context: 200000, output: 8192 },
    cost: { input: 0.000003, output: 0.000015 },
  },
  {
    litellmModelName: 'kimi-k2.5',
    provider: 'moonshot',
    name: 'Kimi K2.5',
    limit: { context: 128000, output: 4096 },
    cost: { input: 0.0000006, output: 0.0000025 },
  },
  {
    litellmModelName: 'mystery-model',
    provider: 'unknown',
    name: 'Mystery Model',
    limit: { context: 32000, output: 2048 },
  },
];

describe('LeaderboardTable', () => {
  it('ranks the cheapest model first', () => {
    render(<LeaderboardTable models={models} />);
    const rows = screen.getAllByRole('row').slice(1); // skip header row
    const firstRow = within(rows[0]);
    expect(firstRow.getByText('Kimi K2.5')).toBeInTheDocument();
    expect(firstRow.getByText('1')).toBeInTheDocument();
  });

  it('excludes models without pricing data from the ranking', () => {
    render(<LeaderboardTable models={models} />);
    expect(screen.queryByText('Mystery Model')).not.toBeInTheDocument();
  });

  it('shows an empty state when nothing is priced', () => {
    render(<LeaderboardTable models={[{ litellmModelName: 'x', name: 'X', provider: 'x' }]} />);
    expect(screen.getByText(/no priced models/i)).toBeInTheDocument();
  });
});
