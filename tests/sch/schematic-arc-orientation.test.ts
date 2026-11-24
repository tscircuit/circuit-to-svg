import { expect, test } from "bun:test"
import type { SchematicArc } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

const getArcPathData = (svg: string, arcId: string) => {
  const tag = svg.match(
    new RegExp(`<path[^>]*data-schematic-arc-id="${arcId}"[^>]*>`),
  )?.[0]
  return tag?.match(/\sd="([^"]+)"/)?.[1]
}

const parseArcPath = (d: string | undefined) => {
  const nums = d!.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
  // M x1 y1 A rx ry rotation large-arc-flag sweep-flag x2 y2
  return {
    startX: nums[0]!,
    startY: nums[1]!,
    rx: nums[2]!,
    largeArcFlag: nums[5]!,
    sweepFlag: nums[6]!,
    endX: nums[7]!,
    endY: nums[8]!,
  }
}

const makeArc = (
  overrides: Partial<SchematicArc> & { schematic_arc_id: string },
): SchematicArc => ({
  type: "schematic_arc",
  center: { x: 10, y: 10 },
  radius: 2,
  start_angle_degrees: 0,
  end_angle_degrees: 90,
  direction: "counterclockwise",
  stroke_width: 0.05,
  color: "#000000",
  is_dashed: false,
  ...overrides,
})

test("counterclockwise arc from 270 to 90 degrees renders the right semicircle", () => {
  // In circuit space (+Y up), going counterclockwise from 270 degrees reaches
  // 90 degrees through 0 degrees, which is the right semicircle. The schematic
  // projection flips Y, so the top point lands above the bottom point on
  // screen: the start must be the lower endpoint and the end the upper one.
  const svg = convertCircuitJsonToSchematicSvg(
    [
      makeArc({
        schematic_arc_id: "arc_ccw_right",
        start_angle_degrees: 270,
        end_angle_degrees: 90,
      }),
    ],
    { width: 400, height: 400 },
  )

  const arc = parseArcPath(getArcPathData(svg, "arc_ccw_right"))
  expect(arc.sweepFlag).toBe(0)
  expect(arc.startX).toBeCloseTo(arc.endX, 6)
  expect(arc.startY).toBeGreaterThan(arc.endY)
})

test("clockwise arc from 90 to 270 degrees renders the right semicircle", () => {
  const svg = convertCircuitJsonToSchematicSvg(
    [
      makeArc({
        schematic_arc_id: "arc_cw_right",
        start_angle_degrees: 90,
        end_angle_degrees: 270,
        direction: "clockwise",
      }),
    ],
    { width: 400, height: 400 },
  )

  const arc = parseArcPath(getArcPathData(svg, "arc_cw_right"))
  expect(arc.sweepFlag).toBe(1)
  expect(arc.startX).toBeCloseTo(arc.endX, 6)
  expect(arc.startY).toBeLessThan(arc.endY)
})

test("schematic arc orientation", () => {
  const circuitJson: SchematicArc[] = [
    // Quarter arc in the circuit-space upper right of its center, which must
    // stay in the upper right after projection (not mirrored to lower right).
    makeArc({
      schematic_arc_id: "arc_ccw_quarter",
      center: { x: 4, y: 4 },
      radius: 1.5,
    }),
    // Right semicircle: counterclockwise from bottom to top through east.
    makeArc({
      schematic_arc_id: "arc_ccw_semicircle",
      center: { x: 8, y: 4 },
      radius: 1.5,
      start_angle_degrees: 270,
      end_angle_degrees: 90,
    }),
    // Upper semicircle: counterclockwise from left to right through top.
    makeArc({
      schematic_arc_id: "arc_ccw_upper",
      center: { x: 12, y: 4 },
      radius: 1.5,
      start_angle_degrees: 180,
      end_angle_degrees: 360,
    }),
    // Left semicircle: clockwise from bottom to top through west.
    makeArc({
      schematic_arc_id: "arc_cw_left",
      center: { x: 4, y: 7 },
      radius: 1.5,
      start_angle_degrees: 270,
      end_angle_degrees: 90,
      direction: "clockwise",
      color: "#cc0000",
    }),
  ]

  expect(
    convertCircuitJsonToSchematicSvg(circuitJson, { width: 800, height: 600 }),
  ).toMatchSvgSnapshot(import.meta.path)
})
