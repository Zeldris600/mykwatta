import { Global, Module } from '@nestjs/common';
import { NotificationsController } from '@mykwatta/modules/notifications/controllers';
import { NotificationProcessor } from '@mykwatta/modules/notifications/processors/notification.processor';
import {
  NotificationDeliveryService,
  NotificationPreferencesService,
  NotificationProducer,
  NotificationsService,
  PushDevicesService,
} from '@mykwatta/modules/notifications/services';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationProducer,
    NotificationDeliveryService,
    NotificationProcessor,
    PushDevicesService,
    NotificationPreferencesService,
  ],
  exports: [
    NotificationsService,
    NotificationPreferencesService,
    PushDevicesService,
  ],
})
export class NotificationsModule {}
