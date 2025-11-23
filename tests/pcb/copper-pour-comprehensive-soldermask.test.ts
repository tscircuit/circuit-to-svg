import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import type { AnyCircuitElement, PcbCopperPour } from "circuit-json"

test("comprehensive copper pour soldermask test with various shapes", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 60,
      height: 50,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    // Rectangular pour WITH soldermask (covered) - top left
    {
      type: "pcb_copper_pour",
      shape: "rect",
      pcb_copper_pour_id: "pour_rect_covered",
      layer: "top",
      center: { x: -20, y: 15 },
      width: 12,
      height: 8,
      covered_with_solder_mask: true,
    } as PcbCopperPour,
    // Rectangular pour WITHOUT soldermask (uncovered - will show as red copper) - top right
    {
      type: "pcb_copper_pour",
      shape: "rect",
      pcb_copper_pour_id: "pour_rect_uncovered",
      layer: "top",
      center: { x: 20, y: 15 },
      width: 12,
      height: 8,
      covered_with_solder_mask: false,
    } as PcbCopperPour,
    // Rotated rectangular pour WITH soldermask - bottom left
    {
      type: "pcb_copper_pour",
      shape: "rect",
      pcb_copper_pour_id: "pour_rotated_covered",
      layer: "top",
      center: { x: -20, y: -15 },
      width: 10,
      height: 6,
      rotation: 30,
      covered_with_solder_mask: true,
    } as PcbCopperPour,
    // Polygon pour WITH soldermask (cross/L-shape) - CENTERED
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_polygon_covered",
      shape: "polygon",
      layer: "top",
      points: [
        { x: -5, y: -10 },
        { x: 5, y: -10 },
        { x: 5, y: -5 },
        { x: 10, y: -5 },
        { x: 10, y: 5 },
        { x: 5, y: 5 },
        { x: 5, y: 10 },
        { x: -5, y: 10 },
        { x: -5, y: 5 },
        { x: -10, y: 5 },
        { x: -10, y: -5 },
        { x: -5, y: -5 },
      ],
      covered_with_solder_mask: true,
    } as PcbCopperPour,
    // Polygon pour WITHOUT soldermask (triangle) - bottom right
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_polygon_uncovered",
      shape: "polygon",
      layer: "top",
      points: [
        { x: 20, y: -20 },
        { x: 30, y: -10 },
        { x: 20, y: 0 },
      ],
      covered_with_solder_mask: false,
    } as PcbCopperPour,
  ]

  const result = convertCircuitJsonToPcbSvg(circuitJson, {
    showSolderMask: true,
  })
  expect(result).toMatchSvgSnapshot(import.meta.path)
})
