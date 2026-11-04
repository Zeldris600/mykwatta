/**
 * BullMQ queue names. Pass these to registerQueue / @Processor / @InjectQueue — never raw strings.
 */
export enum QueueName {
  EMAIL = 'EMAIL',
  OTP = 'OTP',
  NOTIFICATIONS = 'NOTIFICATIONS',
  LEAD_DIGEST = 'LEAD_DIGEST',
  RENT_REMINDERS = 'RENT_REMINDERS',
  SAVED_SEARCH_MATCH = 'SAVED_SEARCH_MATCH',
  LEAD_SLA = 'LEAD_SLA',
}

/** Job names within a queue. */
export enum QueueJobName {
  SEND_EMAIL = 'SEND_EMAIL',
  SEND_OTP = 'SEND_OTP',
  DELIVER_NOTIFICATION = 'DELIVER_NOTIFICATION',
  RUN_LEAD_DIGEST = 'RUN_LEAD_DIGEST',
  RUN_RENT_REMINDERS = 'RUN_RENT_REMINDERS',
  MATCH_SAVED_SEARCHES = 'MATCH_SAVED_SEARCHES',
  RUN_SLA_BREACH_SCAN = 'RUN_SLA_BREACH_SCAN',
}

export const BULLMQ_DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1_000,
  },
  removeOnComplete: 1_000,
  removeOnFail: 5_000,
};
