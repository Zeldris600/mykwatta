import { Module } from '@nestjs/common';
import { CompsController } from '@mykwatta/modules/comps/controllers';
import { CompsService } from '@mykwatta/modules/comps/services';

@Module({
  controllers: [CompsController],
  providers: [CompsService],
  exports: [CompsService],
})
export class CompsModule {}
