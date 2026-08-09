import { geoMercator, geoOrthographic, geoPath, geoGraticule10, geoCentroid } from 'd3-geo';
import type { GeoProjection, GeoPath } from 'd3-geo';
import type { FeatureCollection, Feature } from 'geojson';

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
  const pathGenerator = geoPath(projection);
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
  const pathGenerator = geoPath(projection);
  return { projection, pathGenerator };
}

export function getSphereOutlinePath(pathGenerator: GeoPath): string {
  return pathGenerator(SPHERE) || '';
}

export function getGraticulePath(pathGenerator: GeoPath): string {
  return pathGenerator(geoGraticule10()) || '';
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
