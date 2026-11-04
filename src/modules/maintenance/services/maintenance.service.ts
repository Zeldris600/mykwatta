import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, inArray, or } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { maintenanceTickets } from '@mykwatta/core/database/schema/maintenance.schema';
import { listings } from '@mykwatta/core/database/schema/listings.schema';
import type {
  AssignMaintenanceTicketDto,
  CreateMaintenanceTicketDto,
  UpdateMaintenanceTicketStatusDto,
} from '@mykwatta/modules/maintenance/dto';
import { MaintenanceTicketStatus } from '@mykwatta/modules/maintenance/constants';
import { ListingsService } from '@mykwatta/modules/listings/services';
import {
  NotificationEntityType,
  NotificationType,
  NotificationsService,
} from '@mykwatta/modules/notifications';

const OPEN_STATUSES: MaintenanceTicketStatus[] = [
  MaintenanceTicketStatus.OPEN,
  MaintenanceTicketStatus.ASSIGNED,
  MaintenanceTicketStatus.IN_PROGRESS,
];

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly listings: ListingsService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, input: CreateMaintenanceTicketDto) {
    const listing = await this.listings.getById(input.listingId);
    this.assertCanAccessListing(userId, listing.ownerUserId);

    const id = createId();
    await this.db.insert(maintenanceTickets).values({
      id,
      listingId: listing.id,
      createdByUserId: userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      status: MaintenanceTicketStatus.OPEN,
    });

    this.notifyListingStakeholders(listing.ownerUserId, userId, {
      type: NotificationType.MAINTENANCE_TICKET_CREATED,
      title: 'Maintenance ticket opened',
      body: `"${input.title.trim()}" was reported on "${listing.title}".`,
      ticketId: id,
      listingId: listing.id,
      listingTitle: listing.title,
    });

    return this.getById(id, userId);
  }

  async assign(
    ticketId: string,
    actorUserId: string,
    input: AssignMaintenanceTicketDto,
  ) {
    const ticket = await this.requireTicket(ticketId);
    const listing = await this.listings.getById(ticket.listingId);
    this.assertOwnerOrCreator(actorUserId, listing.ownerUserId, ticket);

    await this.db
      .update(maintenanceTickets)
      .set({
        assignedToUserId: input.assigneeUserId,
        status: MaintenanceTicketStatus.ASSIGNED,
      })
      .where(eq(maintenanceTickets.id, ticketId));

    this.notifications.notify({
      userId: input.assigneeUserId,
      type: NotificationType.MAINTENANCE_TICKET_ASSIGNED,
      title: 'Maintenance ticket assigned',
      body: `You were assigned "${ticket.title}" on "${listing.title}".`,
      entityType: NotificationEntityType.MAINTENANCE_TICKET,
      entityId: ticketId,
      resources: {
        maintenanceTicketId: ticketId,
        listingId: listing.id,
        listingTitle: listing.title,
        actorUserId,
      },
    });

    return this.getById(ticketId, actorUserId);
  }

  async updateStatus(
    ticketId: string,
    actorUserId: string,
    input: UpdateMaintenanceTicketStatusDto,
  ) {
    const ticket = await this.requireTicket(ticketId);
    const listing = await this.listings.getById(ticket.listingId);
    this.assertCanAccessListing(actorUserId, listing.ownerUserId, ticket);

    await this.db
      .update(maintenanceTickets)
      .set({ status: input.status })
      .where(eq(maintenanceTickets.id, ticketId));

    const recipients = new Set<string>([
      listing.ownerUserId,
      ticket.createdByUserId,
    ]);
    if (ticket.assignedToUserId) {
      recipients.add(ticket.assignedToUserId);
    }
    for (const userId of recipients) {
      if (userId === actorUserId) {
        continue;
      }
      this.notifications.notify({
        userId,
        type: NotificationType.MAINTENANCE_TICKET_STATUS_CHANGED,
        title: 'Maintenance ticket updated',
        body: `"${ticket.title}" is now ${input.status}.`,
        entityType: NotificationEntityType.MAINTENANCE_TICKET,
        entityId: ticketId,
        resources: {
          maintenanceTicketId: ticketId,
          listingId: listing.id,
          listingTitle: listing.title,
          actorUserId,
        },
      });
    }

    return this.getById(ticketId, actorUserId);
  }

  async listMine(userId: string) {
    const rows = await this.db.query.maintenanceTickets.findMany({
      where: or(
        eq(maintenanceTickets.createdByUserId, userId),
        eq(maintenanceTickets.assignedToUserId, userId),
      ),
      orderBy: [desc(maintenanceTickets.createdAt)],
    });
    return rows;
  }

  async listForListing(listingId: string, userId: string) {
    const listing = await this.listings.getById(listingId);
    this.assertCanAccessListing(userId, listing.ownerUserId);

    return this.db.query.maintenanceTickets.findMany({
      where: eq(maintenanceTickets.listingId, listingId),
      orderBy: [desc(maintenanceTickets.createdAt)],
    });
  }

  async getById(ticketId: string, userId: string) {
    const ticket = await this.requireTicket(ticketId);
    const listing = await this.listings.getById(ticket.listingId);
    this.assertCanAccessListing(userId, listing.ownerUserId, ticket);
    return ticket;
  }

  async countOpenForOwner(ownerUserId: string): Promise<number> {
    const rows = await this.db
      .select({ id: maintenanceTickets.id })
      .from(maintenanceTickets)
      .innerJoin(listings, eq(maintenanceTickets.listingId, listings.id))
      .where(
        and(
          eq(listings.ownerUserId, ownerUserId),
          inArray(maintenanceTickets.status, OPEN_STATUSES),
        ),
      );
    return rows.length;
  }

  private async requireTicket(ticketId: string) {
    const ticket = await this.db.query.maintenanceTickets.findFirst({
      where: eq(maintenanceTickets.id, ticketId),
    });
    if (!ticket) {
      throw AppException.notFound(`Maintenance ticket ${ticketId} not found`);
    }
    return ticket;
  }

  private assertCanAccessListing(
    userId: string,
    ownerUserId: string,
    ticket?: typeof maintenanceTickets.$inferSelect,
  ): void {
    if (userId === ownerUserId) {
      return;
    }
    if (
      ticket &&
      (ticket.createdByUserId === userId ||
        ticket.assignedToUserId === userId)
    ) {
      return;
    }
    throw AppException.forbidden('Not allowed on this maintenance ticket');
  }

  private assertOwnerOrCreator(
    userId: string,
    ownerUserId: string,
    ticket: typeof maintenanceTickets.$inferSelect,
  ): void {
    if (userId === ownerUserId || userId === ticket.createdByUserId) {
      return;
    }
    throw AppException.forbidden('Only the listing owner can assign tickets');
  }

  private notifyListingStakeholders(
    ownerUserId: string,
    actorUserId: string,
    input: {
      type: NotificationType;
      title: string;
      body: string;
      ticketId: string;
      listingId: string;
      listingTitle: string;
    },
  ): void {
    const targets = new Set<string>([ownerUserId]);
    if (actorUserId !== ownerUserId) {
      targets.add(actorUserId);
    }
    for (const userId of targets) {
      this.notifications.notify({
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        entityType: NotificationEntityType.MAINTENANCE_TICKET,
        entityId: input.ticketId,
        resources: {
          maintenanceTicketId: input.ticketId,
          listingId: input.listingId,
          listingTitle: input.listingTitle,
          actorUserId,
        },
      });
    }
  }
}
