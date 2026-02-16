import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen knockout text - rotation + anchor + padding combined", () => {
  const combined = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 30,
      height: 30,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    // 0° rotation, top_left anchor
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_0deg",
      font: "tscircuit2024",
      font_size: 0.6,
      pcb_component_id: "comp_0",
      anchor_position: { x: -10, y: -10 },
      anchor_alignment: "top_left",
      text: "0DEG",
      is_knockout: true,
      ccw_rotation: 0,
      knockout_padding: {
        left: 0.5,
        right: 0.5,
        top: 0.3,
        bottom: 0.3,
      },
    },
    // 45° rotation, center anchor
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_45deg",
      font: "tscircuit2024",
      font_size: 0.6,
      pcb_component_id: "comp_1",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "45DEG",
      is_knockout: true,
      ccw_rotation: 45,
      knockout_padding: {
        left: 0.6,
        right: 0.6,
        top: 0.4,
        bottom: 0.4,
      },
    },
    // 90° rotation, bottom_right anchor
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_90deg",
      font: "tscircuit2024",
      font_size: 0.6,
      pcb_component_id: "comp_2",
      anchor_position: { x: 10, y: 10 },
      anchor_alignment: "bottom_right",
      text: "90DEG",
      is_knockout: true,
      ccw_rotation: 90,
      knockout_padding: {
        left: 0.5,
        right: 0.5,
        top: 0.3,
        bottom: 0.3,
      },
    },
  ])

  expect(combined).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-combined-features",
  )
})

test("silkscreen knockout text - 180° rotation with various anchors", () => {
  const rotated180 = convertCircuitJsonToPcbSvg([
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
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_180",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "comp_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "FLIPPED",
      is_knockout: true,
      ccw_rotation: 180,
    },
  ])

  expect(rotated180).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-180-rotation",
  )
})

test("silkscreen knockout text - 270° rotation", () => {
  const rotated270 = convertCircuitJsonToPcbSvg([
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
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_270",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "comp_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "270DEG",
      is_knockout: true,
      ccw_rotation: 270,
    },
  ])

  expect(rotated270).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-270-rotation",
  )
})

test("silkscreen knockout text - bottom layer with rotation", () => {
  const bottomRotated = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 20,
      height: 12,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "bottom",
      pcb_silkscreen_text_id: "text_bottom_rot",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "comp_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "BOTTOM-ROT",
      is_knockout: true,
      ccw_rotation: 45,
      knockout_padding: {
        left: 0.7,
        right: 0.7,
        top: 0.4,
        bottom: 0.4,
      },
    },
  ])

  expect(bottomRotated).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-bottom-rotated",
  )
})

test("silkscreen knockout text - multiple knockout texts on same board", () => {
  const multiple = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 40,
      height: 15,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_1",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "comp_0",
      anchor_position: { x: -12, y: 0 },
      anchor_alignment: "center",
      text: "ONE",
      is_knockout: true,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_2",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "comp_1",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "TWO",
      is_knockout: true,
      ccw_rotation: 90,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_3",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "comp_2",
      anchor_position: { x: 12, y: 0 },
      anchor_alignment: "center",
      text: "THREE",
      is_knockout: true,
      knockout_padding: {
        left: 1.0,
        right: 1.0,
        top: 0.5,
        bottom: 0.5,
      },
    },
  ])

  expect(multiple).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-multiple-texts",
  )
})
