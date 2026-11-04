import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { STORAGE_BUCKETS } from './storage-buckets';
import { STORAGE_PROVIDER } from './storage.tokens';
import type {
  DeleteObjectInput,
  GetSignedUrlInput,
  PutObjectInput,
  PutObjectResult,
  StorageProvider,
} from './storage.types';

/** S3 bucket naming: 3–63 chars, lowercase alphanumeric + hyphen (no leading/trailing hyphen). */
const BUCKET_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  /** Buckets already ensured in this process — avoid repeat Head/Create round-trips. */
  private readonly ensuredBuckets = new Set<string>();

  constructor(
    @Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const bucket of STORAGE_BUCKETS) {
      await this.createBucket(bucket);
    }
  }

  /**
   * Create an S3-compatible bucket if missing.
   * No-ops when this process has already ensured the bucket.
   */
  async createBucket(bucket: string): Promise<void> {
    const name = this.assertBucketName(bucket);
    if (this.ensuredBuckets.has(name)) {
      return;
    }

    await this.provider.createBucket(name);
    this.ensuredBuckets.add(name);
    this.logger.log(`Storage bucket ready: ${name}`);
  }

  putObject(input: PutObjectInput): Promise<PutObjectResult> {
    if (!input.key?.trim()) {
      throw AppException.badRequest('Storage object key is required');
    }
    if (!input.contentType?.trim()) {
      throw AppException.badRequest('Storage content type is required');
    }
    return this.provider.putObject({
      ...input,
      key: input.key.trim(),
      contentType: input.contentType.trim(),
      bucket: this.assertBucketName(input.bucket),
    });
  }

  getSignedUrl(input: GetSignedUrlInput): Promise<string> {
    if (!input.key?.trim()) {
      throw AppException.badRequest('Storage object key is required');
    }
    return this.provider.getSignedUrl({
      ...input,
      key: input.key.trim(),
      bucket: this.assertBucketName(input.bucket),
    });
  }

  deleteObject(input: DeleteObjectInput): Promise<void> {
    if (!input.key?.trim()) {
      throw AppException.badRequest('Storage object key is required');
    }

    return this.provider.deleteObject({
      key: input.key.trim(),
      bucket: this.assertBucketName(input.bucket),
    });
  }

  private assertBucketName(bucket: string): string {
    const name = bucket?.trim();
    if (!name) {
      throw AppException.badRequest('Storage bucket name is required');
    }
    if (!BUCKET_NAME_PATTERN.test(name)) {
      throw AppException.badRequest(
        'Invalid storage bucket name (use 3–63 lowercase alphanumeric characters and hyphens)',
        { bucket: name },
      );
    }
    return name;
  }
}
