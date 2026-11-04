import { Module } from '@nestjs/common';
import { IdentityModule } from '@mykwatta/modules/identity';
import { KycController } from '@mykwatta/modules/kyc/controllers';
import { KycService } from '@mykwatta/modules/kyc/services';

@Module({
  imports: [IdentityModule],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
