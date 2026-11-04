export enum ListingReportReason {
  FRAUD = 'FRAUD',
  MISLEADING = 'MISLEADING',
  DUPLICATE = 'DUPLICATE',
  SPAM = 'SPAM',
  OTHER = 'OTHER',
}

export const LISTING_REPORT_REASONS = Object.values(ListingReportReason) as [
  ListingReportReason,
  ...ListingReportReason[],
];

/** Open reports at or above this count auto-freeze the listing (unless already frozen). */
export const LISTING_REPORT_AUTO_FREEZE_THRESHOLD = 3;
