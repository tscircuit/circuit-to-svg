import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { symbols } from "schematic-symbols"

test("reproduces scaled resistor offsets in all four orientations", () => {
  const circuitJson: CircuitJson = []
  for (const [row, direction] of ["right", "left", "up", "down"].entries()) {
    for (const [column, scale] of [0.5, 1, 2].entries()) {
      const id = `${direction}-${scale}`
      const symbolName = `boxresistor_${direction}` as keyof typeof symbols
      const symbol = symbols[symbolName]!
      const center = { x: column * 4, y: -row * 4 }
      circuitJson.push(
        {
          type: "source_component",
          source_component_id: id,
          name: id,
          ftype: "simple_resistor",
          resistance: 1000,
        },
        {
          type: "schematic_component",
          schematic_component_id: id,
          source_component_id: id,
          center,
          is_box_with_pins: true,
          size: { width: 2, height: 2 },
          symbol_name: symbolName,
          symbol_display_value: "1kΩ",
        },
      )
      for (const [index, port] of symbol.ports.entries()) {
        const portId = `${id}-${index}`
        const point = {
          x: center.x + port.x * scale,
          y: center.y + port.y * scale,
        }
        circuitJson.push(
          {
            type: "source_port",
            source_port_id: portId,
            source_component_id: id,
            name: `pin${index + 1}`,
            pin_number: index + 1,
          },
          {
            type: "schematic_port",
            schematic_port_id: portId,
            source_port_id: portId,
            schematic_component_id: id,
            center: point,
          },
          {
            type: "source_trace",
            source_trace_id: portId,
            connected_source_port_ids: [portId],
            connected_source_net_ids: [],
          },
          {
            type: "schematic_trace",
            schematic_trace_id: portId,
            junctions: [],
            source_trace_id: portId,
            edges: [
              {
                from: point,
                to: {
                  x: center.x + port.x * (scale + 2),
                  y: center.y + port.y * (scale + 2),
                },
              },
            ],
          },
        )
      }
    }
  }
  const original = JSON.stringify(circuitJson)
  const svg = convertCircuitJsonToSchematicSvg(circuitJson, {
    width: 1000,
    height: 1000,
  })
  expect(JSON.stringify(circuitJson)).toBe(original)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
