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

test("clips a trace whose route runs from inside the pour to outside", () => {
  const pour: PcbCopperPour = {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour1",
    layer: "top",
    shape: "rect",
    center: { x: 0, y: 0 },
    width: 4,
    height: 4,
    covered_with_solder_mask: true,
  }
  const insideToOutsideTrace: PcbTrace = {
    ...trace,
    route: [
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
        x: 4,
        y: 0,
        width: 0.2,
        layer: "top",
      },
    ],
  }
  const circuitJson: AnyCircuitElement[] = [insideToOutsideTrace, pour]
  const svgObjects = createSvgObjectsFromPcbTrace(insideToOutsideTrace, {
    transform: identity(),
    colorMap: DEFAULT_PCB_COLOR_MAP,
    circuitJson,
  })

  expect(svgObjects).toHaveLength(1)
  expect(svgObjects[0]?.attributes?.d).toBe("M 2 0 L 4 0")
})

test("clips a trace at a curved BRep edge", () => {
  const pour: PcbCopperPour = {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour1",
    layer: "top",
    shape: "brep",
    brep_shape: {
      outer_ring: {
        vertices: [
          { x: -2, y: 0, bulge: 1 },
          { x: 2, y: 0, bulge: 1 },
        ],
      },
      inner_rings: [],
    },
    covered_with_solder_mask: true,
  }
  const traceAtY1: PcbTrace = {
    ...trace,
    route: [
      {
        route_type: "wire",
        x: -4,
        y: 1,
        width: 0.2,
        layer: "top",
      },
      {
        route_type: "wire",
        x: 0,
        y: 1,
        width: 0.2,
        layer: "top",
        copper_pour_id: "pour1",
        is_inside_copper_pour: true,
      },
    ],
  }
  const circuitJson: AnyCircuitElement[] = [traceAtY1, pour]
  const svgObjects = createSvgObjectsFromPcbTrace(traceAtY1, {
    transform: identity(),
    colorMap: DEFAULT_PCB_COLOR_MAP,
    circuitJson,
  })

  expect(svgObjects).toHaveLength(1)
  expect(getHorizontalPathEndX(svgObjects[0]?.attributes?.d)).toBeCloseTo(
    -Math.sqrt(3),
    8,
  )
})

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
  const holeToPourTrace: PcbTrace = {
    ...trace,
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
  const circuitJson: AnyCircuitElement[] = [holeToPourTrace, pour]
  const svgObjects = createSvgObjectsFromPcbTrace(holeToPourTrace, {
    transform: identity(),
    colorMap: DEFAULT_PCB_COLOR_MAP,
    circuitJson,
  })

  expect(svgObjects).toHaveLength(1)
  expect(svgObjects[0]?.attributes?.d).toBe("M 0 0 L 1 0")
})

function getHorizontalPathEndX(pathData: string | undefined): number {
  const match = pathData?.match(/^M [-\d.]+ [-\d.]+ L ([-\d.]+) [-\d.]+$/)
  if (!match?.[1]) throw new Error(`Unexpected path data: ${pathData}`)
  return Number(match[1])
}
