import { feature } from 'topojson-client';
import type { GeometryObject, Topology } from 'topojson-specification';
import type { FeatureCollection, Feature, GeoJsonProperties } from 'geojson';
import worldTopology from '../../assets/geo/countries-50m.json';
import { AFRICA_NUMERIC_IDS } from './africaCountries';

export function getWorldFeatureCollection(topology: Topology = worldTopology as unknown as Topology): FeatureCollection {
  return feature(topology, topology.objects.countries as GeometryObject) as FeatureCollection;
}

export function getAfricaFeatureCollection(topology: Topology = worldTopology as unknown as Topology): FeatureCollection {
  const worldFeatures = feature(topology, topology.objects.countries as GeometryObject) as FeatureCollection;
  return {
    type: 'FeatureCollection',
    features: worldFeatures.features.filter(
      (f: Feature) => AFRICA_NUMERIC_IDS.has(String(f.id))
    ),
  };
}
