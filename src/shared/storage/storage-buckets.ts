/**
 * Application S3 buckets. Provisioned once on StorageModule init
 * via createBucket (idempotent — skips if already present).
 */
export enum StorageBucket {
  LISTINGS = 'mykwatta-listings',
  KYC = 'mykwatta-kyc',
  ORGANISATIONS = 'mykwatta-organisations',
}

export const STORAGE_BUCKETS = Object.values(StorageBucket) as [
  StorageBucket,
  ...StorageBucket[],
];
