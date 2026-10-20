import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbHoleWithPolygonPad } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

test.failing("polygon pads and offset drills at 0 and 90 degrees", async () => {
  const pad: PcbHoleWithPolygonPad = {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "polygon_pad_0",
    shape: "hole_with_polygon_pad",
    x: -4,
    y: 0,
    hole_shape: "pill",
    hole_width: 1.5,
    hole_height: 0.6,
    hole_offset_x: 0.9,
    hole_offset_y: 0.1,
    pad_outline: [
      { x: -2, y: -0.75 },
      { x: 2, y: -0.75 },
      { x: 2, y: 1.25 },
      { x: -0.5, y: 1.25 },
      { x: -0.5, y: 0.75 },
      { x: -2, y: 0.75 },
    ],
    layers: ["top", "bottom"],
    port_hints: ["pin12"],
  }
  const rotatedPad: PcbHoleWithPolygonPad = {
    ...pad,
    pcb_plated_hole_id: "polygon_pad_90",
    x: 4,
    ccw_rotation: 90,
  }
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 20,
      height: 12,
      num_layers: 2,
      thickness: 1.6,
      material: "fr4",
    },
    pad,
    rotatedPad,
    ...[-4, 4].map(
      (x, index): AnyCircuitElement => ({
        type: "pcb_note_text",
        pcb_note_text_id: `rotation_label_${index}`,
        text: index === 0 ? "0 degrees" : "90 degrees",
        anchor_position: { x, y: -3 },
        anchor_alignment: "center",
        font_size: 0.6,
        font: "tscircuit2024",
        layer: "top",
      }),
    ),
  ]
  const original = structuredClone(circuitJson)

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    showPinNumbers: true,
  })
  await expect(svg).toMatchSvgSnapshot(import.meta.path)

  const bounds = getComprehensivePcbBounds([rotatedPad])
  expect(bounds.minX).toBeCloseTo(2.75)
  expect(bounds.maxX).toBeCloseTo(4.75)
  expect(bounds.minY).toBeCloseTo(-2)
  expect(bounds.maxY).toBeCloseTo(2)
  expect(circuitJson).toEqual(original)
})
