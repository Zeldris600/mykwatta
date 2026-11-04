import { Module } from '@nestjs/common';
import { DealsController } from '@mykwatta/modules/deals/controllers';
import { DealsService } from '@mykwatta/modules/deals/services';
import { ListingsModule } from '@mykwatta/modules/listings';

@Module({
  imports: [ListingsModule],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
