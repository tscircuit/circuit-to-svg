import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuitJson: any = [
  {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_0",
    route: [
      {
        route_type: "wire",
        x: -1.5,
        y: 0,
        width: 0.1,
        layer: "top",
      },
      {
        route_type: "wire",
        x: -1.5,
        y: 5,
        width: 0.1,
        layer: "top",
      },
      {
        route_type: "wire",
        x: -2,
        y: 2,
        width: 0.1,
        layer: "bottom",
      },
      {
        route_type: "wire",
        x: -0.5,
        y: 2,
        width: 0.1,
        layer: "bottom",
      },
      {
        route_type: "wire",
        x: -2.5,
        y: 3,
        width: 0.1,
        layer: "bottom",
      },
      {
        route_type: "wire",
        x: -0.3,
        y: 3,
        width: 0.1,
        layer: "bottom",
      },
    ],
    source_trace_id: "source_trace_0",
  },
]

test("bottom and top trace", () => {
  expect(convertCircuitJsonToPcbSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
})

test("top layer only", () => {
  expect(
    convertCircuitJsonToPcbSvg(circuitJson, { layer: "top" }),
  ).toMatchSvgSnapshot(import.meta.path + ".top")
})

test("bottom layer only", () => {
  expect(
    convertCircuitJsonToPcbSvg(circuitJson, { layer: "bottom" }),
  ).toMatchSvgSnapshot(import.meta.path + ".bottom")
})
