export enum DealStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export const DEAL_STATUSES = Object.values(DealStatus) as [
  DealStatus,
  ...DealStatus[],
];
