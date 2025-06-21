import type { AnyCircuitElement } from "circuit-json"

export function getSoftwareUsedString(
  circuitJson: AnyCircuitElement[],
): string | undefined {
  const metadata = circuitJson.find(
    (e) =>
      (e as any).type === "project_software_metadata" ||
      (e as any).type === "source_project_metadata",
  ) as { software_used_string?: string } | undefined

  return metadata?.software_used_string
}
