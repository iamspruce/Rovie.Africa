// -----------------------------------------------------------------------
// Turns the `world-atlas` TopoJSON into exactly the three things this app
// actually draws, and nothing else. Run it with `npm run geo:build`.
//
// Why this exists: the app used to import countries-50m.json (739 KB, 80,617
// coordinates) directly, and every page paid for it because LogoMap - which is
// in the header and footer of every route - projected the continent at module
// load. Two of the three consumers were computing a fixed result at runtime,
// on every visit, from data that never changes.
//
//   1. The wordmark's Africa outline. One path string. Fixed size, fixed
//      projection - there was never a reason to compute it in a browser.
//   2. The sign-in plate. 50-odd country paths in a fixed 520x560 Mercator.
//      Also fixed, also computed per visit.
//   3. The homepage globe. The one real runtime consumer: it re-projects on
//      every drag frame, so it needs coordinates rather than paths.
//
// So 1 and 2 are baked to strings here, and 3 gets a purpose-built GeoJSON.
//
// RESOLUTION, and the one place it matters: 110m is ample for a 400px globe
// and costs a tenth of what 50m does per frame - but 110m omits five African
// island states (Cabo Verde, Comoros, Mauritius, Sao Tome and Principe,
// Seychelles). Dropping five African countries from a map of Africa is not a
// performance trade anyone would sign off on, so those five are grafted in
// from 50m at a cost of ~171 coordinates. The plate keeps 50m outright: it
// draws Africa at 520px, where 110m's coastline reads as visibly polygonal.
// -----------------------------------------------------------------------

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { feature, merge } from 'topojson-client';
import { geoMercator, geoPath, geoArea, geoBounds } from 'd3-geo';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'src/assets/geo');

// Pixel coordinates in a fixed-size viewBox. A tenth of a pixel is already
// past what any display can resolve, and full float precision was most of the
// weight of these strings.
const PATH_DIGITS = 1;

// Degrees, for the globe's coordinates. 0.01 degrees is about 1.1 km - far
// under a pixel at any size this globe is drawn, and still fine enough that
// Seychelles survives the rounding.
const COORD_DIGITS = 2;

const BANNER = `// GENERATED FILE - DO NOT EDIT.
//
// Written by scripts/build-geo.mjs from the \`world-atlas\` package. Change the
// script, then run \`npm run geo:build\`, and commit the result.
`;

function loadTopology(resolution) {
  return JSON.parse(readFileSync(resolve(ROOT, `node_modules/world-atlas/countries-${resolution}.json`), 'utf8'));
}

function write(name, contents) {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(resolve(OUT_DIR, name), contents, 'utf8');
  return contents.length;
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// --------------------------------------------------------------- africa ids
//
// Read out of the app's own table rather than redeclared, so the script and
// the runtime can never disagree about what counts as Africa.

const africaCountriesSource = readFileSync(resolve(ROOT, 'src/lib/d3/africaCountries.ts'), 'utf8');
const AFRICA_NUMERIC_IDS = new Set(
  [...africaCountriesSource.matchAll(/numericId: '(\d+)'/g)].map((match) => match[1])
);

if (AFRICA_NUMERIC_IDS.size < 50) {
  throw new Error(`Only parsed ${AFRICA_NUMERIC_IDS.size} African ids from africaCountries.ts`);
}

// ----------------------------------------------------------------- rounding

function roundPosition(position) {
  const factor = 10 ** COORD_DIGITS;
  return [Math.round(position[0] * factor) / factor, Math.round(position[1] * factor) / factor];
}

/**
 * Rounds a ring and drops the points rounding made redundant. A ring needs
 * four positions to close, so anything shorter is discarded rather than
 * emitted as a degenerate polygon d3 would then try to fill.
 */
function roundRing(ring) {
  const out = [];
  for (const position of ring) {
    const rounded = roundPosition(position);
    const previous = out[out.length - 1];
    if (previous && previous[0] === rounded[0] && previous[1] === rounded[1]) continue;
    out.push(rounded);
  }
  if (out.length < 4) return null;
  // Rounding can pull the closing point off the opening one.
  const first = out[0];
  const last = out[out.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) out.push([first[0], first[1]]);
  return out;
}

function roundGeometry(geometry) {
  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates.map(roundRing).filter(Boolean);
    return rings.length ? { type: 'Polygon', coordinates: rings } : null;
  }
  if (geometry.type === 'MultiPolygon') {
    const polygons = geometry.coordinates
      .map((rings) => rings.map(roundRing).filter(Boolean))
      .filter((rings) => rings.length > 0);
    return polygons.length ? { type: 'MultiPolygon', coordinates: polygons } : null;
  }
  return null;
}

