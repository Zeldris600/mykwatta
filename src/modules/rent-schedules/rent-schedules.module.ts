import { Module } from '@nestjs/common';
import { RentSchedulesController } from '@mykwatta/modules/rent-schedules/controllers';
import { RentSchedulesService } from '@mykwatta/modules/rent-schedules/services';

@Module({
  controllers: [RentSchedulesController],
  providers: [RentSchedulesService],
  exports: [RentSchedulesService],
})
export class RentSchedulesModule {}
