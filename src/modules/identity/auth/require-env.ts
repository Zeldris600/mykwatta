/**
 * Better Auth boots at import time (before Nest ConfigModule validation).
 * Fail fast with an explicit missing-key list instead of TypeError on undefined.
 */
export function requireEnv(keys: readonly string[]): Record<string, string> {
  const missing: string[] = [];
  const values: Record<string, string> = {};

  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (!value) {
      missing.push(key);
      continue;
    }
    values[key] = value;
  }

  if (missing.length > 0) {
    throw new Error(
      `[auth] Missing required environment variable(s): ${missing.join(', ')}. ` +
        `Set them in Dokploy (or .env) before starting the API/worker.`,
    );
  }

  return values;
}
