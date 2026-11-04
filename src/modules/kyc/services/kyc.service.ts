import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { memoryStorage } from 'multer';
import type { Options as MulterOptions } from 'multer';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { userKyc } from '@mykwatta/core/database/schema/kyc.schema';
import { Persona } from '@mykwatta/modules/identity/constants';
import { IdentityService } from '@mykwatta/modules/identity/services';
import {
  KYC_DOCUMENT_ALLOWED_MIME_TYPES,
  KYC_DOCUMENT_MAX_BYTES,
  KYC_DOCUMENT_SIGNED_URL_TTL_SECONDS,
  KycStatus,
} from '@mykwatta/modules/kyc/constants';
import type { DecideKycDto, SubmitKycDto } from '@mykwatta/modules/kyc/dto';
import {
  assertUploadedFile,
  kycDocumentObjectKey,
  StorageBucket,
  StorageService,
  type UploadedFileLike,
} from '@mykwatta/shared/storage';

export const kycDocumentMulterOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: KYC_DOCUMENT_MAX_BYTES, files: 1 },
};

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly identity: IdentityService,
    private readonly storage: StorageService,
  ) {}

  async getMine(userId: string) {
    try {
      const record = await this.db.query.userKyc.findFirst({
        where: eq(userKyc.userId, userId),
      });
      if (!record) {
        return { status: null, userId };
      }
      return this.withDocumentUrl(record);
    } catch (error) {
      throw AppException.database('Failed to load KYC status', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async assertApproved(userId: string): Promise<void> {
    const record = await this.db.query.userKyc.findFirst({
      where: eq(userKyc.userId, userId),
    });
    if (!record || record.status !== KycStatus.APPROVED) {
      throw AppException.forbidden(
        'Approved KYC is required before publishing listings',
      );
    }
  }

  async isApproved(userId: string): Promise<boolean> {
    try {
      const record = await this.db.query.userKyc.findFirst({
        where: eq(userKyc.userId, userId),
      });
      return record?.status === KycStatus.APPROVED;
    } catch (error) {
      throw AppException.database('Failed to check KYC status', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async submit(
    userId: string,
    input: SubmitKycDto,
    file: UploadedFileLike | undefined,
  ) {
    let uploadedKey: string | undefined;
    let persisted = false;
    try {
      const existing = await this.db.query.userKyc.findFirst({
        where: eq(userKyc.userId, userId),
      });

      if (existing?.status === KycStatus.UNDER_REVIEW) {
        throw AppException.conflict('KYC is already under review');
      }
      if (existing?.status === KycStatus.APPROVED) {
        throw AppException.conflict('KYC is already approved');
      }

      const uploaded = assertUploadedFile(file, {
        field: 'document',
        maxBytes: KYC_DOCUMENT_MAX_BYTES,
        allowedMimeTypes: KYC_DOCUMENT_ALLOWED_MIME_TYPES,
      });

      const kycId = existing?.id ?? createId();
      const contentType = uploaded.mimetype.trim().toLowerCase();
      const objectKey = kycDocumentObjectKey({
        userId,
        kycId,
        contentType,
      });

      await this.storage.putObject({
        bucket: StorageBucket.KYC,
        key: objectKey,
        body: uploaded.buffer,
        contentType,
        metadata: {
          userId,
          kycId,
          documentType: input.documentType,
        },
      });
      uploadedKey = objectKey;

      const values = {
        status: KycStatus.UNDER_REVIEW,
        documentType: input.documentType,
        documentNumber: input.documentNumber.trim(),
        documentObjectKey: objectKey,
        documentContentType: contentType,
        fullName: input.fullName.trim(),
        rejectionReason: null,
        reviewedByUserId: null,
        reviewedAt: null,
        submittedAt: new Date(),
      };

      if (existing) {
        await this.db
          .update(userKyc)
          .set(values)
          .where(eq(userKyc.userId, userId));
        persisted = true;

        if (
          existing.documentObjectKey &&
          existing.documentObjectKey !== objectKey
        ) {
          await this.storage
            .deleteObject({
              bucket: StorageBucket.KYC,
              key: existing.documentObjectKey,
            })
            .catch(() => undefined);
        }
      } else {
        await this.db.insert(userKyc).values({
          id: kycId,
          userId,
          ...values,
        });
        persisted = true;
      }

      return this.getMine(userId);
    } catch (error) {
      if (uploadedKey && !persisted) {
        await this.storage
          .deleteObject({
            bucket: StorageBucket.KYC,
            key: uploadedKey,
          })
          .catch(() => undefined);
      }
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.error(
        `KYC submit failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw AppException.database('Failed to submit KYC', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async decide(
    targetUserId: string,
    reviewerUserId: string,
    input: DecideKycDto,
  ) {
    try {
      await this.assertPlatformAdmin(reviewerUserId);

      if (
        input.status === KycStatus.REJECTED &&
        !input.rejectionReason?.trim()
      ) {
        throw AppException.badRequest(
          'rejectionReason is required when rejecting KYC',
        );
      }

      const existing = await this.db.query.userKyc.findFirst({
        where: eq(userKyc.userId, targetUserId),
      });
      if (!existing) {
        throw AppException.notFound('No KYC submission found for this user');
      }
      if (existing.status !== KycStatus.UNDER_REVIEW) {
        throw AppException.badRequest(
          'Only submissions under review can be decided',
        );
      }

      await this.db
        .update(userKyc)
        .set({
          status: input.status,
          rejectionReason:
            input.status === KycStatus.REJECTED
              ? input.rejectionReason!.trim()
              : null,
          reviewedByUserId: reviewerUserId,
          reviewedAt: new Date(),
        })
        .where(eq(userKyc.userId, targetUserId));

      return this.getMine(targetUserId);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to decide KYC', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listUnderReview(reviewerUserId: string) {
    try {
      await this.assertPlatformAdmin(reviewerUserId);
      const rows = await this.db.query.userKyc.findMany({
        where: eq(userKyc.status, KycStatus.UNDER_REVIEW),
      });
      return Promise.all(rows.map((row) => this.withDocumentUrl(row)));
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to list KYC submissions', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async withDocumentUrl(record: typeof userKyc.$inferSelect) {
    const { documentObjectKey, ...rest } = record;
    return {
      ...rest,
      documentUrl: await this.storage.getSignedUrl({
        bucket: StorageBucket.KYC,
        key: documentObjectKey,
        expiresInSeconds: KYC_DOCUMENT_SIGNED_URL_TTL_SECONDS,
      }),
    };
  }

  private async assertPlatformAdmin(userId: string): Promise<void> {
    const personas = await this.identity.listPersonasForUser(userId);
    if (!personas.includes(Persona.PLATFORM_ADMIN)) {
      throw AppException.forbidden('Platform admin persona required');
    }
  }
}
