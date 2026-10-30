import { any_circuit_element, type AnyCircuitElement } from "circuit-json"

export async function readBeagleboneProcessor(
  sheet: "03" | "04",
): Promise<AnyCircuitElement[]> {
  const circuitJson: AnyCircuitElement[] = await Bun.file(
    new URL(`./beaglebone-processor-${sheet}.json`, import.meta.url),
  ).json()
  return circuitJson.map((element) => any_circuit_element.parse(element))
}
