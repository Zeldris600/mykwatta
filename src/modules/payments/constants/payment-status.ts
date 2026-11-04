export enum PaymentStatus {
  PENDING = 'PENDING',
  REQUIRES_ACTION = 'REQUIRES_ACTION',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export const PAYMENT_STATUSES = Object.values(PaymentStatus) as [
  PaymentStatus,
  ...PaymentStatus[],
];
