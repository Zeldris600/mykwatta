export enum ListingType {
  RENT = 'RENT',
  SALE = 'SALE',
}

export const LISTING_TYPES = Object.values(ListingType) as [
  ListingType,
  ...ListingType[],
];
