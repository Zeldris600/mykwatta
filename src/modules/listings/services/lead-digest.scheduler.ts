import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { QueueJobName, QueueName } from '@mykwatta/shared/queue';

/** Registers the daily lead digest repeatable job once per API/worker boot. */
@Injectable()
export class LeadDigestScheduler implements OnModuleInit {
  private readonly logger = new Logger(LeadDigestScheduler.name);

  constructor(
    @InjectQueue(QueueName.LEAD_DIGEST) private readonly leadDigestQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.leadDigestQueue.upsertJobScheduler(
      'lead-digest-daily',
      { pattern: '0 8 * * *' },
      {
        name: QueueJobName.RUN_LEAD_DIGEST,
        data: {},
        opts: {
          removeOnComplete: true,
          removeOnFail: 100,
        },
      },
    );
    this.logger.log('Lead digest repeatable job scheduled (daily 08:00 UTC cron)');
  }
}
