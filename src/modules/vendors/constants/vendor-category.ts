export enum VendorCategory {
  PLUMBER = 'PLUMBER',
  ELECTRICIAN = 'ELECTRICIAN',
  PAINTER = 'PAINTER',
  CLEANING = 'CLEANING',
  GENERAL = 'GENERAL',
}

export const VENDOR_CATEGORIES = Object.values(VendorCategory) as [
  VendorCategory,
  ...VendorCategory[],
];
