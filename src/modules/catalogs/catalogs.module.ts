import { Module } from '@nestjs/common';
import { CatalogsController } from '@mykwatta/modules/catalogs/controllers';
import { CatalogsService } from '@mykwatta/modules/catalogs/services';

@Module({
  controllers: [CatalogsController],
  providers: [CatalogsService],
  exports: [CatalogsService],
})
export class CatalogsModule {}
