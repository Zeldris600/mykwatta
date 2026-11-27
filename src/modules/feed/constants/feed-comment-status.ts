export enum FeedCommentStatus {
  ACTIVE = 'ACTIVE',
  HIDDEN = 'HIDDEN',
}

export const FEED_COMMENT_STATUSES = Object.values(FeedCommentStatus) as [
  FeedCommentStatus,
  ...FeedCommentStatus[],
];
