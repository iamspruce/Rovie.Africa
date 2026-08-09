import type { FeatureCollection } from 'geojson';
import globeGeoJson from '../../assets/geo/globe.geo.json';
import { AFRICA_NUMERIC_IDS } from './africaCountries';

// -----------------------------------------------------------------------
// The geometry the app draws at runtime.
//
// This used to be `world-atlas`'s countries-50m TopoJSON, decoded in the
// browser on every visit: 739 KB of data and 80,617 coordinates, of which the
// globe re-projects every single one on every frame of a drag.
//
// It is now a purpose-built GeoJSON produced by scripts/build-geo.mjs - 110m
// resolution with the five African island states 110m omits grafted back in
// from 50m, coordinates rounded to two decimal places. Same 55 African
// countries, a seventh of the coordinates, and no TopoJSON decode on mount.
//
// Regenerate it with `npm run geo:build` - never edit the JSON by hand.
// -----------------------------------------------------------------------

const WORLD = globeGeoJson as unknown as FeatureCollection;

// Filtered once, not per call. Three components ask for this, and the answer
// cannot change between them.
const AFRICA: FeatureCollection = {
  type: 'FeatureCollection',
  features: WORLD.features.filter((f) => AFRICA_NUMERIC_IDS.has(String(f.id))),
};

export function getWorldFeatureCollection(): FeatureCollection {
  return WORLD;
}

export function getAfricaFeatureCollection(): FeatureCollection {
  return AFRICA;
}
