import { geoMercator, geoOrthographic, geoPath, geoGraticule, geoCentroid } from 'd3-geo';
import type { GeoProjection, GeoPath } from 'd3-geo';
import type { FeatureCollection, Feature } from 'geojson';

// Decimal places kept in generated path data.
//
// d3 emits full float precision by default - "M412.38472938471234,88.1..." -
// and the globe rebuilds every path string on every frame of a drag. A tenth
// of a pixel is already finer than any display resolves, and dropping the rest
// cuts both the string building and the size of the attribute the browser then
// has to parse.
const PATH_DIGITS = 1;

// One line every 20 degrees rather than d3's 10. On a sphere ~400px across,
// a 10-degree grid is dense enough to read as texture rather than as a grid -
// and it is four times the geometry to re-project on every frame.
const GRATICULE = geoGraticule().step([20, 20]);

export interface Size {
  width: number;
  height: number;
  padding?: number;
}

export interface GlobeOptions extends Size {
  rotate?: [number, number];
}

export interface CountryPath {
  id: string;
  d: string;
  properties: unknown;
}

const SPHERE: { type: 'Sphere' } = { type: 'Sphere' };

export function createProjection(
  featureCollection: FeatureCollection,
  { width, height, padding = 20 }: Size
): { projection: GeoProjection; pathGenerator: GeoPath } {
  const projection = geoMercator().fitExtent(
    [
      [padding, padding],
      [width - padding, height - padding],
    ],
    featureCollection
  );
  const pathGenerator = geoPath(projection).digits(PATH_DIGITS);
  return { projection, pathGenerator };
}

export function buildCountryPaths(
  featureCollection: FeatureCollection,
  pathGenerator: GeoPath
): CountryPath[] {
  return featureCollection.features.map((f: Feature) => ({
    id: String(f.id),
    d: pathGenerator(f) || '',
    properties: f.properties,
  }));
}

export function rotationForLonLat([lon, lat]: [number, number]): [number, number] {
  return [-lon, -lat];
}

export function getDefaultGlobeCenter(featureCollection: FeatureCollection): [number, number] {
  return geoCentroid(featureCollection) as [number, number];
}

export function createGlobeProjection({
  width,
  height,
  padding = 20,
  rotate = [0, 0],
}: GlobeOptions): { projection: GeoProjection; pathGenerator: GeoPath } {
  const projection = geoOrthographic()
    .rotate([rotate[0], rotate[1], 0])
    .clipAngle(90)
    .fitExtent(
      [
        [padding, padding],
        [width - padding, height - padding],
      ],
      SPHERE
    );
  const pathGenerator = geoPath(projection).digits(PATH_DIGITS);
  return { projection, pathGenerator };
}

export function getSphereOutlinePath(pathGenerator: GeoPath): string {
  return pathGenerator(SPHERE) || '';
}

export function getGraticulePath(pathGenerator: GeoPath): string {
  return pathGenerator(GRATICULE()) || '';
}

export function getFeatureCentroid(
  featureCollectionEntry: Feature | null | undefined,
  pathGenerator: GeoPath
): [number, number] | null {
  if (!featureCollectionEntry) return null;
  const centroid = pathGenerator.centroid(featureCollectionEntry);
  if ((centroid as number[]).some((n) => Number.isNaN(n))) return null;
  return centroid as [number, number];
}
