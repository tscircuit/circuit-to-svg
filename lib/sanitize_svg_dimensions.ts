export function sanitizeSvgDimension(val: number | undefined | null): number {
  if (val === null || val === undefined || Number.isNaN(val) || val < 0) {
    return 0;
  }
  return val;
}
