import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { ApiConfigService } from '@mykwatta/core/config';
import { NodeEnvironment } from '@mykwatta/core/config/env.validation';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import {
  AppointmentStatus,
  ListingStatus,
} from '@mykwatta/modules/listings/constants';
import type { DrizzleDb } from '../drizzle.provider';
import { DRIZZLE } from '../drizzle.tokens';
import { listingAppointments } from '../schema/appointments.schema';
import { user } from '../schema/auth.schema';
import {
  memberships,
  organisationInvites,
  organisations,
  userPersonas,
} from '../schema/identity.schema';
import { listingInquiries } from '../schema/inquiries.schema';
import { listingMedia } from '../schema/listing-media.schema';
import { listings } from '../schema/listings.schema';
import { payments } from '../schema/payments.schema';
import { listingReviews } from '../schema/reviews.schema';
import { savedListings } from '../schema/saved-listings.schema';
import { seedCatalogs } from './seed-catalogs';
import { seedGeo } from './seed-geo';
import {
  appointments,
  favorites,
  inquiries,
  invites,
  listingMedia as listingMediaFixtures,
  listings as listingFixtures,
  memberships as membershipFixtures,
  organisations as orgFixtures,
  payments as paymentFixtures,
  reviews,
  users,
} from './data';

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly config: ApiConfigService,
  ) {}

  async run(): Promise<void> {
    if (this.config.nodeEnv === NodeEnvironment.Production) {
      throw new Error('Refusing to seed: NODE_ENV=production');
    }

    this.logger.log('Seeding database (wipe + insert from data.ts)…');
    await this.wipe();
    await seedGeo(this.db);
    await seedCatalogs(this.db);
    await this.seedUsers();
    await this.seedOrgs();
    await this.seedListings();
    await this.seedEngagement();
    await this.seedAppointments();
    await this.seedPayments();
    this.logSummary();
    this.logger.log(
      'Seed complete. Akwa stays DRAFT; publish flow still needs KYC + photos for new listings.',
    );
  }

  private async wipe(): Promise<void> {
    await this.db.execute(sql`
      TRUNCATE TABLE
        vendor_leads,
        vendors,
        rent_schedule_items,
        rent_schedules,
        maintenance_tickets,
        escrow_ledger,
        listing_reports,
        listing_inquiry_messages,
        saved_search_matches,
        saved_searches,
        listing_title_documents,
        listing_landmarks,
        listing_amenities,
        directory_professionals,
        listing_deals,
        listing_applications,
        notifications,
        notification_preferences,
        push_devices,
        payments,
        listing_appointments,
        saved_listings,
        listing_reviews,
        listing_inquiries,
        listing_media,
        listings,
        geo_quartiers,
        geo_cities,
        amenity_catalog,
        landmark_catalog,
        user_kyc,
        organisation_invites,
        memberships,
        organisations,
        user_personas,
        session,
        account,
        verification,
        "user"
      CASCADE
    `);
    this.logger.log('Truncated app tables');
  }

  private async seedUsers(): Promise<void> {
    const now = new Date();
    await this.db.insert(user).values(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        emailVerified: true,
        phoneNumber: u.phoneNumber,
        phoneNumberVerified: true,
        createdAt: now,
        updatedAt: now,
      })),
    );

    await this.db.insert(userPersonas).values(
      users.flatMap((u) =>
        u.personas.map((persona) => ({
          id: createId(),
          userId: u.id,
          persona,
          createdAt: now,
        })),
      ),
    );
  }

  private async seedOrgs(): Promise<void> {
    const now = new Date();
    await this.db.insert(organisations).values(
      orgFixtures.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        createdAt: now,
        updatedAt: now,
      })),
    );

    await this.db.insert(memberships).values(
      membershipFixtures.map((row) => ({
        id: row.id,
        organisationId: row.organisationId,
        userId: row.userId,
        role: row.role,
        createdAt: now,
        updatedAt: now,
      })),
    );

    await this.db.insert(organisationInvites).values(
      invites.map((invite) => ({
        id: invite.id,
        organisationId: invite.organisationId,
        email: invite.email,
        role: invite.role,
        token: invite.token,
        status: invite.status,
        invitedByUserId: invite.invitedByUserId,
        expiresAt: new Date(
          Date.now() + invite.expiresInDays * 24 * 60 * 60 * 1000,
        ),
        createdAt: now,
        updatedAt: now,
      })),
    );
  }

  private async seedListings(): Promise<void> {
    const now = new Date();
    await this.db.insert(listings).values(
      listingFixtures.map((listing) => ({
        id: listing.id,
        title: listing.title,
        description: listing.description,
        status: listing.status,
        listingType: listing.listingType,
        propertyType: listing.propertyType,
        priceMinor: listing.priceMinor,
        currency: listing.currency,
        city: listing.city,
        neighborhood: listing.neighborhood,
        quartierId: listing.quartierId,
        addressLine: listing.addressLine,
        countryCode: listing.countryCode,
        latitude: listing.latitude,
        longitude: listing.longitude,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        areaSqm: listing.areaSqm,
        ownerUserId: listing.ownerUserId,
        organisationId: listing.organisationId,
        publishedAt:
          listing.status === ListingStatus.PUBLISHED ? now : null,
        createdAt: now,
        updatedAt: now,
      })),
    );

    if (listingMediaFixtures.length > 0) {
      await this.db.insert(listingMedia).values(
        listingMediaFixtures.map((media) => ({
          id: media.id,
          listingId: media.listingId,
          objectKey: media.objectKey,
          contentType: media.contentType,
          sortOrder: media.sortOrder,
          caption: media.caption,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }
  }

  private async seedEngagement(): Promise<void> {
    const now = new Date();

    await this.db.insert(listingInquiries).values(
      inquiries.map((inquiry) => ({
        id: inquiry.id,
        listingId: inquiry.listingId,
        inquirerUserId: inquiry.inquirerUserId,
        message: inquiry.message,
        contactPhone: inquiry.contactPhone,
        status: inquiry.status,
        responseMessage: inquiry.responseMessage,
        respondedAt: inquiry.responseMessage ? now : null,
        createdAt: now,
        updatedAt: now,
      })),
    );

    await this.db.insert(listingReviews).values(
      reviews.map((review) => ({
        id: review.id,
        listingId: review.listingId,
        authorUserId: review.authorUserId,
        rating: review.rating,
        comment: review.comment,
        status: review.status,
        createdAt: now,
        updatedAt: now,
      })),
    );

    await this.db.insert(savedListings).values(
      favorites.map((favorite) => ({
        id: favorite.id,
        userId: favorite.userId,
        listingId: favorite.listingId,
        createdAt: now,
      })),
    );
  }

  private async seedAppointments(): Promise<void> {
    const now = new Date();
    await this.db.insert(listingAppointments).values(
      appointments.map((appt) => {
        const scheduledAt = new Date(
          Date.now() + appt.scheduledInDays * 24 * 60 * 60 * 1000,
        );
        return {
          id: appt.id,
          listingId: appt.listingId,
          inquiryId: appt.inquiryId,
          requesterUserId: appt.requesterUserId,
          status: appt.status,
          scheduledAt,
          durationMinutes: appt.durationMinutes,
          locationNote: appt.locationNote,
          notes: appt.notes,
          confirmedAt: appt.status === AppointmentStatus.CONFIRMED ? now : null,
          createdAt: now,
          updatedAt: now,
        };
      }),
    );
  }

  private async seedPayments(): Promise<void> {
    const now = new Date();
    await this.db.insert(payments).values(
      paymentFixtures.map((payment) => ({
        id: payment.id,
        userId: payment.userId,
        listingId: payment.listingId,
        appointmentId: payment.appointmentId,
        purpose: payment.purpose,
        channel: payment.channel,
        provider: payment.provider,
        status: payment.status,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        providerRef: payment.providerRef,
        checkoutUrl: payment.checkoutUrl,
        paidAt: payment.paid ? now : null,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }

  private logSummary(): void {
    this.logger.log('Demo accounts (OTP login against verified phones):');
    for (const u of users) {
      this.logger.log(
        `  ${u.personas.join('+')}  ${u.phoneNumber}  ${u.email}  (${u.id})`,
      );
    }
    const published = listingFixtures.filter(
      (listing) => listing.status === ListingStatus.PUBLISHED,
    ).length;
    const drafts = listingFixtures.length - published;
    this.logger.log(
      `Listings: ${published} PUBLISHED, ${drafts} DRAFT. Media: ${listingMediaFixtures.length}. Favorites: ${favorites.length}.`,
    );
  }
}
