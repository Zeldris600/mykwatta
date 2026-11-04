export enum InquiryStatus {
  OPEN = 'OPEN',
  RESPONDED = 'RESPONDED',
  CLOSED = 'CLOSED',
}

export const INQUIRY_STATUSES = Object.values(InquiryStatus) as [
  InquiryStatus,
  ...InquiryStatus[],
];
