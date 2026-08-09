import { describe, it, expect } from 'vitest';
import { buildMockRankings } from '../rankings.mock';
import { foldProviderTail } from '../rankings';

describe('buildMockRankings', () => {
  it('produces one trend point per day in the window', () => {
    expect(buildMockRankings(7).trend).toHaveLength(7);
    expect(buildMockRankings(90).trend).toHaveLength(90);
  });

  it('is deterministic, so the layout does not reshuffle between renders', () => {
    expect(buildMockRankings(30).trend).toEqual(buildMockRankings(30).trend);
  });

  it('scales with the window, so changing it visibly does something', () => {
    expect(buildMockRankings(90).totals.tokens).toBeGreaterThan(
      buildMockRankings(7).totals.tokens
    );
  });

  it('keeps totals consistent with the trend that makes them up', () => {
    const snapshot = buildMockRankings(30);
    const summed = snapshot.trend.reduce((total, point) => total + point.tokens, 0);
    expect(snapshot.totals.tokens).toBe(summed);
  });

  it('splits the token total across models without inventing extra', () => {
    const snapshot = buildMockRankings(30);
    const modelTokens = snapshot.models.reduce((total, model) => total + model.tokens, 0);
    // Rounding each model's share moves the sum by a handful of tokens either
    // way against a multi-billion total; what matters is that the split is of
    // the total rather than alongside it.
    expect(modelTokens).toBeGreaterThan(snapshot.totals.tokens * 0.999);
    expect(modelTokens).toBeLessThan(snapshot.totals.tokens * 1.001);
  });

  it('derives providers from the models rather than as a second invention', () => {
    const snapshot = buildMockRankings(30);
    const anthropicModels = snapshot.models
      .filter((model) => model.provider === 'anthropic')
      .reduce((total, model) => total + model.tokens, 0);
    const anthropicProvider = snapshot.providers.find((p) => p.provider === 'anthropic');
    expect(anthropicProvider?.tokens).toBe(anthropicModels);
  });

  it('carries enough providers to exercise the Other fold', () => {
    const folded = foldProviderTail(buildMockRankings(30).providers);
    expect(folded[folded.length - 1].provider).toBe('Other');
  });

  it('leaves app attribution short of 100%, as real opt-in attribution would be', () => {
    const snapshot = buildMockRankings(30);
    const attributed = snapshot.apps.reduce((total, app) => total + app.tokens, 0);
    expect(attributed).toBeLessThan(snapshot.totals.tokens);
    expect(attributed).toBeGreaterThan(0);
  });

  it('spans enough countries to make the choropleth worth drawing', () => {
    const snapshot = buildMockRankings(30);
    expect(snapshot.countries.length).toBeGreaterThanOrEqual(15);
    expect(snapshot.countries[0].country).toBe('NG');
    // Sorted, so the map's max and the table's first row agree.
    expect(snapshot.countries[0].tokens).toBeGreaterThan(snapshot.countries[1].tokens);
  });

  it('only ranks latency for models with enough requests to have a median', () => {
    const snapshot = buildMockRankings(30);
    expect(snapshot.latency.every((entry) => entry.requests >= 20)).toBe(true);
  });
});
