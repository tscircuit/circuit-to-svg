import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { parseSync } from "svgson"

test("custom symbol no-connect markers use source metadata even with a trace", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "source_1",
      name: "J1",
      ftype: "simple_chip",
    },
    {
      type: "schematic_component",
      schematic_component_id: "schematic_1",
      source_component_id: "source_1",
      center: { x: 0, y: 0 },
      size: { width: 2, height: 2 },
      is_box_with_pins: false,
    },
    {
      type: "schematic_rect",
      schematic_rect_id: "rect_1",
      schematic_component_id: "schematic_1",
      center: { x: 0, y: 0 },
      rotation: 0,
      is_dashed: false,
      width: 2,
      height: 2,
      stroke_width: 0.02,
      color: "#880000",
      is_filled: false,
    },
    {
      type: "source_port",
      source_port_id: "nc",
      name: "NC",
      source_component_id: "source_1",
      do_not_connect: true,
    },
    {
      type: "source_port",
      source_port_id: "open",
      name: "OPEN",
      source_component_id: "source_1",
    },
    {
      type: "source_port",
      source_port_id: "normal",
      name: "NORMAL",
      source_component_id: "source_1",
      do_not_connect: false,
    },
    {
      type: "source_trace",
      source_trace_id: "trace_1",
      connected_source_port_ids: ["nc", "normal"],
      connected_source_net_ids: [],
    },
  ]
  for (const [index, sourcePortId] of [
    "nc",
    "open",
    "normal",
    "missing",
  ].entries()) {
    circuitJson.push({
      type: "schematic_port",
      schematic_port_id: `port_${index}`,
      schematic_component_id: "schematic_1",
      source_port_id: sourcePortId,
      center: { x: -1.5, y: 0.75 - index * 0.5 },
      distance_from_component_edge: 0.5,
      facing_direction: "left",
      display_pin_label: sourcePortId,
    })
    circuitJson.push({
      type: "schematic_line",
      schematic_line_id: `line_${index}`,
      schematic_component_id: "schematic_1",
      x1: -1.5,
      y1: 0.75 - index * 0.5,
      x2: -1,
      y2: 0.75 - index * 0.5,
      color: "#880000",
      stroke_width: 0.02,
      is_dashed: false,
    })
  }
  const svg = convertCircuitJsonToSchematicSvg(circuitJson, { drawPorts: true })
  const nodes = parseSync(svg).children
  const markers = nodes.filter(
    (node) => node.attributes.class === "sch-port-no-connect",
  )
  expect(markers.map((node) => node.attributes["data-source-port-id"])).toEqual(
    ["nc"],
  )
  expect(
    nodes.filter((node) =>
      node.attributes.class?.includes("sch-port-indicator"),
    ),
  ).toHaveLength(3)
  expect(convertCircuitJsonToSchematicSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
