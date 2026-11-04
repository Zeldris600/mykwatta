import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { CreateRentScheduleDto } from '@mykwatta/modules/rent-schedules/dto';
import { RentSchedulesService } from '@mykwatta/modules/rent-schedules/services';

@ApiTags('rent-schedules')
@ApiBearerAuth()
@Controller('rent-schedules')
export class RentSchedulesController {
  constructor(private readonly rentSchedules: RentSchedulesService) {}

  @Post('deals/:dealId')
  createForDeal(
    @Param('dealId') dealId: string,
    @Session() session: UserSession,
    @Body() body: CreateRentScheduleDto,
  ) {
    return this.rentSchedules.createForDeal(dealId, session.user.id, body);
  }

  @Get('mine')
  listMine(@Session() session: UserSession) {
    return this.rentSchedules.listForOwner(session.user.id);
  }

  @Get('occupancy/mine')
  occupancy(@Session() session: UserSession) {
    return this.rentSchedules.occupancyForOwner(session.user.id);
  }

  @Get(':scheduleId')
  getOne(
    @Param('scheduleId') scheduleId: string,
    @Session() session: UserSession,
  ) {
    return this.rentSchedules.getSchedule(scheduleId, session.user.id);
  }
}
