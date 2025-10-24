export const toNumeric = (
  value: number | string | null | undefined,
): number | undefined => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}
