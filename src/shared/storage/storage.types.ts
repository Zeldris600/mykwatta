import type { StorageBucket } from './storage-buckets';

export type PutObjectInput = {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  bucket: StorageBucket | string;
  metadata?: Record<string, string>;
};

export type PutObjectResult = {
  key: string;
  bucket: string;
  /** Public or path-style object URL when available. */
  url: string;
};

export type GetSignedUrlInput = {
  key: string;
  bucket: StorageBucket | string;
  /** Seconds until the URL expires. */
  expiresInSeconds?: number;
};

export type DeleteObjectInput = {
  key: string;
  bucket: StorageBucket | string;
};

export interface StorageProvider {
  /** Create a bucket if it does not already exist. */
  createBucket(bucket: string): Promise<void>;
  putObject(input: PutObjectInput): Promise<PutObjectResult>;
  getSignedUrl(input: GetSignedUrlInput): Promise<string>;
  deleteObject(input: DeleteObjectInput): Promise<void>;
}
