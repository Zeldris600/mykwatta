import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import {
  AssignMaintenanceTicketDto,
  CreateMaintenanceTicketDto,
  UpdateMaintenanceTicketStatusDto,
} from '@mykwatta/modules/maintenance/dto';
import { MaintenanceService } from '@mykwatta/modules/maintenance/services';

@ApiTags('maintenance')
@ApiBearerAuth()
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Post('tickets')
  create(
    @Session() session: UserSession,
    @Body() body: CreateMaintenanceTicketDto,
  ) {
    return this.maintenance.create(session.user.id, body);
  }

  @Get('tickets/mine')
  listMine(@Session() session: UserSession) {
    return this.maintenance.listMine(session.user.id);
  }

  @Get('listings/:listingId/tickets')
  listForListing(
    @Param('listingId') listingId: string,
    @Session() session: UserSession,
  ) {
    return this.maintenance.listForListing(listingId, session.user.id);
  }

  @Get('tickets/:ticketId')
  getOne(@Param('ticketId') ticketId: string, @Session() session: UserSession) {
    return this.maintenance.getById(ticketId, session.user.id);
  }

  @Patch('tickets/:ticketId/assign')
  assign(
    @Param('ticketId') ticketId: string,
    @Session() session: UserSession,
    @Body() body: AssignMaintenanceTicketDto,
  ) {
    return this.maintenance.assign(ticketId, session.user.id, body);
  }

  @Patch('tickets/:ticketId/status')
  updateStatus(
    @Param('ticketId') ticketId: string,
    @Session() session: UserSession,
    @Body() body: UpdateMaintenanceTicketStatusDto,
  ) {
    return this.maintenance.updateStatus(ticketId, session.user.id, body);
  }
}
