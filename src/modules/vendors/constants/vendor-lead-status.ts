export enum VendorLeadStatus {
  REQUESTED = 'REQUESTED',
  SENT = 'SENT',
  CLOSED = 'CLOSED',
}

export const VENDOR_LEAD_STATUSES = Object.values(VendorLeadStatus) as [
  VendorLeadStatus,
  ...VendorLeadStatus[],
];
