export enum FeedPostStatus {
  ACTIVE = 'ACTIVE',
  HIDDEN = 'HIDDEN',
}

export const FEED_POST_STATUSES = Object.values(FeedPostStatus) as [
  FeedPostStatus,
  ...FeedPostStatus[],
];
