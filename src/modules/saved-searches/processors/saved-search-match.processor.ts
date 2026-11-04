import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { SavedSearchesService } from '@mykwatta/modules/saved-searches/services/saved-searches.service';
import { QueueJobName, QueueName } from '@mykwatta/shared/queue';

export type SavedSearchMatchJob = {
  listingId: string;
};

@Processor(QueueName.SAVED_SEARCH_MATCH)
export class SavedSearchMatchProcessor extends WorkerHost {
  private readonly logger = new Logger(SavedSearchMatchProcessor.name);

  constructor(private readonly savedSearches: SavedSearchesService) {
    super();
  }

  async process(job: Job<SavedSearchMatchJob>): Promise<void> {
    if ((job.name as QueueJobName) !== QueueJobName.MATCH_SAVED_SEARCHES) {
      throw AppException.badRequest(
        `Unsupported saved search job: ${job.name}`,
      );
    }
    if (!job.data?.listingId) {
      throw AppException.badRequest('Saved search match job missing listingId');
    }
    await this.savedSearches.matchPublishedListing(job.data.listingId);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    this.logger.error(
      `Saved search match job ${job?.id ?? 'unknown'} failed: ${error.message}`,
      error.stack,
    );
  }
}
