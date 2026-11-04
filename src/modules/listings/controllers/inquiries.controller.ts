import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import {
  CreateInquiryDto,
  RespondInquiryDto,
} from '@mykwatta/modules/listings/dto';
import { InquiriesService } from '@mykwatta/modules/listings/services/inquiries.service';

@ApiTags('inquiries')
@ApiBearerAuth()
@Controller()
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Post('listings/:listingId/inquiries')
  create(
    @Param('listingId') listingId: string,
    @Session() session: UserSession,
    @Body() body: CreateInquiryDto,
  ) {
    return this.inquiriesService.create(listingId, session.user.id, body);
  }

  @Get('listings/:listingId/inquiries')
  listForListing(
    @Param('listingId') listingId: string,
    @Session() session: UserSession,
  ) {
    return this.inquiriesService.listForListing(listingId, session.user.id);
  }

  @Get('inquiries/mine')
  listMine(@Session() session: UserSession) {
    return this.inquiriesService.listMine(session.user.id);
  }

  @Get('inquiries/inbox')
  listInbox(@Session() session: UserSession) {
    return this.inquiriesService.listInbox(session.user.id);
  }

  @Post('inquiries/:inquiryId/respond')
  respond(
    @Param('inquiryId') inquiryId: string,
    @Session() session: UserSession,
    @Body() body: RespondInquiryDto,
  ) {
    return this.inquiriesService.respond(inquiryId, session.user.id, body);
  }

  @Post('inquiries/:inquiryId/close')
  close(
    @Param('inquiryId') inquiryId: string,
    @Session() session: UserSession,
  ) {
    return this.inquiriesService.close(inquiryId, session.user.id);
  }
}
