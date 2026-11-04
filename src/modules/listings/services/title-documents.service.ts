import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { memoryStorage } from 'multer';
import type { Options as MulterOptions } from 'multer';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { listings } from '@mykwatta/core/database/schema/listings.schema';
import { listingTitleDocuments } from '@mykwatta/core/database/schema/title-documents.schema';
import { IdentityService } from '@mykwatta/modules/identity/services';
import {
  TITLE_DOCUMENT_ALLOWED_MIME_TYPES,
  TITLE_DOCUMENT_MAX_BYTES,
  TitleDocumentStatus,
} from '@mykwatta/modules/listings/constants';
import type {
  ReviewTitleDocumentDto,
  UploadTitleDocumentDto,
} from '@mykwatta/modules/listings/dto';
import { ListingsService } from '@mykwatta/modules/listings/services/listings.service';
import {
  buildBuyerTitleChecklist,
  type BuyerTitleChecklist,
} from '@mykwatta/modules/listings/types/buyer-title-checklist';
import {
  assertUploadedFile,
  listingTitleDocumentObjectKey,
  StorageBucket,
  StorageService,
  type UploadedFileLike,
} from '@mykwatta/shared/storage';

export const titleDocumentMulterOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: TITLE_DOCUMENT_MAX_BYTES, files: 1 },
};

@Injectable()
export class TitleDocumentsService {
  private readonly logger = new Logger(TitleDocumentsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly listingsService: ListingsService,
    private readonly identity: IdentityService,
    private readonly storage: StorageService,
  ) {}

  async listForManager(listingId: string, userId: string) {
    await this.listingsService.assertUserCanManage(listingId, userId);
    const rows = await this.db.query.listingTitleDocuments.findMany({
      where: eq(listingTitleDocuments.listingId, listingId),
      orderBy: [desc(listingTitleDocuments.createdAt)],
    });
    return this.withSignedUrls(rows);
  }

  async upload(
    listingId: string,
    userId: string,
    file: UploadedFileLike | undefined,
    input: UploadTitleDocumentDto,
  ) {
    try {
      await this.listingsService.assertUserCanManage(listingId, userId);
      const uploaded = assertUploadedFile(file, {
        field: 'file',
        maxBytes: TITLE_DOCUMENT_MAX_BYTES,
        allowedMimeTypes: TITLE_DOCUMENT_ALLOWED_MIME_TYPES,
      });

      const documentId = createId();
      const contentType = uploaded.mimetype.trim().toLowerCase();
      const storageKey = listingTitleDocumentObjectKey({
        listingId,
        documentId,
        contentType,
      });

      await this.storage.putObject({
        bucket: StorageBucket.LISTINGS,
        key: storageKey,
        body: uploaded.buffer,
        contentType,
        metadata: {
          listingId,
          documentId,
          uploadedBy: userId,
          documentType: input.documentType,
        },
      });

      try {
        await this.db.insert(listingTitleDocuments).values({
          id: documentId,
          listingId,
          documentType: input.documentType,
          storageKey,
          status: TitleDocumentStatus.PENDING,
          uploadedBy: userId,
        });
      } catch (error) {
        await this.storage
          .deleteObject({ bucket: StorageBucket.LISTINGS, key: storageKey })
          .catch(() => undefined);
        throw error;
      }

      const row = await this.requireDocument(documentId);
      return (await this.withSignedUrls([row]))[0];
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.error(
        `title document upload failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw AppException.database('Failed to upload title document', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async review(
    documentId: string,
    adminUserId: string,
    input: ReviewTitleDocumentDto,
  ) {
    await this.identity.assertPlatformAdmin(adminUserId);
    const existing = await this.requireDocument(documentId);
    try {
      await this.db
        .update(listingTitleDocuments)
        .set({
          status: input.status,
          reviewedAt: new Date(),
        })
        .where(eq(listingTitleDocuments.id, documentId));

      await this.refreshDocumentsVerified(existing.listingId);
      return this.requireDocument(documentId);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to review title document', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async buyerChecklist(listing: {
    id: string;
    titleStatus: BuyerTitleChecklist['titleStatus'];
    documentsVerifiedByMykwatta: boolean;
  }): Promise<BuyerTitleChecklist> {
    const rows = await this.db.query.listingTitleDocuments.findMany({
      where: eq(listingTitleDocuments.listingId, listing.id),
      orderBy: [desc(listingTitleDocuments.createdAt)],
    });
    return buildBuyerTitleChecklist(listing, rows);
  }

  async countPendingForOwner(ownerUserId: string): Promise<number> {
    const rows = await this.db
      .select({ id: listingTitleDocuments.id })
      .from(listingTitleDocuments)
      .innerJoin(listings, eq(listingTitleDocuments.listingId, listings.id))
      .where(
        and(
          eq(listings.ownerUserId, ownerUserId),
          eq(listingTitleDocuments.status, TitleDocumentStatus.PENDING),
        ),
      );
    return rows.length;
  }

  private async refreshDocumentsVerified(listingId: string): Promise<void> {
    const approved = await this.db.query.listingTitleDocuments.findFirst({
      where: and(
        eq(listingTitleDocuments.listingId, listingId),
        eq(listingTitleDocuments.status, TitleDocumentStatus.APPROVED),
      ),
      columns: { id: true },
    });
    await this.db
      .update(listings)
      .set({ documentsVerifiedByMykwatta: approved != null })
      .where(eq(listings.id, listingId));
  }

  private async requireDocument(id: string) {
    const row = await this.db.query.listingTitleDocuments.findFirst({
      where: eq(listingTitleDocuments.id, id),
    });
    if (!row) {
      throw AppException.notFound('Title document not found');
    }
    return row;
  }

  private async withSignedUrls(
    rows: Array<typeof listingTitleDocuments.$inferSelect>,
  ) {
    return Promise.all(
      rows.map(async (row) => ({
        ...row,
        url: await this.storage.getSignedUrl({
          bucket: StorageBucket.LISTINGS,
          key: row.storageKey,
          expiresInSeconds: 60 * 60,
        }),
      })),
    );
  }
}
