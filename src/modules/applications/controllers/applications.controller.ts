import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import {
  CreateApplicationDto,
  DecideApplicationDto,
} from '@mykwatta/modules/applications/dto';
import { ApplicationsService } from '@mykwatta/modules/applications/services/applications.service';

@ApiTags('applications')
@ApiBearerAuth()
@Controller()
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Post('applications')
  submit(@Session() session: UserSession, @Body() body: CreateApplicationDto) {
    return this.applications.submit(session.user.id, body);
  }

  @Get('applications/mine')
  listMine(@Session() session: UserSession) {
    return this.applications.listMine(session.user.id);
  }

  @Get('listings/:listingId/applications')
  listForListing(
    @Param('listingId') listingId: string,
    @Session() session: UserSession,
  ) {
    return this.applications.listForListing(listingId, session.user.id);
  }

  @Post('applications/:applicationId/decide')
  decide(
    @Param('applicationId') applicationId: string,
    @Session() session: UserSession,
    @Body() body: DecideApplicationDto,
  ) {
    return this.applications.decide(applicationId, session.user.id, body);
  }

  @Post('applications/:applicationId/withdraw')
  withdraw(
    @Param('applicationId') applicationId: string,
    @Session() session: UserSession,
  ) {
    return this.applications.withdraw(applicationId, session.user.id);
  }
}
