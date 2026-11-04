import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, gte, inArray, isNotNull, isNull, lte } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { user } from '@mykwatta/core/database/schema/auth.schema';
import { listingApplications } from '@mykwatta/core/database/schema/applications.schema';
import { listingAppointments } from '@mykwatta/core/database/schema/appointments.schema';
import { listingDeals } from '@mykwatta/core/database/schema/deals.schema';
import { vendorLeads } from '@mykwatta/core/database/schema/vendors.schema';
import { escrowLedger } from '@mykwatta/core/database/schema/escrow.schema';
import { listingInquiries } from '@mykwatta/core/database/schema/inquiries.schema';
import { listings } from '@mykwatta/core/database/schema/listings.schema';
import {
  savedSearchMatches,
  savedSearches,
} from '@mykwatta/core/database/schema/saved-searches.schema';
import { listingTitleDocuments } from '@mykwatta/core/database/schema/title-documents.schema';
import { notifications } from '@mykwatta/core/database/schema/notifications.schema';
import { payments } from '@mykwatta/core/database/schema/payments.schema';
import { ACTIVE_APPLICATION_STATUSES } from '@mykwatta/modules/applications/constants';
import { DealStatus, DealType } from '@mykwatta/modules/deals/constants';
import { MaintenanceService } from '@mykwatta/modules/maintenance/services';
import { RentSchedulesService } from '@mykwatta/modules/rent-schedules/services';
import { computeOccupancyPercentForOwner } from '@mykwatta/modules/rent-schedules/helpers/occupancy.helper';
import { RentRemindersService } from '@mykwatta/modules/retention/services';
import { VendorLeadStatus } from '@mykwatta/modules/vendors/constants';
import { EscrowStatus } from '@mykwatta/modules/escrow/constants';
import { Persona } from '@mykwatta/modules/identity/constants';
import { IdentityService } from '@mykwatta/modules/identity/services';
import {
  AppointmentModality,
  AppointmentStatus,
  InquiryStatus,
  ListingStatus,
  TitleDocumentStatus,
} from '@mykwatta/modules/listings/constants';
import { PaymentStatus } from '@mykwatta/modules/payments/constants';

const LISTING_OWNER_PERSONAS: readonly Persona[] = [
  Persona.LANDLORD,
  Persona.AGENT,
  Persona.DEVELOPER,
  Persona.CARETAKER,
];

const SEEKER_PERSONAS: readonly Persona[] = [Persona.RENTER, Persona.BUYER];

export type PersonaStatsCounters = {
  listingsByStatus?: Partial<Record<ListingStatus, number>>;
  openInquiries?: number;
  upcomingAppointments?: number;
  applications?: number;
  activeDeals?: number;
  escrowHeld?: number;
  openTickets?: number;
  occupancyPercent?: number | null;
  rentDueThisWeekCount?: number;
  rentDueThisWeekMinor?: number;
  unassignedLeads?: number;
  slaBreaches?: number;
  premiumListings?: number;
  virtualAppointmentsUpcoming?: number;
};

export type MeStatsResult = {
  notificationsUnread: number;
  savedSearchCount: number;
  newMatchCount: number;
  titleDocsPending: number;
  byPersona: Partial<Record<Persona, PersonaStatsCounters>>;
};

export type DocsVerificationStatusSummary = {
  verified: number;
  unverified: number;
};

export type PlatformStatsResult = {
  users: number;
  listingsByStatus: Partial<Record<ListingStatus, number>>;
  openInquiries: number;
  upcomingAppointments: number;
  activeApplications: number;
  activeDeals: number;
  paymentsSucceeded: number;
  escrowHeld: number;
  notificationsTotal: number;
  renewalsDue30d: number;
  remindersSent7d: number;
  vendorLeadsSent: number;
  docsVerificationStatus: DocsVerificationStatusSummary;
  unassignedLeads: number;
  slaBreaches: number;
  premiumListings: number;
  virtualAppointmentsUpcoming: number;
};

