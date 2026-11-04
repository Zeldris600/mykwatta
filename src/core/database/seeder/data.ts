import { CurrencyCode } from '@mykwatta/core/common/utils/money/currency';
import { GeoSeedIds } from '@mykwatta/core/database/seeder/geo-data';
import {
  InviteStatus,
  OrganisationRole,
  Persona,
} from '@mykwatta/modules/identity/constants';
import {
  AppointmentStatus,
  InquiryStatus,
  ListingStatus,
  ListingType,
  PropertyType,
  ReviewStatus,
} from '@mykwatta/modules/listings/constants';
import {
  PaymentChannel,
  PaymentProviderName,
  PaymentPurpose,
  PaymentStatus,
} from '@mykwatta/modules/payments/constants';

/** Stable IDs for cross-references in seed fixtures. */
export const SeedIds = {
  users: {
    admin: 'seed_user_admin',
    landlord: 'seed_user_landlord',
    agent: 'seed_user_agent',
    renter: 'seed_user_renter',
    buyer: 'seed_user_buyer',
  },
  org: 'seed_org_capital_homes',
  membership: 'seed_membership_agent_owner',
  invite: 'seed_invite_pending_pm',
  listings: {
    bastosRent: 'seed_listing_bastos_rent',
    bonanjoSale: 'seed_listing_bonanjo_sale',
    akwaDraft: 'seed_listing_akwa_draft',
  },
  media: {
    bastosHero: 'seed_media_bastos_hero',
    bonanjoHero: 'seed_media_bonanjo_hero',
  },
  inquiries: {
    bastosOpen: 'seed_inquiry_bastos_open',
    bastosResponded: 'seed_inquiry_bastos_responded',
  },
  reviews: {
    bastosRenter: 'seed_review_bastos_renter',
  },
  favorites: {
    renterBastos: 'seed_favorite_renter_bastos',
    buyerBonanjo: 'seed_favorite_buyer_bonanjo',
  },
  appointments: {
    requested: 'seed_appt_bastos_requested',
    confirmed: 'seed_appt_bastos_confirmed',
  },
  payments: {
    succeeded: 'seed_payment_deposit_ok',
    pending: 'seed_payment_deposit_pending',
  },
} as const;

export type SeedUser = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  personas: Persona[];
};

export const users: SeedUser[] = [
  {
    id: SeedIds.users.admin,
    name: 'Platform Admin',
    email: 'admin@mykwatta.local',
    phoneNumber: '+237670000001',
    personas: [Persona.PLATFORM_ADMIN],
  },
  {
    id: SeedIds.users.landlord,
    name: 'Ada Mbarga',
    email: 'landlord@mykwatta.local',
    phoneNumber: '+237670000002',
    personas: [Persona.LANDLORD],
  },
  {
    id: SeedIds.users.agent,
    name: 'Jean Nkolo',
    email: 'agent@mykwatta.local',
    phoneNumber: '+237670000003',
    personas: [Persona.AGENT],
  },
  {
    id: SeedIds.users.renter,
    name: 'Marie Fotso',
    email: 'renter@mykwatta.local',
    phoneNumber: '+237670000004',
    personas: [Persona.RENTER],
  },
  {
    id: SeedIds.users.buyer,
    name: 'Paul Essomba',
    email: 'buyer@mykwatta.local',
    phoneNumber: '+237670000005',
    personas: [Persona.BUYER],
  },
];

export const organisations = [
  {
    id: SeedIds.org,
    name: 'Capital Homes Agency',
    slug: 'capital-homes',
  },
] as const;

export const memberships = [
  {
    id: SeedIds.membership,
    organisationId: SeedIds.org,
    userId: SeedIds.users.agent,
    role: OrganisationRole.OWNER,
  },
] as const;

export const invites = [
  {
    id: SeedIds.invite,
    organisationId: SeedIds.org,
    email: 'pm.invitee@mykwatta.local',
    role: OrganisationRole.PROPERTY_MANAGER,
    token: 'seed_invite_token_capital_homes_pm',
    status: InviteStatus.PENDING,
    invitedByUserId: SeedIds.users.agent,
    /** Relative days from seed runtime. */
    expiresInDays: 14,
  },
] as const;

export const listings = [
  {
    id: SeedIds.listings.bastosRent,
    title: '2-bedroom apartment in Bastos',
    description:
      'Bright furnished apartment near schools and embassies. Ideal for professionals.',
    status: ListingStatus.PUBLISHED,
    listingType: ListingType.RENT,
    propertyType: PropertyType.APARTMENT,
    priceMinor: 350_000,
    currency: CurrencyCode.XAF,
    city: 'Yaoundé',
    neighborhood: 'Bastos',
    quartierId: GeoSeedIds.quartiers.bastos,
    addressLine: 'Rue 1.234',
    countryCode: 'CM',
    latitude: 3.885_6,
    longitude: 11.510_4,
    bedrooms: 2,
    bathrooms: 1,
    areaSqm: 85,
    ownerUserId: SeedIds.users.landlord,
    organisationId: null as string | null,
  },
  {
    id: SeedIds.listings.bonanjoSale,
    title: 'Commercial loft in Bonanjo',
    description:
      'Open-plan loft suitable for boutique office or showroom in Douala centre.',
    status: ListingStatus.PUBLISHED,
    listingType: ListingType.SALE,
    propertyType: PropertyType.COMMERCIAL,
    priceMinor: 45_000_000,
    currency: CurrencyCode.XAF,
    city: 'Douala',
    neighborhood: 'Bonanjo',
    quartierId: GeoSeedIds.quartiers.bonanjo,
    addressLine: 'Boulevard de la Liberté',
    countryCode: 'CM',
    latitude: 4.043_5,
    longitude: 9.687_2,
    bedrooms: null as number | null,
    bathrooms: 2,
    areaSqm: 140,
    ownerUserId: SeedIds.users.agent,
    organisationId: SeedIds.org,
  },
  {
    id: SeedIds.listings.akwaDraft,
    title: 'Studio near Akwa',
    description:
      'Compact studio for short stays. Photos and KYC pending before publish.',
    status: ListingStatus.DRAFT,
    listingType: ListingType.RENT,
    propertyType: PropertyType.STUDIO,
    priceMinor: 120_000,
    currency: CurrencyCode.XAF,
    city: 'Douala',
    neighborhood: 'Akwa',
    quartierId: GeoSeedIds.quartiers.akwa,
    addressLine: null as string | null,
    countryCode: 'CM',
    latitude: 4.051_1,
    longitude: 9.708_5,
    bedrooms: 0,
    bathrooms: 1,
    areaSqm: 28,
    ownerUserId: SeedIds.users.landlord,
    organisationId: null as string | null,
  },
] as const;

