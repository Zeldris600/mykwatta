import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { LeadSlaService } from '@mykwatta/modules/listings/services/lead-sla.service';
import { QueueJobName, QueueName } from '@mykwatta/shared/queue';

@Processor(QueueName.LEAD_SLA)
export class LeadSlaProcessor extends WorkerHost {
  private readonly logger = new Logger(LeadSlaProcessor.name);

  constructor(private readonly leadSla: LeadSlaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if ((job.name as QueueJobName) !== QueueJobName.RUN_SLA_BREACH_SCAN) {
      throw AppException.badRequest(`Unsupported lead SLA job: ${job.name}`);
    }
    await this.leadSla.scanBreaches();
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    const cause =
      error.cause instanceof Error ? error.cause.message : undefined;
    this.logger.error(
      `Lead SLA job ${job?.id ?? 'unknown'} failed: ${error.message}${cause ? ` | cause: ${cause}` : ''}`,
      error.stack,
    );
  }
}
