import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import {
  vendorLeads,
  vendors,
} from '@mykwatta/core/database/schema/vendors.schema';
import { IdentityService } from '@mykwatta/modules/identity/services';
import type {
  CreateVendorDto,
  RequestVendorLeadDto,
} from '@mykwatta/modules/vendors/dto';
import {
  VendorCategory,
  VendorLeadStatus,
} from '@mykwatta/modules/vendors/constants';
import {
  NotificationEntityType,
  NotificationType,
  NotificationsService,
} from '@mykwatta/modules/notifications';

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly identity: IdentityService,
    private readonly notifications: NotificationsService,
  ) {}

  async createVendor(adminUserId: string, input: CreateVendorDto) {
    await this.identity.assertPlatformAdmin(adminUserId);
    const id = createId();
    await this.db.insert(vendors).values({
      id,
      name: input.name.trim(),
      category: input.category,
      city: input.city.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || null,
      description: input.description?.trim() || null,
      active: input.active ?? true,
    });
    return this.getVendor(id);
  }

  async listVendors(city?: string, category?: VendorCategory) {
    const filters = [eq(vendors.active, true)];
    if (city?.trim()) {
      filters.push(eq(vendors.city, city.trim()));
    }
    if (category) {
      filters.push(eq(vendors.category, category));
    }
    return this.db.query.vendors.findMany({
      where: and(...filters),
      orderBy: [desc(vendors.createdAt)],
    });
  }

  async getVendor(vendorId: string) {
    const vendor = await this.db.query.vendors.findFirst({
      where: eq(vendors.id, vendorId),
    });
    if (!vendor) {
      throw AppException.notFound(`Vendor ${vendorId} not found`);
    }
    return vendor;
  }

  async requestLead(
    vendorId: string,
    requesterUserId: string,
    input: RequestVendorLeadDto,
  ) {
    await this.getVendor(vendorId);
    const id = createId();
    await this.db.insert(vendorLeads).values({
      id,
      vendorId,
      requesterUserId,
      listingId: input.listingId ?? null,
      maintenanceTicketId: input.maintenanceTicketId ?? null,
      status: VendorLeadStatus.REQUESTED,
    });
    return this.getLead(id, requesterUserId);
  }

  async sendLead(leadId: string, requesterUserId: string, paymentId: string) {
    const lead = await this.requireLead(leadId);
    if (lead.requesterUserId !== requesterUserId) {
      throw AppException.forbidden('Not your vendor lead');
    }
    if (lead.status === VendorLeadStatus.SENT) {
      return lead;
    }

    const vendor = await this.getVendor(lead.vendorId);
    await this.db
      .update(vendorLeads)
      .set({
        status: VendorLeadStatus.SENT,
        paymentId,
        sentAt: new Date(),
      })
      .where(eq(vendorLeads.id, leadId));

    this.notifications.notify({
      userId: requesterUserId,
      type: NotificationType.VENDOR_LEAD_SENT,
      title: 'Vendor introduction sent',
      body: `We shared your request with ${vendor.name} (${vendor.phone}).`,
      entityType: NotificationEntityType.VENDOR_LEAD,
      entityId: leadId,
      resources: {
        vendorLeadId: leadId,
        listingId: lead.listingId ?? undefined,
        maintenanceTicketId: lead.maintenanceTicketId ?? undefined,
      },
    });

    this.logger.log(`Vendor lead ${leadId} sent for vendor ${vendor.id}`);
    return this.getLead(leadId, requesterUserId);
  }

  async listMyLeads(userId: string) {
    return this.db.query.vendorLeads.findMany({
      where: eq(vendorLeads.requesterUserId, userId),
      orderBy: [desc(vendorLeads.createdAt)],
    });
  }

  async countSentLeads(): Promise<number> {
    const rows = await this.db
      .select({ id: vendorLeads.id })
      .from(vendorLeads)
      .where(eq(vendorLeads.status, VendorLeadStatus.SENT));
    return rows.length;
  }

  private async getLead(leadId: string, userId: string) {
    const lead = await this.requireLead(leadId);
    if (lead.requesterUserId !== userId) {
      throw AppException.forbidden('Not your vendor lead');
    }
    return lead;
  }

  private async requireLead(leadId: string) {
    const lead = await this.db.query.vendorLeads.findFirst({
      where: eq(vendorLeads.id, leadId),
    });
    if (!lead) {
      throw AppException.notFound(`Vendor lead ${leadId} not found`);
    }
    return lead;
  }
}
