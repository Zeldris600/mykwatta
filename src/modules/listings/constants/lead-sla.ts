/** Open org leads should receive a first response within this window. */
export const LEAD_SLA_MS = 24 * 60 * 60 * 1000;

export function leadSlaDueAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + LEAD_SLA_MS);
}
