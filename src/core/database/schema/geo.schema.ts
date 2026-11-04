import {
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

/** GeoJSON geometry stored on quartier boundaries (typically Polygon). */
export type GeoJsonGeometry = {
  type: string;
  coordinates: unknown;
};

export const geoCities = pgTable('geo_cities', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nameFr: text('name_fr'),
  countryCode: text('country_code').notNull().default('CM'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const geoQuartiers = pgTable(
  'geo_quartiers',
  {
    id: text('id').primaryKey(),
    cityId: text('city_id')
      .notNull()
      .references(() => geoCities.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    nameFr: text('name_fr'),
    slug: text('slug').notNull(),
    centerLatitude: doublePrecision('center_latitude'),
    centerLongitude: doublePrecision('center_longitude'),
    boundary: jsonb('boundary').$type<GeoJsonGeometry>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('geo_quartiers_city_idx').on(table.cityId),
    index('geo_quartiers_slug_idx').on(table.slug),
  ],
);
