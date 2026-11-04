import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import {
  geoCities,
  geoQuartiers,
  type GeoJsonGeometry,
} from '@mykwatta/core/database/schema/geo.schema';

export type GeoJsonFeatureCollection = {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
};

export type GeoJsonFeature = {
  type: 'Feature';
  id: string;
  properties: {
    id: string;
    cityId: string;
    name: string;
    nameFr: string | null;
    slug: string;
    centerLatitude: number | null;
    centerLongitude: number | null;
  };
  geometry: GeoJsonGeometry | null;
};

@Injectable()
export class GeoService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async listCities() {
    return this.db.select().from(geoCities).orderBy(geoCities.name);
  }

  async listQuartiersByCity(cityId: string) {
    const city = await this.db
      .select({ id: geoCities.id })
      .from(geoCities)
      .where(eq(geoCities.id, cityId))
      .limit(1);

    if (city.length === 0) {
      throw AppException.notFound('City not found');
    }

    return this.db
      .select()
      .from(geoQuartiers)
      .where(eq(geoQuartiers.cityId, cityId))
      .orderBy(geoQuartiers.name);
  }

  async quartiersFeatureCollection(): Promise<GeoJsonFeatureCollection> {
    const rows = await this.db.select().from(geoQuartiers);

    return {
      type: 'FeatureCollection',
      features: rows.map((row) => ({
        type: 'Feature',
        id: row.id,
        properties: {
          id: row.id,
          cityId: row.cityId,
          name: row.name,
          nameFr: row.nameFr,
          slug: row.slug,
          centerLatitude: row.centerLatitude,
          centerLongitude: row.centerLongitude,
        },
        geometry: row.boundary ?? null,
      })),
    };
  }
}
