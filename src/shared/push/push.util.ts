/** Env PEMs are often stored with literal `\n` escapes. */
export function normalizePem(value: string): string {
  return value.includes('\\n') ? value.replace(/\\n/g, '\n') : value;
}
