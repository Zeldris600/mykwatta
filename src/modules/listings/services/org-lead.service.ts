import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { listingInquiries } from '@mykwatta/core/database/schema/inquiries.schema';
import { listings } from '@mykwatta/core/database/schema/listings.schema';
import { OrganisationRole } from '@mykwatta/modules/identity/constants';
import { IdentityService } from '@mykwatta/modules/identity/services';
import {
  InquiryStatus,
  leadSlaDueAt,
} from '@mykwatta/modules/listings/constants';
import type { AssignLeadDto } from '@mykwatta/modules/listings/dto';
import { InquiriesService } from '@mykwatta/modules/listings/services/inquiries.service';

const LEAD_MANAGER_ROLES: readonly OrganisationRole[] = [
  OrganisationRole.OWNER,
  OrganisationRole.ADMIN,
  OrganisationRole.PROPERTY_MANAGER,
];

@Injectable()
export class OrgLeadService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly identity: IdentityService,
    private readonly inquiries: InquiriesService,
  ) {}

  async listOrgInbox(
    organisationId: string,
    userId: string,
    unassigned?: boolean,
  ) {
    await this.assertLeadManager(organisationId, userId);
    const orgListings = await this.db.query.listings.findMany({
      where: eq(listings.organisationId, organisationId),
      columns: { id: true },
    });
    const listingIds = orgListings.map((row) => row.id);
    if (listingIds.length === 0) {
      return [];
    }

    const filters = [inArray(listingInquiries.listingId, listingIds)];
    if (unassigned) {
      filters.push(eq(listingInquiries.status, InquiryStatus.OPEN));
      filters.push(isNull(listingInquiries.assigneeUserId));
    }

    return this.db.query.listingInquiries.findMany({
      where: and(...filters),
      orderBy: [desc(listingInquiries.createdAt)],
    });
  }

  async assign(
    organisationId: string,
    inquiryId: string,
    actorUserId: string,
    input: AssignLeadDto,
  ) {
    await this.assertLeadManager(organisationId, actorUserId);
    const inquiry = await this.inquiries.getById(inquiryId);
    const listing = await this.db.query.listings.findFirst({
      where: eq(listings.id, inquiry.listingId),
      columns: { id: true, organisationId: true },
    });
    if (!listing || listing.organisationId !== organisationId) {
      throw AppException.forbidden('Inquiry is not part of this organisation');
    }

    await this.identity.assertMembership(organisationId, input.assigneeUserId);

    const now = new Date();
    await this.db
      .update(listingInquiries)
      .set({
        assigneeUserId: input.assigneeUserId,
        assignedAt: now,
        ...(inquiry.slaDueAt ? {} : { slaDueAt: leadSlaDueAt(now) }),
      })
      .where(eq(listingInquiries.id, inquiryId));

    return this.inquiries.getById(inquiryId);
  }

  private async assertLeadManager(organisationId: string, userId: string) {
    const membership = await this.identity.assertMembership(
      organisationId,
      userId,
    );
    if (!LEAD_MANAGER_ROLES.includes(membership.role)) {
      throw AppException.forbidden(
        'Your organisation role cannot manage leads',
      );
    }
    return membership;
  }
}
