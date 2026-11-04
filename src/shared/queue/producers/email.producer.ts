import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { QueueJobName, QueueName } from '../queue.constants';
import type { SendEmailJobData } from '../jobs/send-email.job';

@Injectable()
export class EmailProducer {
  private readonly logger = new Logger(EmailProducer.name);

  constructor(
    @InjectQueue(QueueName.EMAIL) private readonly emailQueue: Queue,
  ) {}

  async enqueue(data: SendEmailJobData): Promise<string> {
    try {
      const job = await this.emailQueue.add(QueueJobName.SEND_EMAIL, data);
      if (!job.id) {
        throw AppException.queue('Email job was created without an id');
      }
      return job.id;
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to enqueue email: ${reason}`);
      throw AppException.queue('Failed to enqueue email job', { reason });
    }
  }
}
