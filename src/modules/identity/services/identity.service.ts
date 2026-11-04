import { randomBytes } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { and, eq, or } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { ApiConfigService } from '@mykwatta/core/config';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { user as userTable } from '@mykwatta/core/database/schema/auth.schema';
import {
  memberships,
  organisationInvites,
  organisations,
  userPersonas,
} from '@mykwatta/core/database/schema/identity.schema';
import type { auth as authInstance } from '@mykwatta/modules/identity/auth';
import {
  canManageInvites,
  InviteStatus,
  INVITABLE_ROLES,
  OrganisationRole,
  Persona,
  PERSONAS,
} from '@mykwatta/modules/identity/constants';
import type { SignUpWithPhoneDto } from '@mykwatta/modules/identity/dto';
import { EmailProducer } from '@mykwatta/shared/queue';
import {
  assertUploadedFile,
  StorageBucket,
  StorageService,
  type UploadedFileLike,
} from '@mykwatta/shared/storage';
import { memoryStorage } from 'multer';
import type { Options as MulterOptions } from 'multer';
import {
  KYC_DOCUMENT_ALLOWED_MIME_TYPES,
  KYC_DOCUMENT_MAX_BYTES,
} from '@mykwatta/modules/kyc/constants';
import { OrgDocumentType } from '@mykwatta/modules/identity/constants';
import type {
  UpdatePreferredLocaleDto,
  UploadOrgDocumentDto,
} from '@mykwatta/modules/identity/dto';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ORG_DOCUMENT_SIGNED_URL_TTL_SECONDS = 3600;

export const orgDocumentMulterOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: KYC_DOCUMENT_MAX_BYTES, files: 1 },
};

