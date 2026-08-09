import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModelFilters } from '../ModelFilters/ModelFilters';
import { EMPTY_FILTERS } from '../../lib/modelFilters';

const providers = [
  { provider: 'openai', count: 9 },
  { provider: 'anthropic', count: 5 },
];

function setup(overrides: Partial<React.ComponentProps<typeof ModelFilters>> = {}) {
  const onChange = vi.fn();
  render(
    <ModelFilters
      filters={EMPTY_FILTERS}
      onChange={onChange}
      providers={providers}
      maxCost={20}
      fxRates={null}
      {...overrides}
    />
  );
  return { onChange };
}

describe('ModelFilters', () => {
  it('offers only providers the catalog actually carries, with counts', () => {
    setup();
    expect(screen.getByRole('checkbox', { name: /openai/i })).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /mistral/i })).not.toBeInTheDocument();
  });

  it('reports a typed search term', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();
    await user.type(screen.getByRole('searchbox', { name: /search/i }), 'g');
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, search: 'g' });
  });

  it('toggles a provider facet on and back off', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();
    await user.click(screen.getByRole('checkbox', { name: /openai/i }));
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, providers: ['openai'] });

    onChange.mockClear();
    render(
      <ModelFilters
        filters={{ ...EMPTY_FILTERS, providers: ['openai'] }}
        onChange={onChange}
        providers={providers}
        maxCost={20}
        fxRates={null}
      />
    );
    await user.click(screen.getAllByRole('checkbox', { name: /openai/i })[1]);
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, providers: [] });
  });

  it('toggles capability facets', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();
    await user.click(screen.getByRole('checkbox', { name: /reasoning/i }));
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, capabilities: ['reasoning'] });
  });

  it('sets a price ceiling from the slider', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByRole('slider', { name: /max price/i }), {
      target: { value: '5' },
    });
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, maxBlendedCost: 5 });
  });

  it('treats the top of the price slider as "no ceiling"', () => {
    const onChange = vi.fn();
    render(
      <ModelFilters
        filters={{ ...EMPTY_FILTERS, maxBlendedCost: 5 }}
        onChange={onChange}
        providers={providers}
        maxCost={20}
        fxRates={null}
      />
    );
    // Dragging fully right must clear the filter rather than excluding the
    // dearest model on a rounding edge.
    fireEvent.change(screen.getByRole('slider', { name: /max price/i }), {
      target: { value: '20' },
    });
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, maxBlendedCost: null });
  });

  it('hides the price slider when nothing in the catalog is priced', () => {
    setup({ maxCost: null });
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('sets a context floor', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();
    await user.selectOptions(screen.getByRole('combobox', { name: /min context/i }), '200000');
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, minContext: 200_000 });
  });

  it('only offers "clear all" once something is filtered', async () => {
    const user = userEvent.setup();
    expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument();

    const onChange = vi.fn();
    render(
      <ModelFilters
        filters={{ ...EMPTY_FILTERS, search: 'gpt' }}
        onChange={onChange}
        providers={providers}
        maxCost={20}
        fxRates={null}
      />
    );
    await user.click(screen.getByRole('button', { name: /clear all/i }));
    expect(onChange).toHaveBeenCalledWith(EMPTY_FILTERS);
  });
});
