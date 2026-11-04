import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { QueueJobName, QueueName } from '@mykwatta/shared/queue';

/** Scans open leads for missed first-response deadlines. */
@Injectable()
export class LeadSlaScheduler implements OnModuleInit {
  private readonly logger = new Logger(LeadSlaScheduler.name);

  constructor(
    @InjectQueue(QueueName.LEAD_SLA) private readonly leadSlaQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.leadSlaQueue.upsertJobScheduler(
      'lead-sla-scan',
      { pattern: '*/15 * * * *' },
      {
        name: QueueJobName.RUN_SLA_BREACH_SCAN,
        data: {},
        opts: {
          removeOnComplete: true,
          removeOnFail: 100,
        },
      },
    );
    this.logger.log('Lead SLA scan scheduled (every 15 minutes)');
  }
}