@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly authService: AuthService<typeof authInstance>,
    private readonly config: ApiConfigService,
    private readonly emailProducer: EmailProducer,
    private readonly storage: StorageService,
  ) {}

  async assertPlatformAdmin(userId: string): Promise<void> {
    const personas = await this.listPersonasForUser(userId);
    if (!personas.includes(Persona.PLATFORM_ADMIN)) {
      throw AppException.forbidden('Platform admin persona required');
    }
  }

  listAvailablePersonas(): readonly Persona[] {
    return PERSONAS;
  }

  /**
   * New account for any persona(s). No organisation is created.
   * OTP must already have been sent via Better Auth /phone-number/send-otp.
   */
  async signUpWithPhoneOtp(input: SignUpWithPhoneDto) {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();
    const phoneNumber = input.phoneNumber.trim();
    const personas = this.normalizePersonas(input.personas);

    try {
      const existing = await this.db.query.user.findFirst({
        where: or(
          eq(userTable.email, email),
          eq(userTable.phoneNumber, phoneNumber),
        ),
      });
      if (existing) {
        throw AppException.conflict(
          'An account with this email or phone number already exists. Sign in instead.',
        );
      }

      try {
        const api = this.authService.api as unknown as {
          consumePhoneNumberOTP: (args: {
            body: { phoneNumber: string; code: string };
          }) => Promise<unknown>;
        };
        await api.consumePhoneNumberOTP({
          body: {
            phoneNumber,
            code: input.code,
          },
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.warn(`OTP consume failed for ${phoneNumber}: ${reason}`);
        throw AppException.badRequest('Invalid or expired OTP code', {
          reason,
        });
      }

      const authContext = await this.authService.instance.$context;
      const created = await authContext.internalAdapter.createUser(
        {
          email,
          name,
          phoneNumber,
          phoneNumberVerified: true,
          emailVerified: false,
        },
        { method: 'phone-number' },
      );

      if (!created) {
        throw AppException.database('Failed to create user account');
      }

      await this.replacePersonas(created.id, personas);

      const session = await authContext.internalAdapter.createSession(
        created.id,
      );
      if (!session) {
        throw AppException.database('Failed to create session after signup');
      }

      const createdUser = created as typeof created & {
        phoneNumber?: string | null;
        phoneNumberVerified?: boolean | null;
      };

      return {
        user: {
          id: createdUser.id,
          email: createdUser.email,
          name: createdUser.name,
          phoneNumber: createdUser.phoneNumber ?? phoneNumber,
          phoneNumberVerified: createdUser.phoneNumberVerified ?? true,
          emailVerified: createdUser.emailVerified,
          personas,
        },
        token: session.token,
        expiresAt: session.expiresAt,
      };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.error(
        `signUpWithPhoneOtp failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw AppException.database('Signup failed', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getProfile(userId: string) {
    try {
      const account = await this.db.query.user.findFirst({
        where: eq(userTable.id, userId),
      });
      if (!account) {
        throw AppException.notFound('User not found');
      }

      const personas = await this.listPersonasForUser(userId);
      const orgMemberships = await this.listMembershipsForUser(userId);

      return {
        user: {
          id: account.id,
          email: account.email,
          name: account.name,
          phoneNumber: account.phoneNumber,
          phoneNumberVerified: account.phoneNumberVerified,
          emailVerified: account.emailVerified,
          preferredLocale: account.preferredLocale,
          personas,
        },
        organisations: orgMemberships,
      };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to load profile', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listPersonasForUser(userId: string): Promise<Persona[]> {
    try {
      const rows = await this.db.query.userPersonas.findMany({
        where: eq(userPersonas.userId, userId),
      });
      return rows.map((row) => row.persona);
    } catch (error) {
      throw AppException.database('Failed to list personas', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async setPersonas(userId: string, personas: Persona[]) {
    const next = this.normalizePersonas(personas);
    try {
      await this.replacePersonas(userId, next);
      return { personas: next };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to update personas', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Optional: create an organisation. Never called automatically at signup.
   */
  async createOrganisation(input: {
    name: string;
    slug: string;
    ownerUserId: string;
  }) {
    try {
      const existing = await this.db.query.organisations.findFirst({
        where: eq(organisations.slug, input.slug),
      });
      if (existing) {
        throw AppException.conflict(
          `Organisation slug ${input.slug} already exists`,
        );
      }

      const organisationId = createId();

      await this.db.transaction(async (tx) => {
        await tx.insert(organisations).values({
          id: organisationId,
          name: input.name,
          slug: input.slug,
        });
        await tx.insert(memberships).values({
          id: createId(),
          organisationId,
          userId: input.ownerUserId,
          role: OrganisationRole.OWNER,
        });
      });

      return this.getOrganisation(organisationId);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.error(
        `createOrganisation failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw AppException.database('Failed to create organisation', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async updatePreferredLocale(userId: string, input: UpdatePreferredLocaleDto) {
    try {
      await this.db
        .update(userTable)
        .set({ preferredLocale: input.preferredLocale })
        .where(eq(userTable.id, userId));
      return this.getProfile(userId);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to update preferred locale', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async uploadOrgDocument(
    organisationId: string,
    userId: string,
    input: UploadOrgDocumentDto,
    file: UploadedFileLike | undefined,
  ) {
    const uploaded = assertUploadedFile(file, {
      field: 'document',
      maxBytes: KYC_DOCUMENT_MAX_BYTES,
      allowedMimeTypes: KYC_DOCUMENT_ALLOWED_MIME_TYPES,
    });

    await this.assertMembership(organisationId, userId);
    const objectKey = `${organisationId}/${input.documentType.toLowerCase()}-${createId()}`;

    const contentType = uploaded.mimetype.trim().toLowerCase();
    await this.storage.putObject({
      bucket: StorageBucket.ORGANISATIONS,
      key: objectKey,
      body: uploaded.buffer,
      contentType,
    });

    const patch =
      input.documentType === OrgDocumentType.LICENCE
        ? {
            licenceDocumentUrl: objectKey,
            licenceVerifiedAt: null,
          }
        : { nuiDocumentUrl: objectKey };

    await this.db
      .update(organisations)
      .set(patch)
      .where(eq(organisations.id, organisationId));

    return this.getOrganisation(organisationId);
  }

  async adminVerifyOrgLicence(organisationId: string, adminUserId: string) {
    await this.assertPlatformAdmin(adminUserId);
    const organisation = await this.db.query.organisations.findFirst({
      where: eq(organisations.id, organisationId),
    });
    if (!organisation) {
      throw AppException.notFound(`Organisation ${organisationId} not found`);
    }
    if (!organisation.licenceDocumentUrl) {
      throw AppException.badRequest(
        'Organisation has no licence document on file',
      );
    }

    await this.db
      .update(organisations)
      .set({ licenceVerifiedAt: new Date() })
      .where(eq(organisations.id, organisationId));

    return this.getOrganisation(organisationId);
  }

  async getOrganisation(id: string) {
    try {
      const organisation = await this.db.query.organisations.findFirst({
        where: eq(organisations.id, id),
      });
      if (!organisation) {
        throw AppException.notFound(`Organisation ${id} not found`);
      }
      return this.withOrganisationDocumentUrls(organisation);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to load organisation', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listMembershipsForUser(userId: string) {
    try {
      return await this.db.query.memberships.findMany({
        where: eq(memberships.userId, userId),
      });
    } catch (error) {
      throw AppException.database('Failed to list memberships', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async assertMembership(organisationId: string, userId: string) {
    try {
      const membership = await this.db.query.memberships.findFirst({
        where: and(
          eq(memberships.organisationId, organisationId),
          eq(memberships.userId, userId),
        ),
      });
      if (!membership) {
        throw AppException.notFound('Membership not found for organisation');
      }
      return membership;
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to assert membership', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async createInvite(input: {
    organisationId: string;
    invitedByUserId: string;
    email: string;
    role: OrganisationRole;
  }) {
    const email = input.email.trim().toLowerCase();
    if (!INVITABLE_ROLES.includes(input.role)) {
      throw AppException.badRequest(
        `Role ${input.role} cannot be assigned via invite`,
      );
    }

    try {
      const actor = await this.assertMembership(
        input.organisationId,
        input.invitedByUserId,
      );
      if (!canManageInvites(actor.role)) {
        throw AppException.forbidden(
          'Only organisation owners and admins can invite members',
        );
      }

      const organisation = await this.getOrganisation(input.organisationId);

      const existingUser = await this.db.query.user.findFirst({
        where: eq(userTable.email, email),
      });
      if (existingUser) {
        const alreadyMember = await this.db.query.memberships.findFirst({
          where: and(
            eq(memberships.organisationId, input.organisationId),
            eq(memberships.userId, existingUser.id),
          ),
        });
        if (alreadyMember) {
          throw AppException.conflict(
            'This user is already a member of the organisation',
          );
        }
      }

      const pending = await this.db.query.organisationInvites.findFirst({
        where: and(
          eq(organisationInvites.organisationId, input.organisationId),
          eq(organisationInvites.email, email),
          eq(organisationInvites.status, InviteStatus.PENDING),
        ),
      });
      if (pending) {
        throw AppException.conflict(
          'A pending invite already exists for this email',
        );
      }

      const inviteId = createId();
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

      await this.db.insert(organisationInvites).values({
        id: inviteId,
        organisationId: input.organisationId,
        email,
        role: input.role,
        token,
        status: InviteStatus.PENDING,
        invitedByUserId: input.invitedByUserId,
        expiresAt,
      });

      const acceptUrl = `${this.config.appUrl}/invites/accept?token=${token}`;
      await this.emailProducer.enqueue({
        to: email,
        subject: `Join ${organisation.name} on ${this.config.appName}`,
        text: [
          `You have been invited to join ${organisation.name} as ${input.role}.`,
          `Accept the invite: ${acceptUrl}`,
          `This invite expires on ${expiresAt.toISOString()}.`,
        ].join('\n\n'),
        html: `<p>You have been invited to join <strong>${organisation.name}</strong> as <strong>${input.role}</strong>.</p><p><a href="${acceptUrl}">Accept invite</a></p><p>This invite expires on ${expiresAt.toISOString()}.</p>`,
      });

      return this.getInvite(inviteId);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.error(
        `createInvite failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw AppException.database('Failed to create invite', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listInvites(organisationId: string, requesterUserId: string) {
    try {
      const actor = await this.assertMembership(
        organisationId,
        requesterUserId,
      );
      if (!canManageInvites(actor.role)) {
        throw AppException.forbidden(
          'Only organisation owners and admins can list invites',
        );
      }

      return await this.db.query.organisationInvites.findMany({
        where: eq(organisationInvites.organisationId, organisationId),
      });
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to list invites', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async revokeInvite(input: { inviteId: string; requesterUserId: string }) {
    try {
      const invite = await this.getInvite(input.inviteId);
      const actor = await this.assertMembership(
        invite.organisationId,
        input.requesterUserId,
      );
      if (!canManageInvites(actor.role)) {
        throw AppException.forbidden(
          'Only organisation owners and admins can revoke invites',
        );
      }
      if (invite.status !== InviteStatus.PENDING) {
        throw AppException.badRequest('Only pending invites can be revoked');
      }

      await this.db
        .update(organisationInvites)
        .set({ status: InviteStatus.REVOKED })
        .where(eq(organisationInvites.id, invite.id));

      return this.getInvite(invite.id);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to revoke invite', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async acceptInvite(input: { token: string; userId: string }) {
    try {
      const account = await this.db.query.user.findFirst({
        where: eq(userTable.id, input.userId),
      });
      if (!account) {
        throw AppException.notFound('User not found');
      }

      const invite = await this.db.query.organisationInvites.findFirst({
        where: eq(organisationInvites.token, input.token),
      });
      if (!invite) {
        throw AppException.notFound('Invite not found');
      }
      if (invite.status !== InviteStatus.PENDING) {
        throw AppException.badRequest('Invite is no longer pending');
      }
      if (invite.expiresAt.getTime() < Date.now()) {
        await this.db
          .update(organisationInvites)
          .set({ status: InviteStatus.EXPIRED })
          .where(eq(organisationInvites.id, invite.id));
        throw AppException.badRequest('Invite has expired');
      }
      if (account.email.toLowerCase() !== invite.email.toLowerCase()) {
        throw AppException.forbidden(
          'Signed-in account email does not match the invite',
        );
      }

      const alreadyMember = await this.db.query.memberships.findFirst({
        where: and(
          eq(memberships.organisationId, invite.organisationId),
          eq(memberships.userId, input.userId),
        ),
      });
      if (alreadyMember) {
        throw AppException.conflict(
          'You are already a member of this organisation',
        );
      }

      await this.db.transaction(async (tx) => {
        await tx.insert(memberships).values({
          id: createId(),
          organisationId: invite.organisationId,
          userId: input.userId,
          role: invite.role,
        });
        await tx
          .update(organisationInvites)
          .set({ status: InviteStatus.ACCEPTED })
          .where(eq(organisationInvites.id, invite.id));
      });

      return {
        organisationId: invite.organisationId,
        role: invite.role,
        membership: await this.assertMembership(
          invite.organisationId,
          input.userId,
        ),
      };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to accept invite', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getInvite(id: string) {
    try {
      const invite = await this.db.query.organisationInvites.findFirst({
        where: eq(organisationInvites.id, id),
      });
      if (!invite) {
        throw AppException.notFound(`Invite ${id} not found`);
      }
      return {
        id: invite.id,
        organisationId: invite.organisationId,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        invitedByUserId: invite.invitedByUserId,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
        updatedAt: invite.updatedAt,
      };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to load invite', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async withOrganisationDocumentUrls(
    organisation: typeof organisations.$inferSelect,
  ) {
    const { licenceDocumentUrl, nuiDocumentUrl, ...rest } = organisation;
    return {
      ...rest,
      licenceDocumentUrl: licenceDocumentUrl
        ? await this.storage.getSignedUrl({
            bucket: StorageBucket.ORGANISATIONS,
            key: licenceDocumentUrl,
            expiresInSeconds: ORG_DOCUMENT_SIGNED_URL_TTL_SECONDS,
          })
        : null,
      nuiDocumentUrl: nuiDocumentUrl
        ? await this.storage.getSignedUrl({
            bucket: StorageBucket.ORGANISATIONS,
            key: nuiDocumentUrl,
            expiresInSeconds: ORG_DOCUMENT_SIGNED_URL_TTL_SECONDS,
          })
        : null,
    };
  }

  private normalizePersonas(personas: Persona[]): Persona[] {
    const unique = [...new Set(personas)];
    if (unique.length === 0) {
      throw AppException.badRequest('At least one persona is required');
    }
    return unique;
  }

  private async replacePersonas(
    userId: string,
    personas: Persona[],
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(userPersonas).where(eq(userPersonas.userId, userId));
      await tx.insert(userPersonas).values(
        personas.map((persona) => ({
          id: createId(),
          userId,
          persona,
        })),
      );
    });
  }
}
