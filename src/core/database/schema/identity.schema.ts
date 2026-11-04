import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import {
  InviteStatus,
  OrganisationRole,
  Persona,
} from '@mykwatta/modules/identity/constants';
import { user } from './auth.schema';

/** Roles inside an organisation (agencies, portfolios). Not assigned at signup. */
export const organisationRoleEnum = pgEnum(
  'organisation_role',
  Object.values(OrganisationRole) as [OrganisationRole, ...OrganisationRole[]],
);

/** Account personas — independent of organisation membership. */
export const personaEnum = pgEnum(
  'persona',
  Object.values(Persona) as [Persona, ...Persona[]],
);

export const inviteStatusEnum = pgEnum(
  'invite_status',
  Object.values(InviteStatus) as [InviteStatus, ...InviteStatus[]],
);

export const organisations = pgTable('organisations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  /** S3 object key — exposed as signed URL via IdentityService. */
  licenceDocumentUrl: text('licence_document_url'),
  nuiDocumentUrl: text('nui_document_url'),
  licenceVerifiedAt: timestamp('licence_verified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const memberships = pgTable(
  'memberships',
  {
    id: text('id').primaryKey(),
    organisationId: text('organisation_id')
      .notNull()
      .references(() => organisations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: organisationRoleEnum('role')
      .notNull()
      .default(OrganisationRole.MEMBER),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('memberships_org_user_uidx').on(
      table.organisationId,
      table.userId,
    ),
    index('memberships_user_idx').on(table.userId),
  ],
);

export const organisationInvites = pgTable(
  'organisation_invites',
  {
    id: text('id').primaryKey(),
    organisationId: text('organisation_id')
      .notNull()
      .references(() => organisations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: organisationRoleEnum('role').notNull(),
    token: text('token').notNull().unique(),
    status: inviteStatusEnum('status').notNull().default(InviteStatus.PENDING),
    invitedByUserId: text('invited_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('organisation_invites_org_idx').on(table.organisationId),
    index('organisation_invites_email_idx').on(table.email),
    index('organisation_invites_token_idx').on(table.token),
  ],
);

export const userPersonas = pgTable(
  'user_personas',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    persona: personaEnum('persona').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_personas_user_persona_uidx').on(
      table.userId,
      table.persona,
    ),
    index('user_personas_user_idx').on(table.userId),
  ],
);
