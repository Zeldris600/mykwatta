import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  QueueJobName,
  QueueName,
  type DeliverNotificationJobData,
} from '@mykwatta/shared/queue';

@Injectable()
export class NotificationProducer {
  private readonly logger = new Logger(NotificationProducer.name);

  constructor(
    @InjectQueue(QueueName.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
  ) {}

  /** Enqueue only — never waits for delivery. */
  async enqueue(data: DeliverNotificationJobData): Promise<string | null> {
    try {
      const job = await this.notificationsQueue.add(
        QueueJobName.DELIVER_NOTIFICATION,
        data,
      );
      return job.id ?? null;
    } catch (error) {
      this.logger.warn(
        `Failed to enqueue notification type=${data.type} user=${data.userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }
}
