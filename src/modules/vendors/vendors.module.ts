import { Module } from '@nestjs/common';
import { IdentityModule } from '@mykwatta/modules/identity';
import { VendorsController } from '@mykwatta/modules/vendors/controllers';
import { VendorsService } from '@mykwatta/modules/vendors/services';

@Module({
  imports: [IdentityModule],
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
