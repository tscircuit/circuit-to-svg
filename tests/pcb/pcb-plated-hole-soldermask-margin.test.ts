import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuitJson: any = [
  {
    type: "pcb_board",
    pcb_board_id: "board_plated_hole_soldermask",
    center: { x: 0, y: 0 },
    width: 30,
    height: 20,
  },
  // Circle plated hole with positive soldermask margin
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "circle_plated_hole_with_mask",
    shape: "circle",
    x: -10,
    y: 5,
    outer_diameter: 3,
    hole_diameter: 1.5,
    soldermask_margin: 0.3,
  },
  // Circle plated hole with negative soldermask margin
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "circle_plated_hole_negative_margin",
    shape: "circle",
    x: -10,
    y: -5,
    outer_diameter: 3,
    hole_diameter: 1.5,
    soldermask_margin: -0.2,
  },
  // Pill plated hole with soldermask margin (horizontal)
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pill_plated_hole_horizontal_with_mask",
    shape: "pill",
    x: -5,
    y: 5,
    outer_width: 4,
    outer_height: 2.5,
    hole_width: 3,
    hole_height: 1.5,
    soldermask_margin: 0.3,
  },
  // Pill plated hole with soldermask margin (vertical)
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pill_plated_hole_vertical_with_mask",
    shape: "pill",
    x: 0,
    y: 0,
    outer_width: 2.5,
    outer_height: 4,
    hole_width: 1.5,
    hole_height: 3,
    soldermask_margin: 0.25,
  },
  // Circular hole with rect pad and soldermask margin
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "circular_hole_rect_pad_with_mask",
    shape: "circular_hole_with_rect_pad",
    x: 5,
    y: 5,
    hole_diameter: 1.5,
    rect_pad_width: 3,
    rect_pad_height: 3,
    soldermask_margin: 0.35,
  },
  // Pill hole with rect pad and soldermask margin
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pill_hole_rect_pad_with_mask",
    shape: "pill_hole_with_rect_pad",
    x: 10,
    y: 5,
    hole_width: 2,
    hole_height: 1,
    rect_pad_width: 4,
    rect_pad_height: 3,
    soldermask_margin: 0.3,
  },

  // Circle plated hole without soldermask margin (for comparison)
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "circle_plated_hole_no_mask",
    shape: "circle",
    x: 0,
    y: -5,
    outer_diameter: 3,
    hole_diameter: 1.5,
  },

  // Silkscreen labels showing margin values (positioned to be visible)
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "label_circle_pos",
    text: "+0.3mm",
    anchor_position: { x: -10, y: 7.2 },
    layer: "top",
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 0.4,
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "label_circle_neg",
    text: "-0.2mm",
    anchor_position: { x: -10, y: -7.2 },
    layer: "top",
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 0.4,
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "label_pill_h",
    text: "+0.3mm",
    anchor_position: { x: -5, y: 7.2 },
    layer: "top",
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 0.4,
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "label_pill_v",
    text: "+0.25mm",
    anchor_position: { x: -2.5, y: 0 },
    layer: "top",
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 0.4,
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "label_circ_rect",
    text: "+0.35mm",
    anchor_position: { x: 5, y: 7.2 },
    layer: "top",
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 0.4,
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "label_pill_rect",
    text: "+0.3mm",
    anchor_position: { x: 10, y: 7.2 },
    layer: "top",
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 0.4,
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "label_no_mask",
    text: "0mm",
    anchor_position: { x: 0, y: -7.2 },
    layer: "top",
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 0.4,
  },
]

test("pcb_plated_hole with soldermask_margin", () => {
  expect(
    convertCircuitJsonToPcbSvg(circuitJson, { showSolderMask: true }),
  ).toMatchSvgSnapshot(import.meta.path)
})
