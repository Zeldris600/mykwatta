import { Module } from '@nestjs/common';
import { IdentityModule } from '@mykwatta/modules/identity';
import {
  FeedController,
  ProfilesController,
} from '@mykwatta/modules/feed/controllers';
import { FeedSyncProcessor } from '@mykwatta/modules/feed/processors/feed-sync.processor';
import {
  FeedProfilesService,
  FeedService,
  FeedSyncService,
} from '@mykwatta/modules/feed/services';
import { NotificationsModule } from '@mykwatta/modules/notifications';

@Module({
  imports: [IdentityModule, NotificationsModule],
  controllers: [FeedController, ProfilesController],
  providers: [
    FeedSyncService,
    FeedService,
    FeedProfilesService,
    FeedSyncProcessor,
  ],
  exports: [FeedSyncService, FeedService],
})
export class FeedModule {}
