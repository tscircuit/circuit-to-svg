import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb trace bounds handle through_pad route points", () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace0",
      route: [
        {
          route_type: "wire",
          x: -5,
          y: -5,
          width: 0.15,
          layer: "top",
        },
        {
          route_type: "through_pad",
          start: { x: -5, y: -5 },
          end: { x: -5, y: -5 },
          start_layer: "top",
          end_layer: "bottom",
          width: 0.15,
        },
        {
          route_type: "wire",
          x: 5,
          y: 5,
          width: 0.15,
          layer: "bottom",
        },
      ],
    },
  ] as CircuitJson

  const svg = convertCircuitJsonToPcbSvg(circuitJson)

  expect(svg).toContain('data-type="pcb_board"')
  expect(svg).toContain('data-type="pcb_trace"')
})
