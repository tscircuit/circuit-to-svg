import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const copperLayers = [
  "top",
  "inner1",
  "inner2",
  "inner3",
  "inner4",
  "inner5",
  "inner6",
  "bottom",
] as const

const circuitJson: any[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
  },
  ...copperLayers.map((layer, index) => ({
    type: "pcb_trace",
    pcb_trace_id: `trace_${layer}`,
    source_trace_id: `source_trace_${layer}`,
    route: [
      {
        route_type: "wire",
        x: -8,
        y: -7 + index * 2,
        width: 0.4,
        layer,
      },
      {
        route_type: "wire",
        x: 8,
        y: -7 + index * 2,
        width: 0.4,
        layer,
      },
    ],
  })),
]

test("renders traces across eight copper layers", () => {
  expect(convertCircuitJsonToPcbSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
