import { AppException } from '@mykwatta/core/common/exceptions/app.exception';

type OtpEnqueue = (phoneNumber: string, code: string) => Promise<void>;

let enqueue: OtpEnqueue | null = null;

export function setOtpEnqueue(next: OtpEnqueue): void {
  enqueue = next;
}

/** Used by Better Auth phoneNumber.sendOTP (outside Nest DI). */
export async function enqueueOtp(
  phoneNumber: string,
  code: string,
): Promise<void> {
  if (!enqueue) {
    throw AppException.external(
      'OTP enqueue is not initialized. Ensure QueueModule (OtpProducer) has booted',
    );
  }
  await enqueue(phoneNumber, code);
}
