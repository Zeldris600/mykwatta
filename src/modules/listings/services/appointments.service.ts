import { Inject, Injectable, Logger } from '@nestjs/common';
import { desc, eq, inArray } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { ApiConfigService } from '@mykwatta/core/config';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { listingAppointments } from '@mykwatta/core/database/schema/appointments.schema';
import { user as userTable } from '@mykwatta/core/database/schema/auth.schema';
import { listingInquiries } from '@mykwatta/core/database/schema/inquiries.schema';
import { listings } from '@mykwatta/core/database/schema/listings.schema';
import {
  AppointmentModality,
  AppointmentStatus,
  InquiryStatus,
  ListingStatus,
} from '@mykwatta/modules/listings/constants';
import type {
  DeclineAppointmentDto,
  ScheduleAppointmentDto,
} from '@mykwatta/modules/listings/dto';
import { InquiriesService } from '@mykwatta/modules/listings/services/inquiries.service';
import { ListingsService } from '@mykwatta/modules/listings/services/listings.service';
import { buildWhatsappContinueUrl } from '@mykwatta/shared/twilio/whatsapp-url.util';
import {
  NotificationEntityType,
  NotificationType,
  NotificationsService,
} from '@mykwatta/modules/notifications';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly listingsService: ListingsService,
    private readonly inquiriesService: InquiriesService,
    private readonly config: ApiConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  async scheduleFromInquiry(
    inquiryId: string,
    userId: string,
    input: ScheduleAppointmentDto,
  ) {
    try {
      const inquiry = await this.inquiriesService.assertParticipant(
        inquiryId,
        userId,
      );

      if (inquiry.status === InquiryStatus.CLOSED) {
        throw AppException.badRequest(
          'Cannot schedule a viewing on a closed inquiry',
        );
      }

      const listing = await this.listingsService.getById(inquiry.listingId);
      if (listing.status !== ListingStatus.PUBLISHED) {
        throw AppException.badRequest(
          'Viewings can only be scheduled on published listings',
        );
      }

      this.assertFutureSlot(input.scheduledAt);

      const modality = input.modality ?? AppointmentModality.IN_PERSON;
      const meetingUrl = input.meetingUrl?.trim() || null;
      if (modality === AppointmentModality.VIRTUAL && !meetingUrl) {
        throw AppException.badRequest('Virtual viewings require a meeting URL');
      }

      const id = createId();
      await this.db.insert(listingAppointments).values({
        id,
        listingId: inquiry.listingId,
        inquiryId: inquiry.id,
        requesterUserId: inquiry.inquirerUserId,
        status: AppointmentStatus.REQUESTED,
        scheduledAt: input.scheduledAt,
        durationMinutes: input.durationMinutes ?? 30,
        modality,
        meetingUrl,
        locationNote: input.locationNote?.trim() || null,
        notes: input.notes?.trim() || null,
      });

      if (inquiry.status === InquiryStatus.OPEN) {
        const now = new Date();
        await this.db
          .update(listingInquiries)
          .set({
            status: InquiryStatus.RESPONDED,
            respondedAt: inquiry.respondedAt ?? now,
            firstRespondedAt: inquiry.firstRespondedAt ?? now,
          })
          .where(eq(listingInquiries.id, inquiry.id));
      }

      await this.notifySchedule(
        listing,
        inquiry.inquirerUserId,
        input,
        id,
        inquiry.id,
      );

      const owner = await this.db.query.user.findFirst({
        where: eq(userTable.id, listing.ownerUserId),
      });
      const appointment = await this.getById(id);
      const whatsappContinueUrl = buildWhatsappContinueUrl(
        owner?.phoneNumber,
        listing.title,
        listing.id,
        this.config.whatsappContinueBaseUrl,
      );

      return { ...appointment, whatsappContinueUrl };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.error(
        `schedule appointment failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw AppException.database('Failed to schedule viewing appointment', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listForListing(listingId: string, userId: string) {
    try {
      await this.listingsService.assertUserCanManage(listingId, userId);
      return await this.db.query.listingAppointments.findMany({
        where: eq(listingAppointments.listingId, listingId),
        orderBy: [desc(listingAppointments.scheduledAt)],
      });
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to list listing appointments', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listMine(userId: string) {
    try {
      const owned = await this.db.query.listings.findMany({
        where: eq(listings.ownerUserId, userId),
        columns: { id: true },
      });
      const ownedIds = owned.map((row) => row.id);

      const asRequester = await this.db.query.listingAppointments.findMany({
        where: eq(listingAppointments.requesterUserId, userId),
        orderBy: [desc(listingAppointments.scheduledAt)],
      });
      const asOwner =
        ownedIds.length === 0
          ? []
          : await this.db.query.listingAppointments.findMany({
              where: inArray(listingAppointments.listingId, ownedIds),
              orderBy: [desc(listingAppointments.scheduledAt)],
            });

      const byId = new Map<string, (typeof asRequester)[number]>();
      for (const row of [...asRequester, ...asOwner]) {
        byId.set(row.id, row);
      }
      return [...byId.values()].sort(
        (a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime(),
      );
    } catch (error) {
      throw AppException.database('Failed to list my appointments', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async confirm(appointmentId: string, userId: string) {
    try {
      const appointment = await this.getById(appointmentId);
      await this.listingsService.assertUserCanManage(
        appointment.listingId,
        userId,
      );

      if (appointment.status !== AppointmentStatus.REQUESTED) {
        throw AppException.badRequest(
          'Only REQUESTED appointments can be confirmed',
        );
      }

      await this.db
        .update(listingAppointments)
        .set({
          status: AppointmentStatus.CONFIRMED,
          confirmedAt: new Date(),
        })
        .where(eq(listingAppointments.id, appointmentId));

      await this.notifyRequester(
        appointment,
        NotificationType.APPOINTMENT_CONFIRMED,
        'Viewing confirmed',
        'Your viewing appointment was confirmed.',
      );

      return this.getById(appointmentId);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to confirm appointment', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async decline(
    appointmentId: string,
    userId: string,
    input: DeclineAppointmentDto,
  ) {
    try {
      const appointment = await this.getById(appointmentId);
      await this.listingsService.assertUserCanManage(
        appointment.listingId,
        userId,
      );

      if (appointment.status !== AppointmentStatus.REQUESTED) {
        throw AppException.badRequest(
          'Only REQUESTED appointments can be declined',
        );
      }

      await this.db
        .update(listingAppointments)
        .set({
          status: AppointmentStatus.DECLINED,
          declineReason: input.reason.trim(),
        })
        .where(eq(listingAppointments.id, appointmentId));

      await this.notifyRequester(
        appointment,
        NotificationType.APPOINTMENT_DECLINED,
        'Viewing declined',
        `Your viewing request was declined: ${input.reason.trim()}`,
      );

      return this.getById(appointmentId);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to decline appointment', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async cancel(appointmentId: string, userId: string) {
    try {
      const appointment = await this.getById(appointmentId);
      const isRequester = appointment.requesterUserId === userId;
      if (!isRequester) {
        await this.listingsService.assertUserCanManage(
          appointment.listingId,
          userId,
        );
      }

      if (
        appointment.status === AppointmentStatus.CANCELLED ||
        appointment.status === AppointmentStatus.COMPLETED ||
        appointment.status === AppointmentStatus.DECLINED
      ) {
        throw AppException.badRequest(
          `Cannot cancel an appointment in ${appointment.status} status`,
        );
      }

      await this.db
        .update(listingAppointments)
        .set({
          status: AppointmentStatus.CANCELLED,
          cancelledAt: new Date(),
        })
        .where(eq(listingAppointments.id, appointmentId));

      const listing = await this.listingsService.getById(appointment.listingId);
      const notifyUserId = isRequester
        ? listing.ownerUserId
        : appointment.requesterUserId;
      this.notifications.notify({
        userId: notifyUserId,
        type: NotificationType.APPOINTMENT_CANCELLED,
        title: 'Viewing cancelled',
        body: `A viewing for "${listing.title}" was cancelled.`,
        entityType: NotificationEntityType.APPOINTMENT,
        entityId: appointmentId,
        resources: {
          listingId: listing.id,
          listingTitle: listing.title,
          appointmentId,
          inquiryId: appointment.inquiryId ?? undefined,
          actorUserId: userId,
        },
      });

      return this.getById(appointmentId);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to cancel appointment', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async complete(appointmentId: string, userId: string) {
    try {
      const appointment = await this.getById(appointmentId);
      await this.listingsService.assertUserCanManage(
        appointment.listingId,
        userId,
      );

      if (appointment.status !== AppointmentStatus.CONFIRMED) {
        throw AppException.badRequest(
          'Only CONFIRMED appointments can be completed',
        );
      }

      await this.db
        .update(listingAppointments)
        .set({
          status: AppointmentStatus.COMPLETED,
          completedAt: new Date(),
        })
        .where(eq(listingAppointments.id, appointmentId));

      return this.getById(appointmentId);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to complete appointment', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async getById(id: string) {
    const appointment = await this.db.query.listingAppointments.findFirst({
      where: eq(listingAppointments.id, id),
    });
    if (!appointment) {
      throw AppException.notFound(`Appointment ${id} not found`);
    }
    return appointment;
  }

  private assertFutureSlot(scheduledAt: Date): void {
    if (!(scheduledAt instanceof Date) || Number.isNaN(scheduledAt.getTime())) {
      throw AppException.badRequest('scheduledAt must be a valid date');
    }
    if (scheduledAt.getTime() < Date.now() + 15 * 60 * 1000) {
      throw AppException.badRequest(
        'Viewings must be scheduled at least 15 minutes from now',
      );
    }
  }

  private async notifySchedule(
    listing: { id: string; title: string; ownerUserId: string },
    requesterUserId: string,
    input: ScheduleAppointmentDto,
    appointmentId: string,
    inquiryId: string,
  ): Promise<void> {
    const [requester, owner] = await Promise.all([
      this.db.query.user.findFirst({
        where: eq(userTable.id, requesterUserId),
      }),
      this.db.query.user.findFirst({
        where: eq(userTable.id, listing.ownerUserId),
      }),
    ]);
    const when = input.scheduledAt.toISOString();
    const who = requester?.name ?? 'A user';
    const url = `${this.config.appUrl}/appointments`;

    this.notifications.notify({
      userId: listing.ownerUserId,
      type: NotificationType.APPOINTMENT_REQUESTED,
      title: 'Viewing requested',
      body: `${who} requested a viewing for "${listing.title}" on ${when}.`,
      entityType: NotificationEntityType.APPOINTMENT,
      entityId: appointmentId,
      resources: {
        listingId: listing.id,
        listingTitle: listing.title,
        appointmentId,
        inquiryId,
        actorUserId: requesterUserId,
        actorName: who,
      },
      email: owner?.email
        ? {
            to: owner.email,
            subject: `Viewing requested for "${listing.title}"`,
            text: `${who} requested a viewing on ${when}.\n\n${url}`,
            html: `<p><strong>${who}</strong> requested a viewing for <strong>${listing.title}</strong> at <strong>${when}</strong>.</p><p><a href="${url}">Manage appointments</a></p>`,
          }
        : undefined,
    });
  }

  private async notifyRequester(
    appointment: {
      id: string;
      requesterUserId: string;
      listingId: string;
      scheduledAt: Date;
    },
    type: NotificationType,
    subject: string,
    body: string,
  ): Promise<void> {
    const listing = await this.listingsService.getById(appointment.listingId);
    const requester = await this.db.query.user.findFirst({
      where: eq(userTable.id, appointment.requesterUserId),
    });
    const url = `${this.config.appUrl}/appointments`;

    this.notifications.notify({
      userId: appointment.requesterUserId,
      type,
      title: subject,
      body: `${body} (${listing.title})`,
      entityType: NotificationEntityType.APPOINTMENT,
      entityId: appointment.id,
      resources: {
        listingId: listing.id,
        listingTitle: listing.title,
        appointmentId: appointment.id,
        actorUserId: listing.ownerUserId,
      },
      email: requester?.email
        ? {
            to: requester.email,
            subject: `${subject}: ${listing.title}`,
            text: `${body}\n\nListing: ${listing.title}\nWhen: ${appointment.scheduledAt.toISOString()}\n${url}`,
            html: `<p>${body}</p><p><strong>${listing.title}</strong> · ${appointment.scheduledAt.toISOString()}</p><p><a href="${url}">View appointments</a></p>`,
          }
        : undefined,
    });
  }
}
