import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

// pcb_cutout with shape "path" is a slot of `slot_width` milled along `route`
// (see the PcbCutoutPath docs in circuit-json). A straight two-point slot has
// no area as a filled polygon, so it must be drawn as a stroke of slot_width.
const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  } as AnyCircuitElement,
  {
    type: "pcb_cutout",
    pcb_cutout_id: "straight_slot",
    shape: "path",
    route: [
      { x: -5, y: 0 },
      { x: 5, y: 0 },
    ],
    slot_width: 2,
  } as AnyCircuitElement,
]

test("pcb_cutout path is drawn as a slot of slot_width along its route", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    width: 220,
    height: 220,
  })
  // 20mm board + 1mm padding on each side into 220px => 10px per mm
  const slot = svg.match(/<path class="pcb-cutout pcb-cutout-path"[^>]*>/)?.[0]
  expect(slot).toBeDefined()
  expect(slot).toContain('fill="none"')
  expect(slot).toContain('stroke="#FF26E2"')
  expect(slot).toContain('stroke-width="20"')
})

test("pcb_cutout path with slot_length and space_between_slots is dashed", () => {
  const svg = convertCircuitJsonToPcbSvg(
    [
      circuitJson[0]!,
      {
        ...(circuitJson[1] as any),
        slot_length: 3,
        space_between_slots: 1,
        slot_corner_radius: 0,
      },
    ],
    { width: 220, height: 220 },
  )
  const slot = svg.match(/<path class="pcb-cutout pcb-cutout-path"[^>]*>/)?.[0]
  expect(slot).toContain('stroke-linecap="butt"')
  expect(slot).toContain('stroke-dasharray="30 10"')
})
