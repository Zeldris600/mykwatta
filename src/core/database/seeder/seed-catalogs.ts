import {
  amenityCatalog,
  landmarkCatalog,
} from '@mykwatta/core/database/schema/catalogs.schema';
import type { DrizzleDb } from '@mykwatta/core/database/drizzle.provider';
import {
  AMENITY_CATALOG_SEEDS,
  LANDMARK_CATALOG_SEEDS,
} from '@mykwatta/core/database/seeder/catalog-data';

export async function seedCatalogs(db: DrizzleDb): Promise<void> {
  await db
    .insert(amenityCatalog)
    .values([...AMENITY_CATALOG_SEEDS])
    .onConflictDoNothing({ target: amenityCatalog.slug });
  await db
    .insert(landmarkCatalog)
    .values([...LANDMARK_CATALOG_SEEDS])
    .onConflictDoNothing({ target: landmarkCatalog.slug });
}
