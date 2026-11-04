import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { QueueJobName, QueueName } from '@mykwatta/shared/queue';

@Injectable()
export class RentRemindersScheduler implements OnModuleInit {
  private readonly logger = new Logger(RentRemindersScheduler.name);

  constructor(
    @InjectQueue(QueueName.RENT_REMINDERS)
    private readonly rentRemindersQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rentRemindersQueue.upsertJobScheduler(
      'rent-reminders-daily',
      { pattern: '0 7 * * *' },
      {
        name: QueueJobName.RUN_RENT_REMINDERS,
        data: {},
        opts: {
          removeOnComplete: true,
          removeOnFail: 100,
        },
      },
    );
    this.logger.log('Rent reminders repeatable job scheduled (daily 07:00 UTC cron)');
  }
}
