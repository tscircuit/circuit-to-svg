import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("bottom trace renders above top copper pour", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board0",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      num_layers: 2,
      material: "fr4",
      thickness: 1.6,
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace0",
      source_trace_id: "source_trace0",
      route: [
        {
          route_type: "wire",
          x: -4,
          y: 0,
          width: 0.3,
          layer: "bottom",
        },
        {
          route_type: "wire",
          x: 4,
          y: 0,
          width: 0.3,
          layer: "bottom",
        },
      ],
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour0",
      layer: "top",
      shape: "rect",
      center: { x: 0, y: 0 },
      width: 8,
      height: 8,
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson)
  const copperPourIndex = svg.indexOf('data-type="pcb_copper_pour"')
  const traceIndex = svg.indexOf('data-type="pcb_trace"')

  expect(copperPourIndex).toBeGreaterThan(-1)
  expect(traceIndex).toBeGreaterThan(copperPourIndex)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
