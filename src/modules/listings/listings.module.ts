import { Module, forwardRef } from '@nestjs/common';
import { IdentityModule } from '@mykwatta/modules/identity';
import { KycModule } from '@mykwatta/modules/kyc';
import { PaymentsModule } from '@mykwatta/modules/payments';
import {
  AdminListingsController,
  AppointmentsController,
  InquiriesController,
  ListingMediaController,
  ListingReportsController,
  ListingsController,
  OrgLeadsController,
  ReviewsController,
  SavedListingsController,
  TitleDocumentsController,
} from '@mykwatta/modules/listings/controllers';
import { LeadDigestProcessor } from '@mykwatta/modules/listings/processors/lead-digest.processor';
import { LeadSlaProcessor } from '@mykwatta/modules/listings/processors/lead-sla.processor';
import {
  AppointmentsService,
  InquiriesService,
  LeadDigestScheduler,
  LeadDigestService,
  LeadSlaScheduler,
  LeadSlaService,
  ListingMediaService,
  ListingReportsService,
  ListingsAdminService,
  ListingsService,
  OrgLeadService,
  ReviewsService,
  SavedListingsService,
  TitleDocumentsService,
} from '@mykwatta/modules/listings/services';

@Module({
  imports: [IdentityModule, KycModule, forwardRef(() => PaymentsModule)],
  controllers: [
    SavedListingsController,
    ListingsController,
    ListingMediaController,
    ReviewsController,
    InquiriesController,
    AppointmentsController,
    ListingReportsController,
    AdminListingsController,
    TitleDocumentsController,
    OrgLeadsController,
  ],
  providers: [
    ListingsService,
    ListingMediaService,
    SavedListingsService,
    ReviewsService,
    InquiriesService,
    AppointmentsService,
    ListingReportsService,
    ListingsAdminService,
    TitleDocumentsService,
    OrgLeadService,
    LeadDigestService,
    LeadDigestProcessor,
    LeadDigestScheduler,
    LeadSlaService,
    LeadSlaProcessor,
    LeadSlaScheduler,
  ],
  exports: [
    ListingsService,
    ListingMediaService,
    SavedListingsService,
    ReviewsService,
    InquiriesService,
    AppointmentsService,
    ListingReportsService,
    ListingsAdminService,
  ],
})
export class ListingsModule {}
