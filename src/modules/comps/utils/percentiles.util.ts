/** Linear interpolation percentile on a sorted numeric sample. */
export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) {
    return 0;
  }
  const idx = (sortedAsc.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) {
    return sortedAsc[lo] ?? 0;
  }
  const lower = sortedAsc[lo] ?? 0;
  const upper = sortedAsc[hi] ?? lower;
  return lower + (upper - lower) * (idx - lo);
}
