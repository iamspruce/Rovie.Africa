import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RankedBars, DEFAULT_VISIBLE_ROWS } from '../viz/RankedBars';
import { toRankedRows } from '../../lib/rankings';

const rows = (count: number) =>
  toRankedRows(
    Array.from({ length: count }, (_, index) => ({
      key: `row-${index}`,
      label: `Row ${index}`,
      value: (count - index) * 100,
    }))
  );

function renderBars(count: number, props: Partial<React.ComponentProps<typeof RankedBars>> = {}) {
  render(
    <RankedBars
      rows={rows(count)}
      valueLabel="Tokens"
      formatValue={(value) => String(value)}
      caption="Test ranking"
      itemNoun="countries"
      {...props}
    />
  );
}

describe('RankedBars', () => {
  it('shows every row when there are few enough', () => {
    renderBars(5);
    expect(screen.getAllByRole('row')).toHaveLength(6); // 5 rows + header
    expect(screen.queryByRole('button', { name: /show all/i })).not.toBeInTheDocument();
  });

  it('truncates a long list and offers to expand it', async () => {
    const user = userEvent.setup();
    renderBars(20);

    expect(screen.getAllByRole('row')).toHaveLength(DEFAULT_VISIBLE_ROWS + 1);
    expect(screen.queryByText('Row 12')).not.toBeInTheDocument();

    const button = screen.getByRole('button', { name: /show all 20 countries \(12 more\)/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);
    expect(screen.getAllByRole('row')).toHaveLength(21);
    expect(screen.getByText('Row 12')).toBeInTheDocument();
  });

  it('collapses again, naming how many it falls back to', async () => {
    const user = userEvent.setup();
    renderBars(20);

    await user.click(screen.getByRole('button', { name: /show all/i }));
    const collapse = screen.getByRole('button', { name: /show top 8/i });
    expect(collapse).toHaveAttribute('aria-expanded', 'true');

    await user.click(collapse);
    expect(screen.getAllByRole('row')).toHaveLength(DEFAULT_VISIBLE_ROWS + 1);
  });

  it('keeps rank numbers continuous across the fold', async () => {
    const user = userEvent.setup();
    renderBars(20);
    await user.click(screen.getByRole('button', { name: /show all/i }));
    // The 20th row is rank 20, not restarted by the expansion.
    const lastRow = screen.getByText('Row 19').closest('tr')!;
    expect(lastRow.textContent).toMatch(/^20/);
  });

  it('honours a custom visible-row count', () => {
    renderBars(20, { visibleRows: 3 });
    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(screen.getByRole('button', { name: /show all 20 countries \(17 more\)/i })).toBeInTheDocument();
  });

  it('shows the empty message rather than an empty table', () => {
    renderBars(0, { emptyMessage: 'Nothing yet.' });
    expect(screen.getByText('Nothing yet.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('drops the share column when a share of the total is meaningless', () => {
    renderBars(3, { showShare: false });
    expect(screen.queryByRole('columnheader', { name: /share/i })).not.toBeInTheDocument();
  });
});
