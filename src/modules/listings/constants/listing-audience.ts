/** Who the listing is primarily aimed at (search / campus filters). */
export enum ListingAudience {
  STUDENT = 'STUDENT',
  GENERAL = 'GENERAL',
  BOTH = 'BOTH',
}

export const LISTING_AUDIENCES = Object.values(ListingAudience) as [
  ListingAudience,
  ...ListingAudience[],
];
