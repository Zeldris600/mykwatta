import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { KycDocumentType, KycStatus } from '@mykwatta/modules/kyc/constants';
import { user } from './auth.schema';

export const kycStatusEnum = pgEnum(
  'kyc_status',
  Object.values(KycStatus) as [KycStatus, ...KycStatus[]],
);

export const kycDocumentTypeEnum = pgEnum(
  'kyc_document_type',
  Object.values(KycDocumentType) as [KycDocumentType, ...KycDocumentType[]],
);

/** One active KYC record per user (latest submission / decision). */
export const userKyc = pgTable(
  'user_kyc',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: kycStatusEnum('status').notNull().default(KycStatus.UNDER_REVIEW),
    documentType: kycDocumentTypeEnum('document_type').notNull(),
    documentNumber: text('document_number').notNull(),
    /** Storage object key (RustFS / console); column kept as document_url. */
    documentObjectKey: text('document_url').notNull(),
    documentContentType: text('document_content_type').notNull(),
    fullName: text('full_name').notNull(),
    rejectionReason: text('rejection_reason'),
    reviewedByUserId: text('reviewed_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    submittedAt: timestamp('submitted_at').defaultNow().notNull(),
    reviewedAt: timestamp('reviewed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('user_kyc_user_uidx').on(table.userId),
    index('user_kyc_status_idx').on(table.status),
  ],
);
