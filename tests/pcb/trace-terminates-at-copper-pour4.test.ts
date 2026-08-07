import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbCopperPour, PcbTrace } from "circuit-json"
import { DEFAULT_PCB_COLOR_MAP } from "lib/pcb/colors"
import { createSvgObjectsFromPcbTrace } from "lib/pcb/svg-object-fns/create-svg-objects-from-pcb-trace"
import { identity } from "transformation-matrix"

test("terminates a trace leaving an inner BRep ring at the hole boundary", () => {
  const pour: PcbCopperPour = {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour1",
    layer: "top",
    shape: "brep",
    brep_shape: {
      outer_ring: {
        vertices: [
          { x: -5, y: -5 },
          { x: 5, y: -5 },
          { x: 5, y: 5 },
          { x: -5, y: 5 },
        ],
      },
      inner_rings: [
        {
          vertices: [
            { x: -1, y: -1 },
            { x: 1, y: -1 },
            { x: 1, y: 1 },
            { x: -1, y: 1 },
          ],
        },
      ],
    },
    covered_with_solder_mask: true,
  }
  const trace: PcbTrace = {
    type: "pcb_trace",
    pcb_trace_id: "trace1",
    route: [
      {
        route_type: "wire",
        x: 0,
        y: 0,
        width: 0.2,
        layer: "top",
      },
      {
        route_type: "wire",
        x: 3,
        y: 0,
        width: 0.2,
        layer: "top",
        copper_pour_id: "pour1",
        is_inside_copper_pour: true,
      },
    ],
  }
  const circuitJson: AnyCircuitElement[] = [trace, pour]
  const svgObjects = createSvgObjectsFromPcbTrace(trace, {
    transform: identity(),
    colorMap: DEFAULT_PCB_COLOR_MAP,
    circuitJson,
  })

  expect(svgObjects).toHaveLength(1)
  expect(svgObjects[0]?.attributes?.d).toBe("M 0 0 L 1 0")
})
