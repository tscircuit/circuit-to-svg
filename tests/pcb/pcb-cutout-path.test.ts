import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib/pcb/convert-circuit-json-to-pcb-svg"
import type { AnyCircuitElement } from "circuit-json"

test("pcb_cutout with dashed path renders multiple slots", () => {
  const circuitJson: AnyCircuitElement[] = []

  circuitJson.push({
    type: "pcb_board",
    pcb_board_id: "board1",
    width: 20,
    height: 20,
    center: { x: 0, y: 0 },
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  } as AnyCircuitElement)

  circuitJson.push({
    type: "pcb_cutout",
    pcb_cutout_id: "cutout1",
    shape: "path",
    route: [
      { x: -9, y: 4 },
      { x: 9, y: 4 },
    ],
    slot_width: 6,
    slot_length: 1.5,
    space_between_slots: 1,
    slot_corner_radius: 0.7,
  } as AnyCircuitElement)
  circuitJson.push({
    type: "pcb_cutout",
    pcb_cutout_id: "cutout1",
    shape: "path",
    route: [
      { x: -9, y: -4 },
      { x: 9, y: -4 },
    ],
    slot_width: 6,
    slot_length: 1.5,
    space_between_slots: 1,
  } as AnyCircuitElement)

  const svgContent = convertCircuitJsonToPcbSvg(circuitJson)

  expect(svgContent).toMatchSvgSnapshot(import.meta.path)
})