@Injectable()
export class StatsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly identity: IdentityService,
    private readonly maintenance: MaintenanceService,
    private readonly rentSchedules: RentSchedulesService,
    private readonly rentReminders: RentRemindersService,
  ) {}

  async getMe(userId: string, personas: Persona[]): Promise<MeStatsResult> {
    try {
      const [notificationsUnread, phase2] = await Promise.all([
        this.countUnreadNotifications(userId),
        this.phase2MeCounters(userId),
      ]);
      const byPersona: Partial<Record<Persona, PersonaStatsCounters>> = {};

      for (const persona of personas) {
        if ((LISTING_OWNER_PERSONAS as readonly string[]).includes(persona)) {
          byPersona[persona] = await this.ownerPersonaCounters(userId);
        } else if ((SEEKER_PERSONAS as readonly string[]).includes(persona)) {
          byPersona[persona] = await this.seekerPersonaCounters(userId);
        }
      }

      return { notificationsUnread, ...phase2, byPersona };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to load user stats', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getPlatform(adminUserId: string): Promise<PlatformStatsResult> {
    await this.assertPlatformAdmin(adminUserId);
    try {
      const [
        users,
        listingsByStatus,
        openInquiries,
        upcomingAppointments,
        activeApplications,
        activeDeals,
        paymentsSucceeded,
        escrowHeld,
        notificationsTotal,
        renewalsDue30d,
        remindersSent7d,
        vendorLeadsSent,
        docsVerificationStatus,
        cameroonOps,
      ] = await Promise.all([
        this.scalarCount(this.db.select({ value: count() }).from(user)),
        this.listingStatusCounts(),
        this.scalarCount(
          this.db
            .select({ value: count() })
            .from(listingInquiries)
            .where(eq(listingInquiries.status, InquiryStatus.OPEN)),
        ),
        this.scalarCount(this.upcomingAppointmentsQuery()),
        this.scalarCount(
          this.db
            .select({ value: count() })
            .from(listingApplications)
            .where(
              inArray(listingApplications.status, [
                ...ACTIVE_APPLICATION_STATUSES,
              ]),
            ),
        ),
        this.scalarCount(
          this.db
            .select({ value: count() })
            .from(listingDeals)
            .where(eq(listingDeals.status, DealStatus.ACTIVE)),
        ),
        this.scalarCount(
          this.db
            .select({ value: count() })
            .from(payments)
            .where(eq(payments.status, PaymentStatus.SUCCEEDED)),
        ),
        this.scalarCount(
          this.db
            .select({ value: count() })
            .from(escrowLedger)
            .where(eq(escrowLedger.status, EscrowStatus.HELD)),
        ),
        this.scalarCount(
          this.db.select({ value: count() }).from(notifications),
        ),
        this.countRenewalsDueWithin30Days(),
        this.rentReminders.countRemindersSentLast7Days(),
        this.scalarCount(
          this.db
            .select({ value: count() })
            .from(vendorLeads)
            .where(eq(vendorLeads.status, VendorLeadStatus.SENT)),
        ),
        this.docsVerificationStatusSummary(),
        this.cameroonOpsStats(),
      ]);

      return {
        users,
        listingsByStatus,
        openInquiries,
        upcomingAppointments,
        activeApplications,
        activeDeals,
        paymentsSucceeded,
        escrowHeld,
        notificationsTotal,
        renewalsDue30d,
        remindersSent7d,
        vendorLeadsSent,
        docsVerificationStatus,
        ...cameroonOps,
      };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to load platform stats', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async ownerPersonaCounters(
    userId: string,
  ): Promise<PersonaStatsCounters> {
    const listingsByStatus = await this.listingStatusCountsForOwner(userId);
    const [
      openInquiries,
      upcomingAppointments,
      applications,
      activeDeals,
      escrowHeld,
      openTickets,
      occupancyPercent,
      rentDueThisWeek,
    ] = await Promise.all([
        this.scalarCount(
          this.db
            .select({ value: count() })
            .from(listingInquiries)
            .innerJoin(listings, eq(listingInquiries.listingId, listings.id))
            .where(
              and(
                eq(listings.ownerUserId, userId),
                eq(listingInquiries.status, InquiryStatus.OPEN),
              ),
            ),
        ),
        this.scalarCount(
          this.db
            .select({ value: count() })
            .from(listingAppointments)
            .innerJoin(listings, eq(listingAppointments.listingId, listings.id))
            .where(
              and(
                eq(listings.ownerUserId, userId),
                eq(listingAppointments.status, AppointmentStatus.CONFIRMED),
                gte(listingAppointments.scheduledAt, new Date()),
              ),
            ),
        ),
        this.scalarCount(
          this.db
            .select({ value: count() })
            .from(listingApplications)
            .innerJoin(listings, eq(listingApplications.listingId, listings.id))
            .where(
              and(
                eq(listings.ownerUserId, userId),
                inArray(listingApplications.status, [
                  ...ACTIVE_APPLICATION_STATUSES,
                ]),
              ),
            ),
        ),
        this.scalarCount(
          this.db
            .select({ value: count() })
            .from(listingDeals)
            .where(
              and(
                eq(listingDeals.ownerUserId, userId),
                eq(listingDeals.status, DealStatus.ACTIVE),
              ),
            ),
        ),
        this.scalarCount(
          this.db
            .select({ value: count() })
            .from(escrowLedger)
            .where(
              and(
                eq(escrowLedger.beneficiaryUserId, userId),
                eq(escrowLedger.status, EscrowStatus.HELD),
              ),
            ),
        ),
        this.maintenance.countOpenForOwner(userId),
        computeOccupancyPercentForOwner(this.db, userId),
        this.rentSchedules.rentDueThisWeekForOwner(userId),
      ]);

    return {
      listingsByStatus,
      openInquiries,
      upcomingAppointments,
      applications,
      activeDeals,
      escrowHeld,
      openTickets,
      occupancyPercent,
      rentDueThisWeekCount: rentDueThisWeek.rentDueThisWeekCount,
      rentDueThisWeekMinor: rentDueThisWeek.rentDueThisWeekMinor,
      ...(await this.cameroonOpsStats(userId)),
    };
  }

  private async seekerPersonaCounters(
    userId: string,
  ): Promise<PersonaStatsCounters> {
    const [openInquiries, upcomingAppointments, applications, activeDeals, escrowHeld] =
      await Promise.all([
        this.scalarCount(
          this.db
            .select({ value: count() })
            .from(listingInquiries)
            .where(
              and(
                eq(listingInquiries.inquirerUserId, userId),
                eq(listingInquiries.status, InquiryStatus.OPEN),
              ),
            ),
        ),
        this.scalarCount(
          this.db
            .select({ value: count() })
            .from(listingAppointments)
            .where(
              and(
                eq(listingAppointments.requesterUserId, userId),
                eq(listingAppointments.status, AppointmentStatus.CONFIRMED),
                gte(listingAppointments.scheduledAt, new Date()),
              ),
            ),
        ),
        this.scalarCount(
          this.db
            .select({ value: count() })
            .from(listingApplications)
            .where(
              and(
                eq(listingApplications.applicantUserId, userId),
                inArray(listingApplications.status, [
                  ...ACTIVE_APPLICATION_STATUSES,
                ]),
              ),
            ),
        ),
        this.scalarCount(
          this.db
            .select({ value: count() })
            .from(listingDeals)
            .where(
              and(
                eq(listingDeals.counterpartyUserId, userId),
                eq(listingDeals.status, DealStatus.ACTIVE),
              ),
            ),
        ),
        this.scalarCount(
          this.db
            .select({ value: count() })
            .from(escrowLedger)
            .where(
              and(
                eq(escrowLedger.payerUserId, userId),
                eq(escrowLedger.status, EscrowStatus.HELD),
              ),
            ),
        ),
      ]);

    return {
      openInquiries,
      upcomingAppointments,
      applications,
      activeDeals,
      escrowHeld,
      virtualAppointmentsUpcoming: await this.scalarCount(
        this.virtualAppointmentsQuery(userId),
      ),
    };
  }

  private upcomingAppointmentsQuery() {
    return this.db
      .select({ value: count() })
      .from(listingAppointments)
      .where(
        and(
          eq(listingAppointments.status, AppointmentStatus.CONFIRMED),
          gte(listingAppointments.scheduledAt, new Date()),
        ),
      );
  }

  private async listingStatusCountsForOwner(
    ownerUserId: string,
  ): Promise<Partial<Record<ListingStatus, number>>> {
    const rows = await this.db
      .select({
        status: listings.status,
        value: count(),
      })
      .from(listings)
      .where(eq(listings.ownerUserId, ownerUserId))
      .groupBy(listings.status);

    const result: Partial<Record<ListingStatus, number>> = {};
    for (const row of rows) {
      result[row.status] = Number(row.value);
    }
    return result;
  }

  private async listingStatusCounts(): Promise<
    Partial<Record<ListingStatus, number>>
  > {
    const rows = await this.db
      .select({
        status: listings.status,
        value: count(),
      })
      .from(listings)
      .groupBy(listings.status);

    const result: Partial<Record<ListingStatus, number>> = {};
    for (const row of rows) {
      result[row.status] = Number(row.value);
    }
    return result;
  }

  private async countUnreadNotifications(userId: string): Promise<number> {
    return this.scalarCount(
      this.db
        .select({ value: count() })
        .from(notifications)
        .where(
          and(eq(notifications.userId, userId), isNull(notifications.readAt)),
        ),
    );
  }

  private async scalarCount(
    query: { then?: unknown } | PromiseLike<{ value: number }[]>,
  ): Promise<number> {
    const rows = await query;
    return Number(rows[0]?.value ?? 0);
  }

  private async assertPlatformAdmin(userId: string): Promise<void> {
    const personas = await this.identity.listPersonasForUser(userId);
    if (!personas.includes(Persona.PLATFORM_ADMIN)) {
      throw AppException.forbidden('Platform admin persona required');
    }
  }

  private async countRenewalsDueWithin30Days(): Promise<number> {
    const now = new Date();
    const in30 = new Date(now);
    in30.setUTCDate(in30.getUTCDate() + 30);
    return this.scalarCount(
      this.db
        .select({ value: count() })
        .from(listingDeals)
        .where(
          and(
            eq(listingDeals.type, DealType.LEASE),
            eq(listingDeals.status, DealStatus.ACTIVE),
            isNotNull(listingDeals.endsAt),
            gte(listingDeals.endsAt, now),
            lte(listingDeals.endsAt, in30),
          ),
        ),
    );
  }

  private async docsVerificationStatusSummary(): Promise<DocsVerificationStatusSummary> {
    const [verifiedRow] = await this.db
      .select({ value: count() })
      .from(listings)
      .where(eq(listings.documentsVerifiedByMykwatta, true));
    const [unverifiedRow] = await this.db
      .select({ value: count() })
      .from(listings)
      .where(eq(listings.documentsVerifiedByMykwatta, false));
    return {
      verified: Number(verifiedRow?.value ?? 0),
      unverified: Number(unverifiedRow?.value ?? 0),
    };
  }

  private async phase2MeCounters(userId: string): Promise<{
    savedSearchCount: number;
    newMatchCount: number;
    titleDocsPending: number;
  }> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [savedSearchCount, newMatchCount, titleDocsPending] = await Promise.all([
      this.scalarCount(
        this.db
          .select({ value: count() })
          .from(savedSearches)
          .where(eq(savedSearches.userId, userId)),
      ),
      this.scalarCount(
        this.db
          .select({ value: count() })
          .from(savedSearchMatches)
          .innerJoin(
            savedSearches,
            eq(savedSearchMatches.savedSearchId, savedSearches.id),
          )
          .where(
            and(
              eq(savedSearches.userId, userId),
              gte(savedSearchMatches.createdAt, since),
            ),
          ),
      ),
      this.scalarCount(
        this.db
          .select({ value: count() })
          .from(listingTitleDocuments)
          .innerJoin(listings, eq(listingTitleDocuments.listingId, listings.id))
          .where(
            and(
              eq(listings.ownerUserId, userId),
              eq(listingTitleDocuments.status, TitleDocumentStatus.PENDING),
            ),
          ),
      ),
    ]);
    return { savedSearchCount, newMatchCount, titleDocsPending };
  }

  private async cameroonOpsStats(ownerUserId?: string): Promise<{
    unassignedLeads: number;
    slaBreaches: number;
    premiumListings: number;
    virtualAppointmentsUpcoming: number;
  }> {
    const now = new Date();
    const [unassignedLeads, slaBreaches, premiumListings, virtualAppointmentsUpcoming] =
      await Promise.all([
        this.scalarCount(
          ownerUserId
            ? this.db
                .select({ value: count() })
                .from(listingInquiries)
                .innerJoin(listings, eq(listingInquiries.listingId, listings.id))
                .where(
                  and(
                    eq(listings.ownerUserId, ownerUserId),
                    eq(listingInquiries.status, InquiryStatus.OPEN),
                    isNull(listingInquiries.assigneeUserId),
                  ),
                )
            : this.db
                .select({ value: count() })
                .from(listingInquiries)
                .where(
                  and(
                    eq(listingInquiries.status, InquiryStatus.OPEN),
                    isNull(listingInquiries.assigneeUserId),
                  ),
                ),
        ),
        this.scalarCount(
          ownerUserId
            ? this.db
                .select({ value: count() })
                .from(listingInquiries)
                .innerJoin(listings, eq(listingInquiries.listingId, listings.id))
                .where(
                  and(
                    eq(listings.ownerUserId, ownerUserId),
                    eq(listingInquiries.status, InquiryStatus.OPEN),
                    isNull(listingInquiries.firstRespondedAt),
                    lte(listingInquiries.slaDueAt, now),
                  ),
                )
            : this.db
                .select({ value: count() })
                .from(listingInquiries)
                .where(
                  and(
                    eq(listingInquiries.status, InquiryStatus.OPEN),
                    isNull(listingInquiries.firstRespondedAt),
                    lte(listingInquiries.slaDueAt, now),
                  ),
                ),
        ),
        this.scalarCount(
          this.db
            .select({ value: count() })
            .from(listings)
            .where(
              ownerUserId
                ? and(
                    eq(listings.ownerUserId, ownerUserId),
                    eq(listings.isPremium, true),
                  )
                : eq(listings.isPremium, true),
            ),
        ),
        this.scalarCount(this.virtualAppointmentsQuery(undefined, ownerUserId)),
      ]);

    return {
      unassignedLeads,
      slaBreaches,
      premiumListings,
      virtualAppointmentsUpcoming,
    };
  }

  private virtualAppointmentsQuery(requesterUserId?: string, ownerUserId?: string) {
    const filters = [
      eq(listingAppointments.status, AppointmentStatus.CONFIRMED),
      eq(listingAppointments.modality, AppointmentModality.VIRTUAL),
      gte(listingAppointments.scheduledAt, new Date()),
    ];
    if (requesterUserId) {
      filters.push(eq(listingAppointments.requesterUserId, requesterUserId));
    }
    if (ownerUserId) {
      return this.db
        .select({ value: count() })
        .from(listingAppointments)
        .innerJoin(listings, eq(listingAppointments.listingId, listings.id))
        .where(and(...filters, eq(listings.ownerUserId, ownerUserId)));
    }
    return this.db
      .select({ value: count() })
      .from(listingAppointments)
      .where(and(...filters));
  }
}
