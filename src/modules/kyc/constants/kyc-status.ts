export enum KycStatus {
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const KYC_STATUSES = Object.values(KycStatus) as [
  KycStatus,
  ...KycStatus[],
];
