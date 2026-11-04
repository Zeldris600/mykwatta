/**
 * FE marker for whether a listing still accepts a listing deposit checkout.
 * Use `status` for UI branching; `reason` explains UNAVAILABLE / PAID.
 */
export enum DepositAvailabilityStatus {
  /** Listing is published; this viewer may start a new deposit checkout. */
  AVAILABLE = 'AVAILABLE',
  /** Viewer already has PENDING / REQUIRES_ACTION — resume that payment. */
  OPEN_CHECKOUT = 'OPEN_CHECKOUT',
  /** Viewer already paid the full listing deposit — do not charge again. */
  PAID = 'PAID',
  /** Listing is not taking deposits (under contract, archived, draft, own listing). */
  UNAVAILABLE = 'UNAVAILABLE',
}

export enum DepositAvailabilityReason {
  UNDER_CONTRACT = 'UNDER_CONTRACT',
  ARCHIVED = 'ARCHIVED',
  DRAFT = 'DRAFT',
  OWN_LISTING = 'OWN_LISTING',
  ALREADY_PAID = 'ALREADY_PAID',
  OPEN_CHECKOUT = 'OPEN_CHECKOUT',
}

export const DEPOSIT_AVAILABILITY_STATUSES = Object.values(
  DepositAvailabilityStatus,
) as DepositAvailabilityStatus[];

export const DEPOSIT_AVAILABILITY_REASONS = Object.values(
  DepositAvailabilityReason,
) as DepositAvailabilityReason[];