function countPositions(collection) {
  let total = 0;
  for (const item of collection.features) {
    const coordinates = item.geometry.type === 'Polygon'
      ? [item.geometry.coordinates]
      : item.geometry.coordinates;
    for (const rings of coordinates) for (const ring of rings) total += ring.length;
  }
  return total;
}

// ------------------------------------------------------------------- globe

function buildGlobe() {
  const coarse = loadTopology('110m');
  const detailed = loadTopology('50m');

  const coarseFeatures = feature(coarse, coarse.objects.countries).features;
  const present = new Set(coarseFeatures.map((f) => String(f.id)));

  // The five African island states 110m leaves out.
  const missing = feature(detailed, detailed.objects.countries).features.filter(
    (f) => AFRICA_NUMERIC_IDS.has(String(f.id)) && !present.has(String(f.id))
  );

  const features = [...coarseFeatures, ...missing]
    .map((f) => {
      const geometry = roundGeometry(f.geometry);
      if (!geometry) return null;
      return {
        type: 'Feature',
        id: String(f.id),
        // Only the name survives. Everything else world-atlas carries is
        // unread by this app and would ship to every visitor.
        properties: { name: f.properties?.name ?? '' },
        geometry,
      };
    })
    .filter(Boolean);

  const collection = { type: 'FeatureCollection', features };
  const africanCount = features.filter((f) => AFRICA_NUMERIC_IDS.has(f.id)).length;

  if (africanCount < AFRICA_NUMERIC_IDS.size) {
    throw new Error(
      `Globe carries ${africanCount} African countries, expected ${AFRICA_NUMERIC_IDS.size}`
    );
  }

  const size = write('globe.geo.json', JSON.stringify(collection));
  console.log(
    `  globe.geo.json          ${kb(size).padStart(9)}  ${features.length} features, ` +
      `${countPositions(collection)} coordinates, ${africanCount} African`
  );

  return { detailed, coarse };
}

// -------------------------------------------------------------------- logo

const LOGO_SIZE = 400;

function buildLogo(coarse) {
  const africanGeometries = coarse.objects.countries.geometries.filter((g) =>
    AFRICA_NUMERIC_IDS.has(String(g.id))
  );

  // Merged into one shape, then reduced to its largest polygon: the wordmark
  // is the mainland silhouette, not the continent plus every offshore island.
  const merged = merge(coarse, africanGeometries);
  const polygons = merged.coordinates.map((coordinates) => ({ type: 'Polygon', coordinates }));
  const mainland = polygons.reduce((largest, polygon) =>
    geoArea(polygon) > geoArea(largest) ? polygon : largest
  );

  const projection = geoMercator().fitSize([LOGO_SIZE, LOGO_SIZE], mainland);
  const pathGenerator = geoPath(projection).digits(PATH_DIGITS);
  const path = pathGenerator(mainland);
  const center = pathGenerator.centroid(mainland);

  if (!path) throw new Error('Failed to project the logo outline');

  const size = write(
    'logo.generated.ts',
    `${BANNER}
/** The viewBox the outline below is drawn in. */
export const LOGO_SIZE = ${LOGO_SIZE};

/** Africa's mainland silhouette, Mercator, fitted to a ${LOGO_SIZE}x${LOGO_SIZE} box. */
export const LOGO_AFRICA_PATH =
  '${path}';

/** Centre of that silhouette, so the concentric rings scale about the landmass. */
export const LOGO_AFRICA_CENTER: readonly [number, number] = [
  ${center[0].toFixed(2)}, ${center[1].toFixed(2)},
];
`
  );

  console.log(`  logo.generated.ts       ${kb(size).padStart(9)}  1 path`);
}

