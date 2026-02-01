import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("fabrication note text anchor alignment - all alignments in grid", () => {
  // Create a grid layout showing all 5 supported anchor alignments
  // The anchor point is at the center of each cell, and text alignment
  // determines where the text appears relative to that anchor point
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      width: 30,
      height: 20,
      center: { x: 0, y: 0 },
      num_layers: 2,
      pcb_board_id: "pcb_board_0",
      thickness: 1.2,
      material: "fr1",
    },
    // Top row: top_left and top_right
    {
      type: "pcb_fabrication_note_text",
      pcb_fabrication_note_text_id: "fab_text_top_left",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: -7, y: 5 },
      anchor_alignment: "top_left",
      text: "top_left",
      layer: "top",
    },
    {
      type: "pcb_fabrication_note_text",
      pcb_fabrication_note_text_id: "fab_text_top_right",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 7, y: 5 },
      anchor_alignment: "top_right",
      text: "top_right",
      layer: "top",
    },
    // Middle row: center
    {
      type: "pcb_fabrication_note_text",
      pcb_fabrication_note_text_id: "fab_text_center",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "center",
      layer: "top",
    },
    // Bottom row: bottom_left and bottom_right
    {
      type: "pcb_fabrication_note_text",
      pcb_fabrication_note_text_id: "fab_text_bottom_left",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: -7, y: -5 },
      anchor_alignment: "bottom_left",
      text: "bottom_left",
      layer: "top",
    },
    {
      type: "pcb_fabrication_note_text",
      pcb_fabrication_note_text_id: "fab_text_bottom_right",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 7, y: -5 },
      anchor_alignment: "bottom_right",
      text: "bottom_right",
      layer: "top",
    },
    // Add crosshair markers at each anchor position to show alignment
    {
      type: "pcb_fabrication_note_path",
      pcb_fabrication_note_path_id: "marker_top_left_h",
      pcb_component_id: "pcb_generic_component_0",
      layer: "top",
      route: [
        { x: -8, y: 5 },
        { x: -6, y: 5 },
      ],
      stroke_width: 0.1,
      color: "red",
    },
    {
      type: "pcb_fabrication_note_path",
      pcb_fabrication_note_path_id: "marker_top_left_v",
      pcb_component_id: "pcb_generic_component_0",
      layer: "top",
      route: [
        { x: -7, y: 4 },
        { x: -7, y: 6 },
      ],
      stroke_width: 0.1,
      color: "red",
    },
    {
      type: "pcb_fabrication_note_path",
      pcb_fabrication_note_path_id: "marker_top_right_h",
      pcb_component_id: "pcb_generic_component_0",
      layer: "top",
      route: [
        { x: 6, y: 5 },
        { x: 8, y: 5 },
      ],
      stroke_width: 0.1,
      color: "red",
    },
    {
      type: "pcb_fabrication_note_path",
      pcb_fabrication_note_path_id: "marker_top_right_v",
      pcb_component_id: "pcb_generic_component_0",
      layer: "top",
      route: [
        { x: 7, y: 4 },
        { x: 7, y: 6 },
      ],
      stroke_width: 0.1,
      color: "red",
    },
    {
      type: "pcb_fabrication_note_path",
      pcb_fabrication_note_path_id: "marker_center_h",
      pcb_component_id: "pcb_generic_component_0",
      layer: "top",
      route: [
        { x: -1, y: 0 },
        { x: 1, y: 0 },
      ],
      stroke_width: 0.1,
      color: "red",
    },
    {
      type: "pcb_fabrication_note_path",
      pcb_fabrication_note_path_id: "marker_center_v",
      pcb_component_id: "pcb_generic_component_0",
      layer: "top",
      route: [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
      ],
      stroke_width: 0.1,
      color: "red",
    },
    {
      type: "pcb_fabrication_note_path",
      pcb_fabrication_note_path_id: "marker_bottom_left_h",
      pcb_component_id: "pcb_generic_component_0",
      layer: "top",
      route: [
        { x: -8, y: -5 },
        { x: -6, y: -5 },
      ],
      stroke_width: 0.1,
      color: "red",
    },
    {
      type: "pcb_fabrication_note_path",
      pcb_fabrication_note_path_id: "marker_bottom_left_v",
      pcb_component_id: "pcb_generic_component_0",
      layer: "top",
      route: [
        { x: -7, y: -6 },
        { x: -7, y: -4 },
      ],
      stroke_width: 0.1,
      color: "red",
    },
    {
      type: "pcb_fabrication_note_path",
      pcb_fabrication_note_path_id: "marker_bottom_right_h",
      pcb_component_id: "pcb_generic_component_0",
      layer: "top",
      route: [
        { x: 6, y: -5 },
        { x: 8, y: -5 },
      ],
      stroke_width: 0.1,
      color: "red",
    },
    {
      type: "pcb_fabrication_note_path",
      pcb_fabrication_note_path_id: "marker_bottom_right_v",
      pcb_component_id: "pcb_generic_component_0",
      layer: "top",
      route: [
        { x: 7, y: -6 },
        { x: 7, y: -4 },
      ],
      stroke_width: 0.1,
      color: "red",
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson)

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
