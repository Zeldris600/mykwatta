import {
  geoCities,
  geoQuartiers,
} from '@mykwatta/core/database/schema/geo.schema';
import type { DrizzleDb } from '@mykwatta/core/database/drizzle.provider';
import {
  geoCities as geoCitySeeds,
  geoQuartiers as geoQuartierSeeds,
} from '@mykwatta/core/database/seeder/geo-data';

export async function seedGeo(db: DrizzleDb): Promise<void> {
  const now = new Date();
  await db
    .insert(geoCities)
    .values(
      geoCitySeeds.map((c) => ({
        id: c.id,
        name: c.name,
        nameFr: c.nameFr,
        countryCode: c.countryCode,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing({ target: geoCities.id });

  await db
    .insert(geoQuartiers)
    .values(
      geoQuartierSeeds.map((q) => ({
        id: q.id,
        cityId: q.cityId,
        name: q.name,
        nameFr: q.nameFr,
        slug: q.slug,
        centerLatitude: q.centerLatitude,
        centerLongitude: q.centerLongitude,
        boundary: q.boundary,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing({ target: geoQuartiers.id });
}
