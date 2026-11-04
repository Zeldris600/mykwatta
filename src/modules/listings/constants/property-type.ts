export enum PropertyType {
  APARTMENT = 'APARTMENT',
  HOUSE = 'HOUSE',
  STUDIO = 'STUDIO',
  DUPLEX = 'DUPLEX',
  LAND = 'LAND',
  COMMERCIAL = 'COMMERCIAL',
  OTHER = 'OTHER',
}

export const PROPERTY_TYPES = Object.values(PropertyType) as [
  PropertyType,
  ...PropertyType[],
];
