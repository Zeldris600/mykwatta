import { Module } from '@nestjs/common';
import { IdentityModule } from '@mykwatta/modules/identity';
import { MaintenanceModule } from '@mykwatta/modules/maintenance';
import { RentSchedulesModule } from '@mykwatta/modules/rent-schedules';
import { RetentionModule } from '@mykwatta/modules/retention';
import { StatsController } from '@mykwatta/modules/stats/controllers';
import { StatsService } from '@mykwatta/modules/stats/services';

@Module({
  imports: [
    IdentityModule,
    MaintenanceModule,
    RentSchedulesModule,
    RetentionModule,
  ],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
