import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { setOtpEnqueue } from '@mykwatta/shared/twilio/otp.bridge';
import { QueueJobName, QueueName } from '../queue.constants';
import type { SendOtpJobData } from '../jobs/send-otp.job';

@Injectable()
export class OtpProducer implements OnModuleInit {
  private readonly logger = new Logger(OtpProducer.name);

  constructor(@InjectQueue(QueueName.OTP) private readonly otpQueue: Queue) {}

  onModuleInit(): void {
    setOtpEnqueue((phoneNumber, code) =>
      this.enqueue({ phoneNumber, code }).then(() => undefined),
    );
  }

  async enqueue(data: SendOtpJobData): Promise<string> {
    try {
      const job = await this.otpQueue.add(QueueJobName.SEND_OTP, data);
      if (!job.id) {
        throw AppException.queue('OTP job was created without an id');
      }
      return job.id;
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to enqueue OTP: ${reason}`);
      throw AppException.queue('Failed to enqueue OTP job', { reason });
    }
  }
}
