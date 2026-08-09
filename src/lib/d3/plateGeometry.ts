import {
  PLATE_BOUNDS,
  PLATE_COUNTRIES,
  PLATE_HEIGHT,
  PLATE_OUTLINE,
  PLATE_WIDTH,
} from '../../assets/geo/plate.generated';
import type { PlateCountry } from '../../assets/geo/plate.generated';

/**
 * Geometry for the sign-in / sign-up plate: Africa drawn country by country,
 * plus the centroid of each one so a single country can be marked.
 *
 * Flat Mercator, not the homepage's orthographic projection: this plate is a
 * fixed printed object, and a globe you can't rotate only invites a drag that
 * does nothing.
 *
 * Because it IS fixed - fixed size, fixed projection, fixed data - none of it
 * is computed here any more. It was previously projected in the browser on
 * every visit to produce a result that could never differ, which meant every
 * page carrying this module also carried the whole world atlas and d3-geo to
 * reach it. scripts/build-geo.mjs now does that work once, at build time; this
 * module is the app-facing name for the result.
 */

export type { PlateCountry };
export { PLATE_BOUNDS, PLATE_COUNTRIES, PLATE_HEIGHT, PLATE_OUTLINE, PLATE_WIDTH };

/**
 * Latitude of a country's centroid, in plate coordinates. The plate draws a
 * rule at this height through the marked country - a real parallel, not a
 * decorative line, which is why it comes from the projection rather than
 * being placed by eye.
 */
export function plateLatitudeY(alpha2: string): number | null {
  const match = PLATE_COUNTRIES.find((country) => country.alpha2 === alpha2.toUpperCase());
  return match ? match.centroid[1] : null;
}
