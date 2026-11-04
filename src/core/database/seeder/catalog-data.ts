export type CatalogSeed = {
  id: string;
  slug: string;
  nameEn: string;
  nameFr: string;
  category: string;
};

export const AMENITY_CATALOG_SEEDS: readonly CatalogSeed[] = [
  {
    id: 'amenity_generator',
    slug: 'generator',
    nameEn: 'Generator',
    nameFr: 'Groupe électrogène',
    category: 'UTILITY',
  },
  {
    id: 'amenity_inverter',
    slug: 'inverter',
    nameEn: 'Inverter',
    nameFr: 'Onduleur',
    category: 'UTILITY',
  },
  {
    id: 'amenity_borehole',
    slug: 'borehole',
    nameEn: 'Borehole',
    nameFr: 'Forage',
    category: 'UTILITY',
  },
  {
    id: 'amenity_camwater',
    slug: 'camwater',
    nameEn: 'Camwater',
    nameFr: 'Camwater',
    category: 'UTILITY',
  },
  {
    id: 'amenity_furnished',
    slug: 'furnished',
    nameEn: 'Furnished',
    nameFr: 'Meublé',
    category: 'FURNISHING',
  },
  {
    id: 'amenity_parking',
    slug: 'parking',
    nameEn: 'Parking',
    nameFr: 'Parking',
    category: 'ACCESS',
  },
  {
    id: 'amenity_standing',
    slug: 'standing',
    nameEn: 'Standing',
    nameFr: 'Standing',
    category: 'FINISH',
  },
];

export const LANDMARK_CATALOG_SEEDS: readonly CatalogSeed[] = [
  {
    id: 'landmark_school',
    slug: 'school',
    nameEn: 'School',
    nameFr: 'École',
    category: 'EDUCATION',
  },
  {
    id: 'landmark_marche',
    slug: 'marche',
    nameEn: 'Market',
    nameFr: 'Marché',
    category: 'COMMERCE',
  },
  {
    id: 'landmark_embassy_corridor',
    slug: 'embassy_corridor',
    nameEn: 'Embassy corridor',
    nameFr: 'Corridor des ambassades',
    category: 'DIPLOMATIC',
  },
];
