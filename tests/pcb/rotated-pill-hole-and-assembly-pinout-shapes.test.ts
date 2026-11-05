import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertCircuitJsonToAssemblySvg,
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToPinoutSvg,
} from "lib/index"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
    material: "fr4",
    num_layers: 2,
    thickness: 1.6,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_rotated_pill",
    layer: "top",
    shape: "rotated_pill",
    x: -4,
    y: 4,
    width: 2.4,
    height: 1.2,
    radius: 0.6,
    ccw_rotation: 30,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_corner_radius",
    layer: "top",
    shape: "rect",
    x: 4,
    y: 4,
    width: 2,
    height: 1.2,
    corner_radius: 0.25,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "pcb_hole_rect",
    hole_shape: "rect",
    x: -5,
    y: -4,
    hole_width: 2,
    hole_height: 1.2,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "pcb_hole_pill",
    hole_shape: "pill",
    x: 0,
    y: -4,
    hole_width: 2.4,
    hole_height: 1.2,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "pcb_hole_rotated_pill",
    hole_shape: "rotated_pill",
    x: 5,
    y: -4,
    hole_width: 2.4,
    hole_height: 1.2,
    ccw_rotation: 45,
    is_covered_with_solder_mask: true,
    soldermask_margin: 0.2,
  },
]

test("rotated_pill pcb_hole positive soldermask cutout includes translate and rotate transform", () => {
  const pcbSvg = convertCircuitJsonToPcbSvg(circuitJson, {
    showSolderMask: true,
  })

  const cutoutMatch = pcbSvg.match(/<path class="pcb-soldermask-cutout"[^>]*>/)
  const holeMatches = [
    ...pcbSvg.matchAll(/<path class="pcb-hole"[^>]*transform="([^"]+)"[^>]*>/g),
  ]

  expect(cutoutMatch).not.toBeNull()
  expect(holeMatches.length).toBe(1)
  expect(cutoutMatch?.[0]).toContain(`transform="${holeMatches[0]?.[1]}"`)
  expect(cutoutMatch?.[0]).toContain("rotate(-45)")
})

test("assembly and pinout SVGs render rotated_pill pads, corner_radius pads, and rect/pill/rotated_pill holes", () => {
  const assemblySvg = convertCircuitJsonToAssemblySvg(circuitJson)
  const pinoutSvg = convertCircuitJsonToPinoutSvg(circuitJson)

  const assemblyPads = [...assemblySvg.matchAll(/class="assembly-pad"/g)]
  const assemblyHoles = [...assemblySvg.matchAll(/class="assembly-hole"/g)]
  expect(assemblyPads.length).toBe(2)
  expect(assemblyHoles.length).toBe(3)
  expect(assemblySvg).toContain("rotate(-30)")
  expect(assemblySvg).toContain("rotate(-45)")

  const pinoutPads = [...pinoutSvg.matchAll(/class="pinout-pad"/g)]
  const pinoutHoles = [...pinoutSvg.matchAll(/class="pinout-hole"/g)]
  expect(pinoutPads.length).toBe(2)
  expect(pinoutHoles.length).toBe(3)
  expect(pinoutSvg).toContain("rotate(-30)")
  expect(pinoutSvg).toContain("rotate(-45)")
})
