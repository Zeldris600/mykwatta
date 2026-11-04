import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import {
  DeclineAppointmentDto,
  ScheduleAppointmentDto,
} from '@mykwatta/modules/listings/dto';
import { AppointmentsService } from '@mykwatta/modules/listings/services/appointments.service';

@ApiTags('appointments')
@ApiBearerAuth()
@Controller()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post('inquiries/:inquiryId/appointments')
  scheduleFromInquiry(
    @Param('inquiryId') inquiryId: string,
    @Session() session: UserSession,
    @Body() body: ScheduleAppointmentDto,
  ) {
    return this.appointmentsService.scheduleFromInquiry(
      inquiryId,
      session.user.id,
      body,
    );
  }

  @Get('listings/:listingId/appointments')
  listForListing(
    @Param('listingId') listingId: string,
    @Session() session: UserSession,
  ) {
    return this.appointmentsService.listForListing(listingId, session.user.id);
  }

  @Get('appointments/mine')
  listMine(@Session() session: UserSession) {
    return this.appointmentsService.listMine(session.user.id);
  }

  @Post('appointments/:appointmentId/confirm')
  confirm(
    @Param('appointmentId') appointmentId: string,
    @Session() session: UserSession,
  ) {
    return this.appointmentsService.confirm(appointmentId, session.user.id);
  }

  @Post('appointments/:appointmentId/decline')
  decline(
    @Param('appointmentId') appointmentId: string,
    @Session() session: UserSession,
    @Body() body: DeclineAppointmentDto,
  ) {
    return this.appointmentsService.decline(
      appointmentId,
      session.user.id,
      body,
    );
  }

  @Post('appointments/:appointmentId/cancel')
  cancel(
    @Param('appointmentId') appointmentId: string,
    @Session() session: UserSession,
  ) {
    return this.appointmentsService.cancel(appointmentId, session.user.id);
  }

  @Post('appointments/:appointmentId/complete')
  complete(
    @Param('appointmentId') appointmentId: string,
    @Session() session: UserSession,
  ) {
    return this.appointmentsService.complete(appointmentId, session.user.id);
  }
}
