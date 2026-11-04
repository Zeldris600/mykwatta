export enum ListingReportStatus {
  OPEN = 'OPEN',
  REVIEWING = 'REVIEWING',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export const LISTING_REPORT_STATUSES = Object.values(ListingReportStatus) as [
  ListingReportStatus,
  ...ListingReportStatus[],
];
