export function sanitizeDimension(val: number, fallback = 0): number {
  if (!Number.isFinite(val) || Number.isNaN(val)) return fallback;
  return Math.max(0, val);
}
