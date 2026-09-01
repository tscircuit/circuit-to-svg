import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbDebugObject } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getPcbDebugObjectLabelLayouts } from "lib/pcb/svg-object-fns/create-svg-objects-from-pcb-debug-object"
import { identity } from "transformation-matrix"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 20,
    height: 14,
    material: "fr4",
    num_layers: 2,
    thickness: 1.6,
  },
  {
    type: "pcb_debug_object",
    pcb_debug_object_id: "pcb_debug_object_rect",
    shape: "rect",
    center: { x: -3, y: 2 },
    size: { width: 6, height: 4 },
    label: "phase 1 bounds",
  },
  {
    type: "pcb_debug_object",
    pcb_debug_object_id: "pcb_debug_object_line",
    shape: "line",
    start: { x: -6, y: -4 },
    end: { x: 6, y: 4 },
    label: "candidate route",
  },
  {
    type: "pcb_debug_object",
    pcb_debug_object_id: "pcb_debug_object_point",
    shape: "point",
    center: { x: 4, y: -3 },
    label: "breakout",
  },
]

test("PCB debug objects are opt-in", () => {
  const hiddenSvg = convertCircuitJsonToPcbSvg(circuitJson)
  const shownSvg = convertCircuitJsonToPcbSvg(circuitJson, {
    showDebugObjects: true,
  })

  expect(hiddenSvg).not.toContain('data-type="pcb_debug_object"')
  expect(shownSvg.match(/data-type="pcb_debug_object"/g)).toHaveLength(3)
  expect(shownSvg).toContain("phase 1 bounds")
  expect(shownSvg).toContain("candidate route")
  expect(shownSvg).toContain("breakout")
  expect(shownSvg).toMatchSvgSnapshot(import.meta.path)
})

test("debug styles scale with the output viewport", () => {
  const smallSvg = convertCircuitJsonToPcbSvg(circuitJson, {
    width: 400,
    height: 300,
    showDebugObjects: true,
  })
  const largeSvg = convertCircuitJsonToPcbSvg(circuitJson, {
    width: 1200,
    height: 900,
    showDebugObjects: true,
  })

  expect(smallSvg).toContain('font-size="10"')
  expect(smallSvg).toContain('stroke-width="1"')
  expect(largeSvg).toContain('font-size="18"')
  expect(largeSvg).toContain('stroke-width="1.8"')
})

const collisionTestStyle = {
  fontSize: 20,
  strokeWidth: 1,
  dashLength: 4,
  labelGap: 5,
  pointRadius: 3,
}

const createDebugRect = ({
  id,
  x,
  label,
}: {
  id: string
  x: number
  label: string
}): PcbDebugObject => ({
  type: "pcb_debug_object",
  pcb_debug_object_id: id,
  shape: "rect",
  center: { x, y: 5 },
  size: { width: 10, height: 10 },
  label,
})

test("overlapping debug labels shrink before changing rectangle sides", () => {
  const layouts = getPcbDebugObjectLabelLayouts({
    debugObjects: [
      createDebugRect({ id: "a", x: 5, label: "AAAAA" }),
      createDebugRect({ id: "b", x: 45, label: "BBBBB" }),
    ],
    transform: identity(),
    style: collisionTestStyle,
  })

  expect(layouts.get("a")).toMatchObject({ fontSize: 10, side: "top" })
  expect(layouts.get("b")).toMatchObject({ fontSize: 10, side: "top" })
})

test("rectangle debug labels move outside another side when shrinking is insufficient", () => {
  const layouts = getPcbDebugObjectLabelLayouts({
    debugObjects: [
      createDebugRect({ id: "a", x: 5, label: "AAAAA" }),
      createDebugRect({ id: "b", x: 5, label: "BBBBB" }),
    ],
    transform: identity(),
    style: collisionTestStyle,
  })

  expect(layouts.get("a")).toMatchObject({
    x: 0,
    y: -5,
    fontSize: 10,
    side: "top",
  })
  expect(layouts.get("b")).toMatchObject({
    x: 15,
    y: 10,
    fontSize: 10,
    side: "right",
  })
})
