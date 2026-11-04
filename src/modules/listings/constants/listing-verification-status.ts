export enum ListingVerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export const LISTING_VERIFICATION_STATUSES = Object.values(
  ListingVerificationStatus,
) as [ListingVerificationStatus, ...ListingVerificationStatus[]];
