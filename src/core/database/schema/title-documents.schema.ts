import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import {
  TitleDocumentStatus,
  TitleDocumentType,
} from '@mykwatta/modules/listings/constants/title-document';
import { user } from './auth.schema';
import { listings } from './listings.schema';

export const titleDocumentTypeEnum = pgEnum(
  'title_document_type',
  Object.values(TitleDocumentType) as [
    TitleDocumentType,
    ...TitleDocumentType[],
  ],
);

export const titleDocumentStatusEnum = pgEnum(
  'title_document_status',
  Object.values(TitleDocumentStatus) as [
    TitleDocumentStatus,
    ...TitleDocumentStatus[],
  ],
);

export const listingTitleDocuments = pgTable(
  'listing_title_documents',
  {
    id: text('id').primaryKey(),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    documentType: titleDocumentTypeEnum('document_type').notNull(),
    storageKey: text('storage_key').notNull(),
    status: titleDocumentStatusEnum('status')
      .notNull()
      .default(TitleDocumentStatus.PENDING),
    uploadedBy: text('uploaded_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    reviewedAt: timestamp('reviewed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('listing_title_documents_listing_idx').on(table.listingId),
    index('listing_title_documents_status_idx').on(table.status),
    index('listing_title_documents_uploader_idx').on(table.uploadedBy),
  ],
);
