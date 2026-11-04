import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import {
  AssignLeadDto,
  ListOrgLeadsQueryDto,
} from '@mykwatta/modules/listings/dto';
import { OrgLeadService } from '@mykwatta/modules/listings/services/org-lead.service';

@ApiTags('leads')
@ApiBearerAuth()
@Controller('organisations/:organisationId/leads')
export class OrgLeadsController {
  constructor(private readonly orgLeads: OrgLeadService) {}

  @Get()
  list(
    @Param('organisationId') organisationId: string,
    @Session() session: UserSession,
    @Query() query: ListOrgLeadsQueryDto,
  ) {
    return this.orgLeads.listOrgInbox(
      organisationId,
      session.user.id,
      query.unassigned,
    );
  }

  @Post(':inquiryId/assign')
  assign(
    @Param('organisationId') organisationId: string,
    @Param('inquiryId') inquiryId: string,
    @Session() session: UserSession,
    @Body() body: AssignLeadDto,
  ) {
    return this.orgLeads.assign(
      organisationId,
      inquiryId,
      session.user.id,
      body,
    );
  }
}
