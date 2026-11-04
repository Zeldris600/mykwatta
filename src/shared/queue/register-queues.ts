import { BullModule } from '@nestjs/bullmq';
import type { DynamicModule } from '@nestjs/common';
import { QueueName } from './queue.constants';

/** Registers every `QueueName` with BullMQ (used by `QueueModule`). */
export function registerNamedQueues(): DynamicModule[] {
  const names = Object.values(QueueName);
  if (names.length === 0) {
    return [];
  }

  return [BullModule.registerQueue(...names.map((name) => ({ name })))];
}
