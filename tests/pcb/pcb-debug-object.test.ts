import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

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
