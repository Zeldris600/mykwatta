export enum ListingMediaKind {
  PHOTO = 'PHOTO',
  FLOOR_PLAN = 'FLOOR_PLAN',
}

export const LISTING_MEDIA_KINDS = Object.values(ListingMediaKind) as [
  ListingMediaKind,
  ...ListingMediaKind[],
];

export const PREMIUM_MIN_PHOTOS = 5;
export const PREMIUM_MIN_FLOOR_PLANS = 1;
