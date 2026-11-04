import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { MailerService } from '@mykwatta/shared/mailer';
import { QueueJobName, QueueName } from '../queue.constants';
import type { SendEmailJobData } from '../jobs/send-email.job';

@Processor(QueueName.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailer: MailerService) {
    super();
  }

  async process(job: Job<SendEmailJobData>): Promise<void> {
    if ((job.name as QueueJobName) !== QueueJobName.SEND_EMAIL) {
      throw AppException.badRequest(`Unsupported email job: ${job.name}`);
    }

    await this.mailer.send(job.data);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    this.logger.error(
      `Email job failed id=${job?.id ?? 'unknown'}: ${error.message}`,
      error.stack,
    );
  }
}
