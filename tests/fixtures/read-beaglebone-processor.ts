import {
  any_circuit_element,
  type AnyCircuitElement,
  schematic_port,
} from "circuit-json"

export async function readBeagleboneProcessor(
  sheet: "03" | "04",
): Promise<AnyCircuitElement[]> {
  const circuitJson: AnyCircuitElement[] = await Bun.file(
    new URL(`./beaglebone-processor-${sheet}.json`, import.meta.url),
  ).json()
  return circuitJson.map((element) => {
    const parsed = any_circuit_element.parse(element)
    // Keep optional font metadata while validating against the published schema.
    if (parsed.type === "schematic_port") {
      return schematic_port.passthrough().parse(element)
    }
    return parsed
  })
}
