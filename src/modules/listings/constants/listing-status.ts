export enum ListingStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  /** Accepted deal in progress — hidden from public browse. */
  UNDER_CONTRACT = 'UNDER_CONTRACT',
  ARCHIVED = 'ARCHIVED',
}

export const LISTING_STATUSES = Object.values(ListingStatus) as [
  ListingStatus,
  ...ListingStatus[],
];
