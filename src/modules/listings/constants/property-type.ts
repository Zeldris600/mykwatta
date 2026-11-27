export enum PropertyType {
  APARTMENT = 'APARTMENT',
  HOUSE = 'HOUSE',
  STUDIO = 'STUDIO',
  /** Student residence / “cité” (Bambili and similar campus markets). */
  CITE = 'CITE',
  DUPLEX = 'DUPLEX',
  LAND = 'LAND',
  COMMERCIAL = 'COMMERCIAL',
  OTHER = 'OTHER',
}

export const PROPERTY_TYPES = Object.values(PropertyType) as [
  PropertyType,
  ...PropertyType[],
];
