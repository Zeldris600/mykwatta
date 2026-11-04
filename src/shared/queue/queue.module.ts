import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ApiConfigService } from '@mykwatta/core/config';
import { EmailProcessor, OtpProcessor } from './processors';
import { EmailProducer, OtpProducer } from './producers';
import { BULLMQ_DEFAULT_JOB_OPTIONS } from './queue.constants';
import { registerNamedQueues } from './register-queues';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ApiConfigService],
      useFactory: (config: ApiConfigService) => ({
        connection: {
          url: config.redisUrl,
          maxRetriesPerRequest: null,
        },
        defaultJobOptions: BULLMQ_DEFAULT_JOB_OPTIONS,
      }),
    }),
    ...registerNamedQueues(),
  ],
  providers: [EmailProducer, OtpProducer, EmailProcessor, OtpProcessor],
  exports: [BullModule, EmailProducer, OtpProducer],
})
export class QueueModule {}
