import { Module } from '@nestjs/common';
import { IdentityModule } from '@mykwatta/modules/identity';
import { ListingsModule } from '@mykwatta/modules/listings';
import { RetentionAdminController } from '@mykwatta/modules/retention/controllers';
import { RentRemindersProcessor } from '@mykwatta/modules/retention/processors/rent-reminders.processor';
import { RentRemindersScheduler } from '@mykwatta/modules/retention/schedulers/rent-reminders.scheduler';
import {
  DocsVerificationAdminService,
  RentRemindersService,
} from '@mykwatta/modules/retention/services';

@Module({
  imports: [IdentityModule, ListingsModule],
  controllers: [RetentionAdminController],
  providers: [
    RentRemindersService,
    DocsVerificationAdminService,
    RentRemindersProcessor,
    RentRemindersScheduler,
  ],
  exports: [RentRemindersService],
})
export class RetentionModule {}
