import { geoMercator, geoPath, geoBounds } from 'd3-geo';
import type { Feature } from 'geojson';
import { getAfricaFeatureCollection } from './geoData';
import { findByNumericId } from './africaCountries';

/**
 * Geometry for the sign-in / sign-up plate: Africa drawn country by country,
 * plus the centroid of each one so a single country can be marked.
 *
 * Computed once at module load rather than per render. It's the same bundled
 * `world-atlas` data the homepage globe uses, so the panel beside the sign-in
 * form is made of the product's own map rather than a decorative stand-in,
 * and costs no extra bytes.
 *
 * Flat Mercator here, not the homepage's orthographic projection: this plate
 * is a fixed printed object, and a globe you can't rotate only invites a drag
 * that does nothing.
 */

export const PLATE_WIDTH = 520;
export const PLATE_HEIGHT = 560;

export interface PlateCountry {
  alpha2: string;
  /** Rendered outline in plate coordinates. */
  path: string;
  /** Where a marker for this country belongs, in plate coordinates. */
  centroid: [number, number];
}

const collection = getAfricaFeatureCollection();

// Padding keeps Cape Agulhas and Tunis off the panel edges, where the form
// column's border would otherwise clip them.
const projection = geoMercator().fitExtent(
  [
    [24, 24],
    [PLATE_WIDTH - 24, PLATE_HEIGHT - 24],
  ],
  collection
);

const pathGen = geoPath(projection);

export const PLATE_COUNTRIES: readonly PlateCountry[] = collection.features
  .map((feature: Feature) => {
    const path = pathGen(feature);
    const centroid = pathGen.centroid(feature);

    // world-atlas carries only `id` (ISO 3166-1 numeric) and `name` on each
    // feature - there is no alpha-2 in the data - so the code the rest of the
    // app speaks comes from our own table. A feature we can't resolve still
    // gets drawn; it just can't be marked, which is the right outcome for the
    // handful of id-less territories noted in the README.
    const alpha2 = findByNumericId(String(feature.id))?.alpha2 ?? '';

    if (!path || !Number.isFinite(centroid[0]) || !Number.isFinite(centroid[1])) return null;
    return { alpha2, path, centroid: centroid as [number, number] };
  })
  .filter((entry): entry is PlateCountry => entry !== null);

/**
 * The full continent as one outline, for the halo behind the country fills.
 * Drawing it separately means the hairline borders between countries read as
 * internal divisions rather than as the edge of the landmass.
 */
export const PLATE_OUTLINE: string = pathGen(collection) || '';

/**
 * Latitude of a country's centroid, in plate coordinates. The plate draws a
 * rule at this height through the marked country - a real parallel, not a
 * decorative line, which is why it's derived from the projection rather than
 * placed by eye.
 */
export function plateLatitudeY(alpha2: string): number | null {
  const match = PLATE_COUNTRIES.find((country) => country.alpha2 === alpha2.toUpperCase());
  return match ? match.centroid[1] : null;
}

/** Bounding box in degrees, exposed for tests that assert real geography. */
export const PLATE_BOUNDS = geoBounds(collection);
