import "bun-match-svg"
import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "../../lib"

const circuitWithNetLabel: any[] = [
  {
    type: "schematic_trace",
    schematic_trace_id: "schematic_trace_1",
    source_trace_id: "source_trace_1",
    edges: [{ from: { x: 0, y: 0 }, to: { x: 1, y: 0 } }],
  },
  {
    type: "schematic_net_label",
    schematic_net_label_id: "net_label_1",
    source_net_id: "net_1",
    text: "GND",
    anchor_position: { x: 1, y: 0 },
    anchor_side: "right",
    center: { x: 1, y: 0 },
  },
]

test("net label SVG path gets data-source-net-id attribute", () => {
  const svg = convertCircuitJsonToSchematicSvg(circuitWithNetLabel)
  expect(svg).toContain('data-source-net-id="net_1"')
})

test("hover CSS rules are generated for source_net_id", () => {
  const svg = convertCircuitJsonToSchematicSvg(circuitWithNetLabel)
  expect(svg).toContain('[data-source-net-id="net_1"]')
})

test("trace gets data-source-trace-id attribute when source_trace_id is present", () => {
  const svg = convertCircuitJsonToSchematicSvg(circuitWithNetLabel)
  expect(svg).toContain('data-source-trace-id="source_trace_1"')
})

test("schematic SVG snapshot with net-label hover attributes", () => {
  const svg = convertCircuitJsonToSchematicSvg(circuitWithNetLabel)
  expect(svg).toMatchSvgSnapshot(import.meta.path, "net-label-hover-highlight")
})