/** Placeholder photos for published seed listings (console:// URLs in CONSOLE storage). */
export const listingMedia = [
  {
    id: SeedIds.media.bastosHero,
    listingId: SeedIds.listings.bastosRent,
    objectKey: `listings/${SeedIds.listings.bastosRent}/seed-hero.jpg`,
    contentType: 'image/jpeg',
    sortOrder: 0,
    caption: 'Living room',
  },
  {
    id: SeedIds.media.bonanjoHero,
    listingId: SeedIds.listings.bonanjoSale,
    objectKey: `listings/${SeedIds.listings.bonanjoSale}/seed-hero.jpg`,
    contentType: 'image/jpeg',
    sortOrder: 0,
    caption: 'Open loft',
  },
] as const;

export const inquiries = [
  {
    id: SeedIds.inquiries.bastosOpen,
    listingId: SeedIds.listings.bastosRent,
    inquirerUserId: SeedIds.users.renter,
    message:
      'Is this still available for viewing this weekend? Looking for a 6-month lease.',
    contactPhone: '+237670000004',
    status: InquiryStatus.OPEN,
    responseMessage: null as string | null,
  },
  {
    id: SeedIds.inquiries.bastosResponded,
    listingId: SeedIds.listings.bastosRent,
    inquirerUserId: SeedIds.users.buyer,
    message:
      'Can we schedule a morning viewing next week? Interested in similar units too.',
    contactPhone: '+237670000005',
    status: InquiryStatus.RESPONDED,
    responseMessage:
      'Yes — Wednesday or Thursday mornings work. Please propose a slot.',
  },
] as const;

export const reviews = [
  {
    id: SeedIds.reviews.bastosRenter,
    listingId: SeedIds.listings.bastosRent,
    authorUserId: SeedIds.users.renter,
    rating: 5,
    comment: 'Great location and responsive host. Looking forward to viewing.',
    status: ReviewStatus.ACTIVE,
  },
] as const;

/** Favorites / shortlist (saved_listings). */
export const favorites = [
  {
    id: SeedIds.favorites.renterBastos,
    userId: SeedIds.users.renter,
    listingId: SeedIds.listings.bastosRent,
  },
  {
    id: SeedIds.favorites.buyerBonanjo,
    userId: SeedIds.users.buyer,
    listingId: SeedIds.listings.bonanjoSale,
  },
] as const;

export const appointments = [
  {
    id: SeedIds.appointments.requested,
    listingId: SeedIds.listings.bastosRent,
    inquiryId: SeedIds.inquiries.bastosOpen,
    requesterUserId: SeedIds.users.renter,
    status: AppointmentStatus.REQUESTED,
    /** Days from now. */
    scheduledInDays: 3,
    durationMinutes: 30,
    locationNote: 'Meet at the main gate',
    notes: 'Prefer late morning',
  },
  {
    id: SeedIds.appointments.confirmed,
    listingId: SeedIds.listings.bastosRent,
    inquiryId: SeedIds.inquiries.bastosResponded,
    requesterUserId: SeedIds.users.buyer,
    status: AppointmentStatus.CONFIRMED,
    scheduledInDays: 5,
    durationMinutes: 45,
    locationNote: 'Concierge will buzz you in',
    notes: null as string | null,
  },
] as const;

export const payments = [
  {
    id: SeedIds.payments.succeeded,
    userId: SeedIds.users.renter,
    listingId: SeedIds.listings.bastosRent,
    appointmentId: SeedIds.appointments.confirmed,
    purpose: PaymentPurpose.LISTING_DEPOSIT,
    channel: PaymentChannel.MOBILE_MONEY,
    provider: PaymentProviderName.CONSOLE,
    status: PaymentStatus.SUCCEEDED,
    amountMinor: 50_000,
    currency: CurrencyCode.XAF,
    providerRef: 'console_seed_payment_deposit_ok',
    checkoutUrl: 'console://pay/seed_payment_deposit_ok',
    paid: true,
  },
  {
    id: SeedIds.payments.pending,
    userId: SeedIds.users.buyer,
    listingId: SeedIds.listings.bonanjoSale,
    appointmentId: null as string | null,
    purpose: PaymentPurpose.LISTING_DEPOSIT,
    channel: PaymentChannel.CARD,
    provider: PaymentProviderName.CONSOLE,
    status: PaymentStatus.REQUIRES_ACTION,
    amountMinor: 25_000,
    currency: CurrencyCode.USD,
    providerRef: 'console_seed_payment_deposit_pending',
    checkoutUrl: 'console://pay/seed_payment_deposit_pending',
    paid: false,
  },
] as const;
