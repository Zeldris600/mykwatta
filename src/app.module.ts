import { Module } from '@nestjs/common';
import { CoreModule } from '@mykwatta/core';
import { ApplicationsModule } from '@mykwatta/modules/applications';
import { DealsModule } from '@mykwatta/modules/deals';
import { GeoModule } from '@mykwatta/modules/geo';
import { IdentityModule } from '@mykwatta/modules/identity';
import { KycModule } from '@mykwatta/modules/kyc';
import { ListingsModule } from '@mykwatta/modules/listings';
import { NotificationsModule } from '@mykwatta/modules/notifications';
import { EscrowModule } from '@mykwatta/modules/escrow';
import { PaymentsModule } from '@mykwatta/modules/payments';
import { CatalogsModule } from '@mykwatta/modules/catalogs';
import { CompsModule } from '@mykwatta/modules/comps';
import { DirectoryModule } from '@mykwatta/modules/directory';
import { MaintenanceModule } from '@mykwatta/modules/maintenance';
import { RentSchedulesModule } from '@mykwatta/modules/rent-schedules';
import { RetentionModule } from '@mykwatta/modules/retention';
import { SavedSearchesModule } from '@mykwatta/modules/saved-searches';
import { StatsModule } from '@mykwatta/modules/stats';
import { VendorsModule } from '@mykwatta/modules/vendors';
import { CacheModule } from '@mykwatta/shared/cache';
import { MailerModule } from '@mykwatta/shared/mailer';
import { PaymentsInfraModule } from '@mykwatta/shared/payments';
import { PushModule } from '@mykwatta/shared/push';
import { PusherModule } from '@mykwatta/shared/pusher';
import { QueueModule } from '@mykwatta/shared/queue';
import { StorageModule } from '@mykwatta/shared/storage';
import { TwilioModule } from '@mykwatta/shared/twilio';

@Module({
  imports: [
    CoreModule,
    CacheModule,
    MailerModule,
    StorageModule,
    PaymentsInfraModule,
    PusherModule,
    PushModule,
    QueueModule,
    TwilioModule,
    NotificationsModule,
    IdentityModule,
    GeoModule,
    CatalogsModule,
    DirectoryModule,
    KycModule,
    ListingsModule,
    PaymentsModule,
    EscrowModule,
    ApplicationsModule,
    DealsModule,
    CompsModule,
    MaintenanceModule,
    RentSchedulesModule,
    RetentionModule,
    VendorsModule,
    SavedSearchesModule,
    StatsModule,
  ],
})
export class AppModule {}
