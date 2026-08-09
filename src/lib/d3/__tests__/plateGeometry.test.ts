import { describe, it, expect } from 'vitest';
import {
  PLATE_BOUNDS,
  PLATE_COUNTRIES,
  PLATE_HEIGHT,
  PLATE_OUTLINE,
  PLATE_WIDTH,
  plateLatitudeY,
} from '../plateGeometry';

// Real bundled world-atlas geometry, projected for real - nothing here is
// fixture data, so these assertions fail if the projection, the padding or
// the country table stop agreeing with each other.
describe('plateGeometry', () => {
  it('projects every African country to a drawable path', () => {
    // 55 in AFRICA_COUNTRIES; world-atlas splits a couple into separate
    // features and omits a few tiny island states, so assert a sane floor
    // rather than an exact count that a data refresh would break.
    expect(PLATE_COUNTRIES.length).toBeGreaterThan(45);
    for (const country of PLATE_COUNTRIES) {
      expect(country.path.startsWith('M')).toBe(true);
    }
  });

  it('resolves alpha-2 codes from the numeric ids in the data', () => {
    const codes = PLATE_COUNTRIES.map((country) => country.alpha2);
    expect(codes).toContain('NG');
    expect(codes).toContain('KE');
    expect(codes).toContain('ZA');
    expect(codes).toContain('EG');
  });

  it('keeps every centroid inside the viewBox', () => {
    for (const country of PLATE_COUNTRIES) {
      const [x, y] = country.centroid;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(PLATE_WIDTH);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(PLATE_HEIGHT);
    }
  });

  it('places northern countries above southern ones', () => {
    // SVG y grows downward, so Egypt must sit at a smaller y than South
    // Africa. This is the check that catches a flipped projection, which
    // renders as a plausible-looking upside-down Africa.
    const egypt = plateLatitudeY('EG');
    const southAfrica = plateLatitudeY('ZA');
    expect(egypt).not.toBeNull();
    expect(southAfrica).not.toBeNull();
    expect(egypt!).toBeLessThan(southAfrica!);
  });

  it('covers the real continental bounding box', () => {
    const [[west, south], [east, north]] = PLATE_BOUNDS;
    // Africa spans roughly 17°W-51°E and 35°S-37°N. Loose bounds, because
    // the point is catching a wrong or empty feature set, not pinning the
    // dataset's exact coastline.
    expect(west).toBeLessThan(-10);
    expect(east).toBeGreaterThan(45);
    expect(south).toBeLessThan(-30);
    expect(north).toBeGreaterThan(30);
  });

  it('returns null for a country that is not on the plate', () => {
    expect(plateLatitudeY('FR')).toBeNull();
    expect(plateLatitudeY('')).toBeNull();
  });

  it('draws the continent outline as one path', () => {
    expect(PLATE_OUTLINE.startsWith('M')).toBe(true);
    expect(PLATE_OUTLINE.length).toBeGreaterThan(1000);
  });
});
