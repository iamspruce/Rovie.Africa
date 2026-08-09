import { describe, it, expect } from 'vitest';
import { getAfricaFeatureCollection, getWorldFeatureCollection } from '../geoData';
import { AFRICA_COUNTRIES } from '../africaCountries';
import type { Polygon, MultiPolygon } from 'geojson';

describe('getAfricaFeatureCollection', () => {
  const africa = getAfricaFeatureCollection();

  it('returns a GeoJSON FeatureCollection', () => {
    expect(africa.type).toBe('FeatureCollection');
    expect(Array.isArray(africa.features)).toBe(true);
  });

  it('only contains real geometries with valid coordinates', () => {
    expect(africa.features.length).toBeGreaterThan(0);
    africa.features.forEach((f) => {
      expect(f.geometry).toBeTruthy();
      expect(['Polygon', 'MultiPolygon']).toContain(f.geometry.type);
    });
  });

  it('includes Nigeria (id 566) with real geometry', () => {
    const nigeria = africa.features.find((f) => String(f.id) === '566');
    expect(nigeria).toBeTruthy();
    expect((nigeria!.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon).coordinates.length).toBeGreaterThan(0);
  });

  it('excludes non-African countries such as the USA (id 840) and France (id 250)', () => {
    const ids = africa.features.map((f) => String(f.id));
    expect(ids).not.toContain('840');
    expect(ids).not.toContain('250');
  });

  it('contains a feature for the vast majority of the 54 defined African countries', () => {
    const ids = new Set(africa.features.map((f) => String(f.id)));
    const matched = AFRICA_COUNTRIES.filter((c) => ids.has(c.numericId));
    expect(matched.length).toBeGreaterThanOrEqual(45);
  });
});

describe('getWorldFeatureCollection', () => {
  const world = getWorldFeatureCollection();

  it('returns a GeoJSON FeatureCollection', () => {
    expect(world.type).toBe('FeatureCollection');
    expect(Array.isArray(world.features)).toBe(true);
  });

  it('includes far more countries than the Africa-only collection', () => {
    const africaOnly = getAfricaFeatureCollection();
    expect(world.features.length).toBeGreaterThan(africaOnly.features.length);
  });

  it('includes non-African countries such as the USA and France', () => {
    const ids = world.features.map((f) => String(f.id));
    expect(ids).toContain('840');
    expect(ids).toContain('250');
  });

  it('still includes every African country the Africa-only collection has', () => {
    const worldIds = new Set(world.features.map((f) => String(f.id)));
    const africaOnly = getAfricaFeatureCollection();
    africaOnly.features.forEach((f) => {
      expect(worldIds.has(String(f.id))).toBe(true);
    });
  });
});
