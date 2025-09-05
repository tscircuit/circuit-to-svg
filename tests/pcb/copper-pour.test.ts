import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import type { AnyCircuitElement } from "circuit-json"

// Using "any" for PcbCopperPour to avoid typescript errors since the type is not in the dependency yet
type PcbCopperPour = any

test("pcb copper pours", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 50,
      height: 50,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    // Rectangular pour
    {
      type: "pcb_copper_pour",
      shape: "rect",
      pcb_copper_pour_id: "pour1",
      layer: "top",
      center: { x: -12, y: 12 },
      width: 10,
      height: 10,
    } as PcbCopperPour,
    // Rotated rectangular pour
    {
      type: "pcb_copper_pour",
      shape: "rect",
      pcb_copper_pour_id: "pour2",
      layer: "top",
      center: { x: 12, y: 12 },
      width: 10,
      height: 5,
      rotation: 45,
    } as PcbCopperPour,
    // Interesting polygon pour (plus-shape)
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour3",
      shape: "polygon",
      layer: "bottom",
      points: [
        { x: -2, y: -9 },
        { x: 2, y: -9 },
        { x: 2, y: -13 },
        { x: 6, y: -13 },
        { x: 6, y: -17 },
        { x: 2, y: -17 },
        { x: 2, y: -21 },
        { x: -2, y: -21 },
        // { x: -2, y: -17 },
        { x: -6, y: -17 },
        { x: -6, y: -13 },
        { x: -2, y: -13 },
      ],
    } as PcbCopperPour,
  ]
  const result = convertCircuitJsonToPcbSvg(soup)
  expect(result).toMatchSvgSnapshot(import.meta.path)
})
