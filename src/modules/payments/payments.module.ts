import { Module, forwardRef } from '@nestjs/common';
import { EscrowModule } from '@mykwatta/modules/escrow';
import { ListingsModule } from '@mykwatta/modules/listings';
import { RentSchedulesModule } from '@mykwatta/modules/rent-schedules';
import {
  PaymentsController,
  WebhooksController,
} from '@mykwatta/modules/payments/controllers';
import {
  DepositAvailabilityService,
  PaymentQuotesService,
  PaymentsAppService,
} from '@mykwatta/modules/payments/services';

@Module({
  imports: [
    forwardRef(() => ListingsModule),
    RentSchedulesModule,
    forwardRef(() => EscrowModule),
  ],
  controllers: [PaymentsController, WebhooksController],
  providers: [
    DepositAvailabilityService,
    PaymentsAppService,
    PaymentQuotesService,
  ],
  exports: [
    DepositAvailabilityService,
    PaymentsAppService,
    PaymentQuotesService,
  ],
})
export class PaymentsModule {}
