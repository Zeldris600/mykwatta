import { Injectable, Logger } from '@nestjs/common';
import type {
  DeleteObjectInput,
  GetSignedUrlInput,
  PutObjectInput,
  PutObjectResult,
  StorageProvider,
} from '../storage.types';

@Injectable()
export class ConsoleStorageProvider implements StorageProvider {
  private readonly logger = new Logger(ConsoleStorageProvider.name);
  private readonly buckets = new Set<string>();

  createBucket(bucket: string): Promise<void> {
    if (this.buckets.has(bucket)) {
      return Promise.resolve();
    }
    this.buckets.add(bucket);
    this.logger.log(`[console storage] createBucket bucket=${bucket}`);
    return Promise.resolve();
  }

  putObject(input: PutObjectInput): Promise<PutObjectResult> {
    this.buckets.add(input.bucket);
    this.logger.log(
      `[console storage] put bucket=${input.bucket} key=${input.key} contentType=${input.contentType} bytes=${Buffer.byteLength(input.body)}`,
    );
    return Promise.resolve({
      key: input.key,
      bucket: input.bucket,
      url: `console://${input.bucket}/${input.key}`,
    });
  }

  getSignedUrl(input: GetSignedUrlInput): Promise<string> {
    return Promise.resolve(
      `console://${input.bucket}/${input.key}?expires=${input.expiresInSeconds ?? 3600}`,
    );
  }

  deleteObject(input: DeleteObjectInput): Promise<void> {
    this.logger.log(
      `[console storage] delete bucket=${input.bucket} key=${input.key}`,
    );
    return Promise.resolve();
  }
}
