import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { listings } from '@mykwatta/core/database/schema/listings.schema';
import { IdentityService } from '@mykwatta/modules/identity/services';
import type {
  AdminListingTrustDto,
  AdminListingVerificationDto,
  AdminMarkDuplicateDto,
} from '@mykwatta/modules/listings/dto';
import { ListingsService } from '@mykwatta/modules/listings/services/listings.service';

@Injectable()
export class ListingsAdminService {
  private readonly logger = new Logger(ListingsAdminService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly listingsService: ListingsService,
    private readonly identity: IdentityService,
  ) {}

  async setTrust(
    listingId: string,
    adminUserId: string,
    input: AdminListingTrustDto,
  ) {
    await this.identity.assertPlatformAdmin(adminUserId);
    await this.listingsService.getById(listingId);

    if (input.freeze) {
      await this.db
        .update(listings)
        .set({
          trustFrozenAt: new Date(),
          trustFrozenReason: input.reason?.trim() || 'Frozen by platform admin',
        })
        .where(eq(listings.id, listingId));
    } else {
      await this.db
        .update(listings)
        .set({
          trustFrozenAt: null,
          trustFrozenReason: null,
        })
        .where(eq(listings.id, listingId));
    }

    return this.listingsService.getById(listingId);
  }

  async setVerification(
    listingId: string,
    adminUserId: string,
    input: AdminListingVerificationDto,
  ) {
    await this.identity.assertPlatformAdmin(adminUserId);
    await this.listingsService.getById(listingId);

    await this.db
      .update(listings)
      .set({ verificationStatus: input.status })
      .where(eq(listings.id, listingId));

    if (input.note?.trim()) {
      this.logger.log(
        `Listing ${listingId} verification → ${input.status}: ${input.note.trim()}`,
      );
    }

    return this.listingsService.getById(listingId);
  }

  async markDuplicate(
    listingId: string,
    adminUserId: string,
    input: AdminMarkDuplicateDto,
  ) {
    await this.identity.assertPlatformAdmin(adminUserId);
    if (listingId === input.duplicateOfListingId) {
      throw AppException.badRequest('A listing cannot duplicate itself');
    }

    await this.listingsService.getById(listingId);
    await this.listingsService.getById(input.duplicateOfListingId);

    await this.db
      .update(listings)
      .set({ duplicateOfListingId: input.duplicateOfListingId })
      .where(eq(listings.id, listingId));

    return this.listingsService.getById(listingId);
  }
}
