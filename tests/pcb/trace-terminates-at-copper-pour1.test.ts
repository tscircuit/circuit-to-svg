import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbCopperPour, PcbTrace } from "circuit-json"
import { DEFAULT_PCB_COLOR_MAP } from "lib/pcb/colors"
import { createSvgObjectsFromPcbTrace } from "lib/pcb/svg-object-fns/create-svg-objects-from-pcb-trace"
import { identity } from "transformation-matrix"

const trace: PcbTrace = {
  type: "pcb_trace",
  pcb_trace_id: "trace1",
  route: [
    {
      route_type: "wire",
      x: -4,
      y: 0,
      width: 0.2,
      layer: "top",
    },
    {
      route_type: "wire",
      x: 0,
      y: 0,
      width: 0.2,
      layer: "top",
      copper_pour_id: "pour1",
      is_inside_copper_pour: true,
    },
    {
      route_type: "wire",
      x: 1,
      y: 0,
      width: 0.2,
      layer: "top",
      copper_pour_id: "pour1",
      is_inside_copper_pour: true,
    },
  ],
}

test.each([
  {
    name: "rectangular pour",
    pour: {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour1",
      layer: "top",
      shape: "rect",
      center: { x: 0, y: 0 },
      width: 4,
      height: 4,
      covered_with_solder_mask: true,
    } satisfies PcbCopperPour,
    expectedEndX: -2,
  },
  {
    name: "rotated rectangular pour",
    pour: {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour1",
      layer: "top",
      shape: "rect",
      center: { x: 0, y: 0 },
      width: 2,
      height: 2,
      rotation: 45,
      covered_with_solder_mask: true,
    } satisfies PcbCopperPour,
    expectedEndX: -Math.SQRT2,
  },
  {
    name: "polygon pour",
    pour: {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour1",
      layer: "top",
      shape: "polygon",
      points: [
        { x: -2, y: -2 },
        { x: 2, y: -2 },
        { x: 2, y: 2 },
        { x: -2, y: 2 },
      ],
      covered_with_solder_mask: true,
    } satisfies PcbCopperPour,
    expectedEndX: -2,
  },
  {
    name: "BRep pour",
    pour: {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour1",
      layer: "top",
      shape: "brep",
      brep_shape: {
        outer_ring: {
          vertices: [
            { x: -2, y: -2 },
            { x: 2, y: -2 },
            { x: 2, y: 2 },
            { x: -2, y: 2 },
          ],
        },
        inner_rings: [],
      },
      covered_with_solder_mask: true,
    } satisfies PcbCopperPour,
    expectedEndX: -2,
  },
])(
  "terminates a trace at the boundary of a $name",
  ({ pour, expectedEndX }) => {
    const circuitJson: AnyCircuitElement[] = [trace, pour]
    const svgObjects = createSvgObjectsFromPcbTrace(trace, {
      transform: identity(),
      colorMap: DEFAULT_PCB_COLOR_MAP,
      circuitJson,
    })

    expect(svgObjects).toHaveLength(1)
    expect(getHorizontalPathEndX(svgObjects[0]?.attributes?.d)).toBeCloseTo(
      expectedEndX,
    )
  },
)

function getHorizontalPathEndX(pathData: string | undefined): number {
  const match = pathData?.match(/^M [-\d.]+ [-\d.]+ L ([-\d.]+) [-\d.]+$/)
  if (!match?.[1]) throw new Error(`Unexpected path data: ${pathData}`)
  return Number(match[1])
}