// ------------------------------------------------------------------- plate

const PLATE_WIDTH = 520;
const PLATE_HEIGHT = 560;
const PLATE_PADDING = 24;

function buildPlate(detailed) {
  const all = feature(detailed, detailed.objects.countries).features;
  const features = all.filter((f) => AFRICA_NUMERIC_IDS.has(String(f.id)));
  const collection = { type: 'FeatureCollection', features };

  const projection = geoMercator().fitExtent(
    [
      [PLATE_PADDING, PLATE_PADDING],
      [PLATE_WIDTH - PLATE_PADDING, PLATE_HEIGHT - PLATE_PADDING],
    ],
    collection
  );
  const pathGenerator = geoPath(projection).digits(PATH_DIGITS);

  // world-atlas carries only `id` (ISO 3166-1 numeric) and `name` per feature,
  // so the alpha-2 the rest of the app speaks comes from our own table.
  const idToAlpha2 = new Map(
    [...africaCountriesSource.matchAll(/numericId: '(\d+)', alpha2: '([A-Z]{2})'/g)].map(
      (match) => [match[1], match[2]]
    )
  );

  const countries = features
    .map((f) => {
      const path = pathGenerator(f);
      const centroid = pathGenerator.centroid(f);
      if (!path || !Number.isFinite(centroid[0]) || !Number.isFinite(centroid[1])) return null;
      return {
        alpha2: idToAlpha2.get(String(f.id)) ?? '',
        path,
        centroid: [Number(centroid[0].toFixed(1)), Number(centroid[1].toFixed(1))],
      };
    })
    .filter(Boolean);

  // The halo behind the country fills, drawn from the MERGED continent rather
  // than from the same feature collection again. Projecting the collection
  // would re-emit every internal border - a second full copy of the geometry
  // above, ~140 KB of it, to draw lines the country paths then cover.
  const merged = merge(
    detailed,
    detailed.objects.countries.geometries.filter((g) => AFRICA_NUMERIC_IDS.has(String(g.id)))
  );
  const outline = pathGenerator(merged);
  const bounds = geoBounds(collection);

  if (countries.length < 50) {
    throw new Error(`Plate has only ${countries.length} countries`);
  }

  const rows = countries
    .map(
      (country) =>
        `  { alpha2: '${country.alpha2}', centroid: [${country.centroid[0]}, ${country.centroid[1]}], path: '${country.path}' },`
    )
    .join('\n');

  const size = write(
    'plate.generated.ts',
    `${BANNER}
export interface PlateCountry {
  alpha2: string;
  /** Rendered outline in plate coordinates. */
  path: string;
  /** Where a marker for this country belongs, in plate coordinates. */
  centroid: readonly [number, number];
}

export const PLATE_WIDTH = ${PLATE_WIDTH};
export const PLATE_HEIGHT = ${PLATE_HEIGHT};

export const PLATE_COUNTRIES: readonly PlateCountry[] = [
${rows}
];

/** The continent as one outline, for the halo behind the country fills. */
export const PLATE_OUTLINE =
  '${outline}';

/** Bounding box in degrees: [[west, south], [east, north]]. */
export const PLATE_BOUNDS: readonly [readonly [number, number], readonly [number, number]] = [
  [${bounds[0][0].toFixed(4)}, ${bounds[0][1].toFixed(4)}],
  [${bounds[1][0].toFixed(4)}, ${bounds[1][1].toFixed(4)}],
];
`
  );

  console.log(`  plate.generated.ts      ${kb(size).padStart(9)}  ${countries.length} countries`);
}

// -------------------------------------------------------------------- main

console.log('Building map geometry from world-atlas:');
const { detailed, coarse } = buildGlobe();
buildLogo(coarse);
buildPlate(detailed);
console.log('Done.');
