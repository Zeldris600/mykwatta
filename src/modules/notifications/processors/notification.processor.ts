import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { NotificationDeliveryService } from '@mykwatta/modules/notifications/services/notification-delivery.service';
import {
  QueueJobName,
  QueueName,
  type DeliverNotificationJobData,
} from '@mykwatta/shared/queue';

@Processor(QueueName.NOTIFICATIONS)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly delivery: NotificationDeliveryService) {
    super();
  }

  async process(job: Job<DeliverNotificationJobData>): Promise<void> {
    if ((job.name as QueueJobName) !== QueueJobName.DELIVER_NOTIFICATION) {
      throw AppException.badRequest(
        `Unsupported notification job: ${job.name}`,
      );
    }

    await this.delivery.deliver(job.data);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    this.logger.error(
      `Notification job failed id=${job?.id ?? 'unknown'} type=${(job?.data as DeliverNotificationJobData | undefined)?.type ?? 'n/a'}: ${error.message}`,
      error.stack,
    );
  }
}
