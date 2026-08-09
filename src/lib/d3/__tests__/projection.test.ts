import { describe, it, expect } from 'vitest';
import {
  createProjection,
  buildCountryPaths,
  getFeatureCentroid,
  rotationForLonLat,
  getDefaultGlobeCenter,
  createGlobeProjection,
  getSphereOutlinePath,
  getGraticulePath,
} from '../projection';
import { getAfricaFeatureCollection } from '../geoData';

const africa = getAfricaFeatureCollection();

describe('createProjection', () => {
  it('returns a projection and a matching path generator', () => {
    const { projection, pathGenerator } = createProjection(africa, {
      width: 800,
      height: 600,
    });
    expect(typeof projection).toBe('function');
    expect(typeof pathGenerator).toBe('function');
  });

  it('fits the projected map within the requested pixel bounds', () => {
    const width = 800;
    const height = 600;
    const { pathGenerator } = createProjection(africa, { width, height, padding: 10 });
    const [[x0, y0], [x1, y1]] = pathGenerator.bounds(africa);
    expect(x0).toBeGreaterThanOrEqual(0);
    expect(y0).toBeGreaterThanOrEqual(0);
    expect(x1).toBeLessThanOrEqual(width);
    expect(y1).toBeLessThanOrEqual(height);
  });
});

describe('buildCountryPaths', () => {
  it('produces one non-empty SVG path string per country feature', () => {
    const { pathGenerator } = createProjection(africa, { width: 800, height: 600 });
    const paths = buildCountryPaths(africa, pathGenerator);
    expect(paths.length).toBe(africa.features.length);
    paths.forEach((p) => {
      expect(p.id).toEqual(expect.any(String));
      expect(p.d.length).toBeGreaterThan(0);
      expect(p.d.startsWith('M')).toBe(true);
    });
  });
});

describe('getFeatureCentroid', () => {
  it('returns a finite [x, y] pixel centroid for Nigeria', () => {
    const { pathGenerator } = createProjection(africa, { width: 800, height: 600 });
    const nigeria = africa.features.find((f) => String(f.id) === '566');
    const centroid = getFeatureCentroid(nigeria!, pathGenerator);
    expect(centroid).not.toBeNull();
    expect(centroid!.length).toBe(2);
    centroid!.forEach((n) => expect(Number.isFinite(n)).toBe(true));
  });

  it('returns null when no feature is given', () => {
    const { pathGenerator } = createProjection(africa, { width: 800, height: 600 });
    expect(getFeatureCentroid(null, pathGenerator)).toBeNull();
  });
});

describe('rotationForLonLat', () => {
  it('negates both coordinates', () => {
    expect(rotationForLonLat([20, 3])).toEqual([-20, -3]);
    expect(rotationForLonLat([-10, -5])).toEqual([10, 5]);
  });
});

describe('getDefaultGlobeCenter', () => {
  it("returns Africa's real geographic centroid, roughly mid-continent", () => {
    const [lon, lat] = getDefaultGlobeCenter(africa);
    expect(lon).toBeGreaterThan(0);
    expect(lon).toBeLessThan(40);
    expect(lat).toBeGreaterThan(-10);
    expect(lat).toBeLessThan(15);
  });
});

describe('createGlobeProjection', () => {
  it('returns a projection and matching path generator', () => {
    const { projection, pathGenerator } = createGlobeProjection({ width: 800, height: 600 });
    expect(typeof projection).toBe('function');
    expect(typeof pathGenerator).toBe('function');
  });

  it('clips the back hemisphere (a point rotated to face away renders nothing)', () => {
    const { pathGenerator } = createGlobeProjection({
      width: 800,
      height: 600,
      rotate: rotationForLonLat([20, 0]),
    });
    const farSide = { type: 'Point' as const, coordinates: [-160, 0] };
    expect(pathGenerator(farSide)).toBeNull();
  });

  it('fits the globe within the requested pixel bounds', () => {
    const width = 800;
    const height = 600;
    const { pathGenerator } = createGlobeProjection({ width, height, padding: 10 });
    const [[x0, y0], [x1, y1]] = pathGenerator.bounds({ type: 'Sphere' });
    expect(x0).toBeGreaterThanOrEqual(0);
    expect(y0).toBeGreaterThanOrEqual(0);
    expect(x1).toBeLessThanOrEqual(width);
    expect(y1).toBeLessThanOrEqual(height);
  });
});

describe('getSphereOutlinePath', () => {
  it('returns a non-empty closed SVG path for the globe outline', () => {
    const { pathGenerator } = createGlobeProjection({ width: 800, height: 600 });
    const d = getSphereOutlinePath(pathGenerator);
    expect(d.length).toBeGreaterThan(0);
    expect(d.startsWith('M')).toBe(true);
  });
});

describe('getGraticulePath', () => {
  it('returns a non-empty SVG path for the lat/long grid', () => {
    const { pathGenerator } = createGlobeProjection({ width: 800, height: 600 });
    const d = getGraticulePath(pathGenerator);
    expect(d.length).toBeGreaterThan(0);
  });
});
