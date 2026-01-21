import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("knockout silkscreen text", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 30,
      height: 20,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    // Regular silkscreen text for comparison
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_regular",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: -8, y: 5 },
      anchor_alignment: "center",
      text: "REGULAR",
    },
    // Knockout silkscreen text
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_knockout",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 8, y: 5 },
      anchor_alignment: "center",
      text: "KNOCKOUT",
      is_knockout: true,
    },
    // Knockout with custom padding
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_knockout_padding",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 0, y: -2 },
      anchor_alignment: "center",
      text: "PADDED",
      is_knockout: true,
      knockout_padding: {
        left: "1mm",
        right: "1mm",
        top: "0.5mm",
        bottom: "0.5mm",
      },
    },
    // Knockout on bottom layer
    {
      type: "pcb_silkscreen_text",
      layer: "bottom",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_knockout_bottom",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 0, y: -7 },
      anchor_alignment: "center",
      text: "BOTTOM",
      is_knockout: true,
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path)
})

test("knockout silkscreen text with rotation", () => {
  const rotatedResult = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 20,
      height: 20,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    // Knockout with 45 degree rotation
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_rotated",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "ROTATED",
      is_knockout: true,
      ccw_rotation: 45,
    },
    // Knockout with 90 degree rotation
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_rotated_90",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 6, y: 0 },
      anchor_alignment: "center",
      text: "90DEG",
      is_knockout: true,
      ccw_rotation: 90,
    },
  ])

  expect(rotatedResult).toMatchSvgSnapshot(import.meta.path, "knockout-rotated")
})

test("knockout silkscreen multiline text", () => {
  const multilineResult = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 25,
      height: 15,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    // Multiline knockout text
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_multiline",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "LINE 1\nLINE 2\nLINE 3",
      is_knockout: true,
    },
  ])

  expect(multilineResult).toMatchSvgSnapshot(import.meta.path, "knockout-multiline")
})
