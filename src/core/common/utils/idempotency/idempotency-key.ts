export function normalizeIdempotencyKey(raw: string): string {
  return raw.trim().toLowerCase();
}
