import type { GeoJsonGeometry } from '@mykwatta/core/database/schema/geo.schema';

/** Stable IDs for Cameroon geo fixtures (Phase 1). */
export const GeoSeedIds = {
  cities: {
    yaounde: 'seed_geo_city_yaounde',
    douala: 'seed_geo_city_douala',
  },
  quartiers: {
    bastos: 'seed_geo_quartier_bastos',
    odza: 'seed_geo_quartier_odza',
    bonanjo: 'seed_geo_quartier_bonanjo',
    akwa: 'seed_geo_quartier_akwa',
    bonapriso: 'seed_geo_quartier_bonapriso',
  },
} as const;

/** Simple axis-aligned rectangle polygon (GeoJSON lon/lat order, closed ring). */
export function rectBoundaryAround(
  latitude: number,
  longitude: number,
  delta = 0.005,
): GeoJsonGeometry {
  const minLng = longitude - delta;
  const maxLng = longitude + delta;
  const minLat = latitude - delta;
  const maxLat = latitude + delta;
  return {
    type: 'Polygon',
    coordinates: [
      [
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat],
      ],
    ],
  };
}

export type GeoCitySeed = {
  id: string;
  name: string;
  nameFr: string;
  countryCode: string;
};

export type GeoQuartierSeed = {
  id: string;
  cityId: string;
  name: string;
  nameFr: string;
  slug: string;
  centerLatitude: number;
  centerLongitude: number;
  boundary: GeoJsonGeometry;
};

export const geoCities: GeoCitySeed[] = [
  {
    id: GeoSeedIds.cities.yaounde,
    name: 'Yaoundé',
    nameFr: 'Yaoundé',
    countryCode: 'CM',
  },
  {
    id: GeoSeedIds.cities.douala,
    name: 'Douala',
    nameFr: 'Douala',
    countryCode: 'CM',
  },
];

export const geoQuartiers: GeoQuartierSeed[] = [
  {
    id: GeoSeedIds.quartiers.bastos,
    cityId: GeoSeedIds.cities.yaounde,
    name: 'Bastos',
    nameFr: 'Bastos',
    slug: 'bastos',
    centerLatitude: 3.8756,
    centerLongitude: 11.5175,
    boundary: rectBoundaryAround(3.8756, 11.5175),
  },
  {
    id: GeoSeedIds.quartiers.odza,
    cityId: GeoSeedIds.cities.yaounde,
    name: 'Odza',
    nameFr: 'Odza',
    slug: 'odza',
    centerLatitude: 3.848,
    centerLongitude: 11.545,
    boundary: rectBoundaryAround(3.848, 11.545),
  },
  {
    id: GeoSeedIds.quartiers.bonanjo,
    cityId: GeoSeedIds.cities.douala,
    name: 'Bonanjo',
    nameFr: 'Bonanjo',
    slug: 'bonanjo',
    centerLatitude: 4.048,
    centerLongitude: 9.704,
    boundary: rectBoundaryAround(4.048, 9.704),
  },
  {
    id: GeoSeedIds.quartiers.akwa,
    cityId: GeoSeedIds.cities.douala,
    name: 'Akwa',
    nameFr: 'Akwa',
    slug: 'akwa',
    centerLatitude: 4.051,
    centerLongitude: 9.692,
    boundary: rectBoundaryAround(4.051, 9.692),
  },
  {
    id: GeoSeedIds.quartiers.bonapriso,
    cityId: GeoSeedIds.cities.douala,
    name: 'Bonapriso',
    nameFr: 'Bonapriso',
    slug: 'bonapriso',
    centerLatitude: 4.018,
    centerLongitude: 9.71,
    boundary: rectBoundaryAround(4.018, 9.71),
  },
];
