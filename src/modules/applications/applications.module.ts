import { Module } from '@nestjs/common';
import { ApplicationsController } from '@mykwatta/modules/applications/controllers';
import { ApplicationsService } from '@mykwatta/modules/applications/services';
import { DealsModule } from '@mykwatta/modules/deals';
import { ListingsModule } from '@mykwatta/modules/listings';

@Module({
  imports: [ListingsModule, DealsModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
