import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("polygon smtpad shape", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "board0",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    {
      type: "pcb_smtpad",
      layer: "top" as const,
      shape: "polygon" as const,
      points: [
        { x: -2, y: 0 },
        { x: -1, y: 1.5 },
        { x: 1, y: 1.5 },
        { x: 2, y: 0 },
        { x: 1, y: -1.5 },
        { x: -1, y: -1.5 },
      ],
      pcb_smtpad_id: "polygon_pad_0",
    },
  ])
  expect(result).toMatchSvgSnapshot(import.meta.path)
})

test("polygon smtpad with solder mask coverage (capacitive touch)", () => {
  // Polygon smtpads with is_covered_with_solder_mask=true are used for
  // capacitive touch sensors — the solder mask acts as the dielectric layer.
  const result = convertCircuitJsonToPcbSvg(
    [
      {
        type: "pcb_board",
        pcb_board_id: "board0",
        center: { x: 0, y: 0 },
        width: 20,
        height: 10,
        material: "fr4",
        num_layers: 2,
        thickness: 1.6,
      },
      // Diamond-shaped touch pads arranged as a linear slider
      ...[-3, 0, 3].map((x, i) => ({
        type: "pcb_smtpad" as const,
        layer: "top" as const,
        shape: "polygon" as const,
        points: [
          { x: 0, y: 2 },
          { x: 1.5, y: 0 },
          { x: 0, y: -2 },
          { x: -1.5, y: 0 },
        ],
        x: x,
        y: 0,
        pcb_smtpad_id: `touch_pad_${i}`,
        is_covered_with_solder_mask: true,
      })),
    ],
    { showSolderMask: true },
  )
  expect(result).toMatchSvgSnapshot(import.meta.path, "soldermask-covered")
})
