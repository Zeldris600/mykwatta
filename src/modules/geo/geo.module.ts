import { Module } from '@nestjs/common';
import { GeoController } from '@mykwatta/modules/geo/controllers';
import { GeoService } from '@mykwatta/modules/geo/services';

@Module({
  controllers: [GeoController],
  providers: [GeoService],
  exports: [GeoService],
})
export class GeoModule {}
