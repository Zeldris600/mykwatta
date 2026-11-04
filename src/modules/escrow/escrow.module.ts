import { Module, forwardRef } from '@nestjs/common';
import { EscrowController } from '@mykwatta/modules/escrow/controllers';
import { EscrowService } from '@mykwatta/modules/escrow/services';
import { IdentityModule } from '@mykwatta/modules/identity';
import { ListingsModule } from '@mykwatta/modules/listings';

@Module({
  imports: [forwardRef(() => ListingsModule), IdentityModule],
  controllers: [EscrowController],
  providers: [EscrowService],
  exports: [EscrowService],
})
export class EscrowModule {}
