import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import {
  AdminListingTrustDto,
  AdminListingVerificationDto,
  AdminMarkDuplicateDto,
  DecideListingReportDto,
  ReviewTitleDocumentDto,
} from '@mykwatta/modules/listings/dto';
import { ListingReportsService } from '@mykwatta/modules/listings/services/listing-reports.service';
import { ListingsAdminService } from '@mykwatta/modules/listings/services/listings-admin.service';
import { TitleDocumentsService } from '@mykwatta/modules/listings/services/title-documents.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminListingsController {
  constructor(
    private readonly listingReports: ListingReportsService,
    private readonly listingsAdmin: ListingsAdminService,
    private readonly titleDocuments: TitleDocumentsService,
  ) {}

  @Get('listing-reports')
  listReports(@Session() session: UserSession) {
    return this.listingReports.listForAdmin(session.user.id);
  }

  @Patch('listing-reports/:reportId/decide')
  decideReport(
    @Param('reportId') reportId: string,
    @Session() session: UserSession,
    @Body() body: DecideListingReportDto,
  ) {
    return this.listingReports.decide(reportId, session.user.id, body);
  }

  @Patch('listings/:id/trust')
  setTrust(
    @Param('id') listingId: string,
    @Session() session: UserSession,
    @Body() body: AdminListingTrustDto,
  ) {
    return this.listingsAdmin.setTrust(listingId, session.user.id, body);
  }

  @Patch('listings/:id/verification')
  setVerification(
    @Param('id') listingId: string,
    @Session() session: UserSession,
    @Body() body: AdminListingVerificationDto,
  ) {
    return this.listingsAdmin.setVerification(
      listingId,
      session.user.id,
      body,
    );
  }

  @Patch('title-documents/:documentId/review')
  reviewTitleDocument(
    @Param('documentId') documentId: string,
    @Session() session: UserSession,
    @Body() body: ReviewTitleDocumentDto,
  ) {
    return this.titleDocuments.review(documentId, session.user.id, body);
  }

  @Patch('listings/:id/duplicate')
  markDuplicate(
    @Param('id') listingId: string,
    @Session() session: UserSession,
    @Body() body: AdminMarkDuplicateDto,
  ) {
    return this.listingsAdmin.markDuplicate(
      listingId,
      session.user.id,
      body,
    );
  }
}
