export function getStringProperty(
  value: object,
  key: string,
): string | undefined {
  const propertyValue = (value as Record<string, unknown>)[key]
  if (typeof propertyValue !== "string") return undefined
  return propertyValue
}
