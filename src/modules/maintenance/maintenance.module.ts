import { Module } from '@nestjs/common';
import { ListingsModule } from '@mykwatta/modules/listings';
import { MaintenanceController } from '@mykwatta/modules/maintenance/controllers';
import { MaintenanceService } from '@mykwatta/modules/maintenance/services';

@Module({
  imports: [ListingsModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
