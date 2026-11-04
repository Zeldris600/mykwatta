export enum InviteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

export const INVITE_STATUSES = Object.values(InviteStatus) as [
  InviteStatus,
  ...InviteStatus[],
];
