import { expect, test } from "bun:test"
import type { SchematicNetLabel } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("top-anchored net label text direction", () => {
  const circuitJson: SchematicNetLabel[] = [
    {
      type: "schematic_net_label",
      source_net_id: "source_net_0",
      schematic_net_label_id: "schematic_net_label_0",
      center: { x: 0, y: -0.5 },
      anchor_position: { x: 0, y: 0 },
      anchor_side: "top",
      text: "U2_DSG",
    },
  ]

  const svg = convertCircuitJsonToSchematicSvg(circuitJson)
  const rotationMatch = svg.match(
    /class="net-label-text sch-net-label-text"[^>]*transform="rotate\(([-\d.]+)/,
  )

  expect(Number(rotationMatch?.[1])).toBe(90)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
