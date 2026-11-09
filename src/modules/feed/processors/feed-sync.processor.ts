import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { FeedSyncService } from '@mykwatta/modules/feed/services/feed-sync.service';
import { QueueJobName, QueueName } from '@mykwatta/shared/queue';

export type FeedSyncJob = {
  listingId: string;
};

@Processor(QueueName.FEED_SYNC)
export class FeedSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(FeedSyncProcessor.name);

  constructor(private readonly feedSync: FeedSyncService) {
    super();
  }

  async process(job: Job<FeedSyncJob>): Promise<void> {
    if ((job.name as QueueJobName) !== QueueJobName.SYNC_FEED_POST) {
      throw AppException.badRequest(`Unsupported feed sync job: ${job.name}`);
    }
    if (!job.data?.listingId) {
      throw AppException.badRequest('Feed sync job missing listingId');
    }
    await this.feedSync.syncListing(job.data.listingId);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    this.logger.error(
      `Feed sync job ${job?.id ?? 'unknown'} failed: ${error.message}`,
      error.stack,
    );
  }
}
