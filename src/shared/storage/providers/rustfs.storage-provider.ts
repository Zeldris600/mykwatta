import { Logger } from '@nestjs/common';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { ApiConfigService } from '@mykwatta/core/config';
import type {
  DeleteObjectInput,
  GetSignedUrlInput,
  PutObjectInput,
  PutObjectResult,
  StorageProvider,
} from '../storage.types';

/** S3-compatible client pointed at RustFS (path-style). */
export class RustfsStorageProvider implements StorageProvider {
  private readonly logger = new Logger(RustfsStorageProvider.name);
  private readonly client: S3Client;
  private readonly endpoint: string;

  constructor(config: ApiConfigService) {
    const endpoint = config.s3Endpoint;
    const accessKey = config.s3AccessKey;
    const secretKey = config.s3SecretKey;

    if (!endpoint || !accessKey || !secretKey) {
      throw AppException.external(
        'RustFS storage requires S3_ENDPOINT, S3_ACCESS_KEY, and S3_SECRET_KEY',
      );
    }

    this.endpoint = endpoint;
    this.client = new S3Client({
      region: config.s3Region,
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    });
  }

  async createBucket(bucket: string): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: bucket }));
        this.logger.log(`Created RustFS bucket=${bucket}`);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw AppException.external('Failed to create RustFS bucket', {
          bucket,
          reason,
        });
      }
    }
  }

  async putObject(input: PutObjectInput): Promise<PutObjectResult> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: input.bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
          Metadata: input.metadata,
        }),
      );

      return {
        key: input.key,
        bucket: input.bucket,
        url: this.objectUrl(input.bucket, input.key),
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `RustFS putObject failed bucket=${input.bucket} key=${input.key}: ${reason}`,
      );
      throw AppException.external('Failed to upload object to RustFS', {
        bucket: input.bucket,
        key: input.key,
        reason,
      });
    }
  }

  async getSignedUrl(input: GetSignedUrlInput): Promise<string> {
    try {
      return await getSignedUrl(
        this.client,
        new GetObjectCommand({
          Bucket: input.bucket,
          Key: input.key,
        }),
        { expiresIn: input.expiresInSeconds ?? 3600 },
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw AppException.external('Failed to sign RustFS object URL', {
        bucket: input.bucket,
        key: input.key,
        reason,
      });
    }
  }

  async deleteObject(input: DeleteObjectInput): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: input.bucket,
          Key: input.key,
        }),
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw AppException.external('Failed to delete RustFS object', {
        bucket: input.bucket,
        key: input.key,
        reason,
      });
    }
  }

  private objectUrl(bucket: string, key: string): string {
    const base = this.endpoint.replace(/\/$/, '');
    return `${base}/${bucket}/${key}`;
  }
}
