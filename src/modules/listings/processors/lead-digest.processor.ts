import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { LeadDigestService } from '@mykwatta/modules/listings/services/lead-digest.service';
import { QueueJobName, QueueName } from '@mykwatta/shared/queue';

@Processor(QueueName.LEAD_DIGEST)
export class LeadDigestProcessor extends WorkerHost {
  private readonly logger = new Logger(LeadDigestProcessor.name);

  constructor(private readonly leadDigest: LeadDigestService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if ((job.name as QueueJobName) !== QueueJobName.RUN_LEAD_DIGEST) {
      throw AppException.badRequest(`Unsupported lead digest job: ${job.name}`);
    }
    await this.leadDigest.runDailyDigest();
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    this.logger.error(
      `Lead digest job ${job?.id ?? 'unknown'} failed: ${error.message}`,
      error.stack,
    );
  }
}
