import { geoMercator, geoPath, geoArea } from 'd3-geo';
import { merge } from 'topojson-client';
import type { Topology, GeometryObject } from 'topojson-specification';
import worldTopology from '../../assets/geo/countries-50m.json';
import { AFRICA_NUMERIC_IDS } from '../../lib/d3/africaCountries';
import styles from './LogoMap.module.scss';

const SIZE = 400;

const topology = worldTopology as unknown as Topology;
const collection = topology.objects.countries as unknown as {
  type: 'GeometryCollection';
  geometries: (GeometryObject & { id?: string | number })[];
};

const african = collection.geometries.filter((g) =>
  AFRICA_NUMERIC_IDS.has(String(g.id))
);

const merged = merge(topology, african);

const polygons = (merged as { type: 'MultiPolygon'; coordinates: number[][][][] }).coordinates.map(
  (coords) => ({ type: 'Polygon', coordinates: coords })
);
const areas = polygons.map((p) => geoArea(p as any));
const mainland = polygons[areas.indexOf(Math.max(...areas))];

const projection = geoMercator().fitSize([SIZE, SIZE], mainland as any);
const pathGen = geoPath(projection);
const AFRICA_PATH = pathGen(mainland as any) || '';
const CENTER = pathGen.centroid(mainland as any) as [number, number];
const RINGS = [1, 0.75, 0.5];

interface LogoMapProps {
  size?: number;
}

export function LogoMap({ size = 28 }: LogoMapProps) {
  return (
    <svg
      className={styles.icon}
      width={size}
      height={size}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {RINGS.map((s) => (
        <path
          key={s}
          d={AFRICA_PATH}
          fill="none"
          strokeWidth={12}
          transform={
            s === 1
              ? undefined
              : `translate(${CENTER[0]},${CENTER[1]}) scale(${s}) translate(${-CENTER[0]},${-CENTER[1]})`
          }
        />
      ))}
    </svg>
  );
}
