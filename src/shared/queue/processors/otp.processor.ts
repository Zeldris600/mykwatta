import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { TwilioService } from '@mykwatta/shared/twilio';
import { QueueJobName, QueueName } from '../queue.constants';
import type { SendOtpJobData } from '../jobs/send-otp.job';

@Processor(QueueName.OTP)
export class OtpProcessor extends WorkerHost {
  private readonly logger = new Logger(OtpProcessor.name);

  constructor(private readonly twilio: TwilioService) {
    super();
  }

  async process(job: Job<SendOtpJobData>): Promise<void> {
    if ((job.name as QueueJobName) !== QueueJobName.SEND_OTP) {
      throw AppException.badRequest(`Unsupported OTP job: ${job.name}`);
    }

    await this.twilio.sendOtp(job.data.phoneNumber, job.data.code);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    this.logger.error(
      `OTP job failed id=${job?.id ?? 'unknown'}: ${error.message}`,
      error.stack,
    );
  }
}
