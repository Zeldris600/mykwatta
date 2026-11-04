import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { listings } from '@mykwatta/core/database/schema/listings.schema';
import { IdentityService } from '@mykwatta/modules/identity/services';
import { ListingsService } from '@mykwatta/modules/listings/services';

@Injectable()
export class DocsVerificationAdminService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly identity: IdentityService,
    private readonly listingsService: ListingsService,
  ) {}

  async setDocumentsVerified(
    listingId: string,
    adminUserId: string,
    verified: boolean,
  ) {
    await this.identity.assertPlatformAdmin(adminUserId);
    await this.listingsService.getById(listingId);

    await this.db
      .update(listings)
      .set({ documentsVerifiedByMykwatta: verified })
      .where(eq(listings.id, listingId));

    return this.listingsService.getById(listingId);
  }
}
