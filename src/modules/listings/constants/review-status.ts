export enum ReviewStatus {
  ACTIVE = 'ACTIVE',
  HIDDEN = 'HIDDEN',
}

export const REVIEW_STATUSES = Object.values(ReviewStatus) as [
  ReviewStatus,
  ...ReviewStatus[],
];
