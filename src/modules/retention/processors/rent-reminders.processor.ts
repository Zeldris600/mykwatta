import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { RentRemindersService } from '@mykwatta/modules/retention/services';
import { QueueJobName, QueueName } from '@mykwatta/shared/queue';

@Processor(QueueName.RENT_REMINDERS)
export class RentRemindersProcessor extends WorkerHost {
  private readonly logger = new Logger(RentRemindersProcessor.name);

  constructor(private readonly rentReminders: RentRemindersService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if ((job.name as QueueJobName) !== QueueJobName.RUN_RENT_REMINDERS) {
      throw AppException.badRequest(
        `Unsupported rent reminders job: ${job.name}`,
      );
    }
    await this.rentReminders.runDaily();
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    this.logger.error(
      `Rent reminders job ${job?.id ?? 'unknown'} failed: ${error.message}`,
      error.stack,
    );
  }
}
