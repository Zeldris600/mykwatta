import { Inject, Injectable, Logger } from '@nestjs/common';
import { count, eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { user as userTable } from '@mykwatta/core/database/schema/auth.schema';
import { listingInquiries } from '@mykwatta/core/database/schema/inquiries.schema';
import { listings } from '@mykwatta/core/database/schema/listings.schema';
import { ApiConfigService } from '@mykwatta/core/config';
import { TwilioMode } from '@mykwatta/core/config/env.validation';
import { InquiryStatus } from '@mykwatta/modules/listings/constants';
import { TwilioService } from '@mykwatta/shared/twilio';

@Injectable()
export class LeadDigestService {
  private readonly logger = new Logger(LeadDigestService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly twilio: TwilioService,
    private readonly config: ApiConfigService,
  ) {}

  async runDailyDigest(): Promise<void> {
    const rows = await this.db
      .select({
        ownerUserId: listings.ownerUserId,
        openCount: count(),
      })
      .from(listingInquiries)
      .innerJoin(listings, eq(listingInquiries.listingId, listings.id))
      .where(eq(listingInquiries.status, InquiryStatus.OPEN))
      .groupBy(listings.ownerUserId);

    if (rows.length === 0) {
      this.logger.log('Lead digest: no owners with open inquiries');
      return;
    }

    const ownerIds = rows.map((row) => row.ownerUserId);
    const owners = await this.db.query.user.findMany({
      where: inArray(userTable.id, ownerIds),
      columns: { id: true, phoneNumber: true, name: true },
    });
    const ownerById = new Map(owners.map((row) => [row.id, row]));
    const inboxUrl = `${this.config.whatsappContinueBaseUrl}/inquiries/inbox`;

    for (const row of rows) {
      const owner = ownerById.get(row.ownerUserId);
      const openCount = Number(row.openCount);
      if (!owner?.phoneNumber?.trim() || openCount < 1) {
        continue;
      }

      const body = [
        `MYKWATTA: You have ${openCount} open listing inquiry${openCount === 1 ? '' : 'ies'}.`,
        `Review: ${inboxUrl}`,
      ].join('\n');

      if (this.config.twilioMode === TwilioMode.Console) {
        this.logger.log(
          `[console lead digest] to=${owner.phoneNumber} body=${body}`,
        );
        continue;
      }

      try {
        await this.twilio.sendWhatsappMessage(owner.phoneNumber, body);
      } catch (error) {
        this.logger.warn(
          `Lead digest WhatsApp failed for owner ${owner.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}
