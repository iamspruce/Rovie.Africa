import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FeaturedModels } from '../FeaturedModels/FeaturedModels';
import { quoteModels, selectLatestPerFamily } from '../../lib/pricing';
import { modelFamily } from '../../lib/pricing';
import type { Model } from '../../lib/models';
// Captured from a live account-service /models response, trimmed to the
// fields the frontend reads. If the real payload changes shape, these tests
// are where it should surface.
import catalog from '../../test/fixtures/models.json';

const MODELS = catalog.models as Model[];
const REFERENCE_USD = 0.5;

function quotes() {
  return quoteModels(selectLatestPerFamily(MODELS), REFERENCE_USD, null);
}

function renderFeatured(props = {}) {
  return render(
    <MemoryRouter>
      <FeaturedModels
        quotes={quotes()}
        referencePriceText="$0.50"
        isLoading={false}
        error={null}
        {...props}
      />
    </MemoryRouter>
  );
}

describe('FeaturedModels', () => {
  it('names the section after what the visitor’s own money buys', () => {
    renderFeatured();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/the most \$0\.50 can buy/i);
  });

  it('quotes the heading in local currency when there is a rate for it', () => {
    renderFeatured({ referencePriceText: '₦775' });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/the most ₦775 can buy/i);
  });

  it('still says the list is one model per family, newest first', () => {
    renderFeatured();
    expect(screen.getByText(/one model from each family, newest first/i)).toBeInTheDocument();
  });

  it('shows one model per family and never the same family twice', () => {
    const families = selectLatestPerFamily(MODELS).map((m) =>
      m.litellmModelName.replace(/[-.].*$/, '')
    );
    // The real catalog carries gpt, claude and kimi families.
    expect(new Set(families).size).toBe(families.length);
    renderFeatured();
    expect(screen.getAllByRole('listitem')).toHaveLength(families.length);
  });

  it('picks each family’s newest release, not its cheapest old one', () => {
    const picked = selectLatestPerFamily(MODELS).map((m) => m.name);
    // The old cheapest-per-family rule surfaced these instead.
    expect(picked).not.toContain('GPT-4o mini');
    expect(picked).not.toContain('GPT-4.1 mini');
    for (const model of selectLatestPerFamily(MODELS)) {
      const sameFamily = MODELS.filter(
        (m) => modelFamily(m) === modelFamily(model) && m.cost
      );
      const newest = sameFamily.every(
        (m) => (m.release_date ?? '') <= (model.release_date ?? '')
      );
      expect(newest).toBe(true);
    }
  });

  it('orders rows newest first', () => {
    const dates = selectLatestPerFamily(MODELS).map((m) => m.release_date ?? '');
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('shows each release month so “latest” is checkable', () => {
    renderFeatured();
    const items = screen.getAllByRole('listitem');
    expect(within(items[0]).getByText(/^[A-Z][a-z]{2} \d{4}$/)).toBeInTheDocument();
  });

  it('marks each row with its provider’s real logo', () => {
    renderFeatured();
    // Family marks are the providers' own SVGs, labelled for screen readers.
    expect(screen.getByRole('img', { name: /moonshot ai/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /openai/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /anthropic/i })).toBeInTheDocument();
  });

  it('quotes prices at a believable scale rather than a factor of a million out', () => {
    renderFeatured();
    // GPT-4o mini blends to $0.38/1M. Before the unit fix this rendered as
    // $375,000.00 and the token yield collapsed to a fraction of one token.
    const items = screen.getAllByRole('listitem');
    expect(within(items[0]).getByText(/\/ 1M/)).toHaveTextContent(/\$\d+\.\d{2} \/ 1M/);
    expect(within(items[0]).getByText(/tokens$/)).toHaveTextContent(/^\d+(\.\d)?[KM] tokens$/);
  });

  it('links to the full catalog', () => {
    renderFeatured();
    expect(screen.getByRole('link', { name: /see all models/i })).toHaveAttribute('href', '/models');
  });

  it('covers the labs beyond the original three', () => {
    renderFeatured();
    for (const provider of [/google/i, /xai/i, /deepseek/i, /mistral/i, /qwen/i]) {
      expect(screen.getByRole('img', { name: provider })).toBeInTheDocument();
    }
  });

  it('keeps every rule visible now the catalog spans a 40x spread', () => {
    renderFeatured();
    const fills = document.querySelectorAll('[style*="width"]');
    const widths = [...fills]
      .map((el) => parseFloat((el as HTMLElement).style.width))
      .filter((w) => !Number.isNaN(w));
    expect(widths.length).toBe(quotes().length);
    expect(Math.min(...widths)).toBeGreaterThanOrEqual(12);
    expect(Math.max(...widths)).toBeCloseTo(100, 5);
  });

  it('says what to do when the catalog cannot be reached', () => {
    renderFeatured({ quotes: [], error: new Error('network down') });
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn.t reach the model catalog/i);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('reports that prices are still loading rather than showing an empty list', () => {
    renderFeatured({ quotes: [], isLoading: true });
    expect(screen.getByText(/checking today.s prices/i)).toBeInTheDocument();
  });

  it('offers the full catalog when nothing came back priced', () => {
    renderFeatured({ quotes: [], isLoading: false });
    expect(screen.getByRole('link', { name: /open the full catalog/i })).toBeInTheDocument();
  });
});
