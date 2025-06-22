import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("bottom trace renders below top SMT pad", () => {
  const circuit = [
    {
      type: "pcb_trace",
      pcb_trace_id: "trace1",
      route: [
        { x: -1, y: 0, layer: "bottom", route_type: "wire", width: 0.2 },
        { x: 1, y: 0, layer: "bottom", route_type: "wire", width: 0.2 },
      ],
      source_trace_id: "source_trace_0",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad1",
      x: 0,
      y: 0,
      layer: "top" as const,
      shape: "rect",
      width: 1,
      height: 1,
    },
  ] as any

  expect(convertCircuitJsonToPcbSvg(circuit)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
