import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { getSchematicBoundsFromCircuitJson } from "lib/sch/get-schematic-bounds-from-circuit-json"
import referenceCircuit from "./assets/cc2340r5-reference/circuit.json"

test("CC2340R5 reference renders its complete circuit and 13 wired exported terminals", () => {
  const json = referenceCircuit as AnyCircuitElement[]
  const group = json.find(
    (element) => element.type === "schematic_group" && element.show_boundary,
  )!
  if (group.type !== "schematic_group")
    throw new Error("Missing CC2340R5 boundary")
  const ports = json.filter(
    (element) =>
      element.type === "schematic_port" &&
      element.schematic_group_id === group.schematic_group_id,
  )
  const svg = convertCircuitJsonToSchematicSvg(json, {
    width: 1600,
    height: 1250,
  })
  expect(
    json.filter((element) => element.type === "schematic_component"),
  ).toHaveLength(27)
  expect(svg.match(/class="sch-group-boundary"/g)).toHaveLength(1)
  expect(svg.match(/class="sch-group-port-terminal"/g)).toHaveLength(13)
  for (const port of ports) {
    if (port.type !== "schematic_port") continue
    expect(svg).toContain(`data-source-port-id="${port.source_port_id}"`)
    expect(svg).toContain(port.display_pin_label!)
  }
  const bounds = getSchematicBoundsFromCircuitJson(json, 0)
  expect(bounds.minX).toBeLessThan(group.center.x - group.width / 2 - 0.6)
  expect(bounds.maxX).toBeGreaterThanOrEqual(group.center.x + group.width / 2)
  expect(bounds.maxY).toBeGreaterThanOrEqual(group.center.y + group.height / 2)
  expect(bounds.minY).toBeLessThanOrEqual(group.center.y - group.height / 2)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
