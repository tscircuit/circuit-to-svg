import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen text - non-knockout text remains unchanged (is_knockout: false)", () => {
  const nonKnockoutFalse = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 20,
      height: 10,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_normal",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "comp_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "NORMAL",
      is_knockout: false,
    },
  ])

  expect(nonKnockoutFalse).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-text-non-knockout-false",
  )
})

test("silkscreen text - non-knockout text remains unchanged (is_knockout omitted)", () => {
  const nonKnockoutOmitted = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 20,
      height: 10,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_normal_omitted",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "comp_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "REGULAR",
      // is_knockout not specified - should default to false
    },
  ])

  expect(nonKnockoutOmitted).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-text-non-knockout-omitted",
  )
})

test("silkscreen text - mixed knockout and non-knockout on same board", () => {
  const mixed = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 35,
      height: 12,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    // Regular text
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_regular_1",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "comp_0",
      anchor_position: { x: -10, y: -2 },
      anchor_alignment: "center",
      text: "REG1",
      is_knockout: false,
    },
    // Knockout text
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_knockout_1",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "comp_1",
      anchor_position: { x: 0, y: -2 },
      anchor_alignment: "center",
      text: "KO1",
      is_knockout: true,
    },
    // Regular text (is_knockout omitted)
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_regular_2",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "comp_2",
      anchor_position: { x: 10, y: -2 },
      anchor_alignment: "center",
      text: "REG2",
      // is_knockout omitted
    },
    // Knockout text with rotation
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_knockout_2",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "comp_3",
      anchor_position: { x: -5, y: 3 },
      anchor_alignment: "center",
      text: "KO2",
      is_knockout: true,
      ccw_rotation: 45,
    },
    // Regular text with rotation
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_regular_3",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "comp_4",
      anchor_position: { x: 5, y: 3 },
      anchor_alignment: "center",
      text: "REG3",
      is_knockout: false,
      ccw_rotation: 45,
    },
  ])

  expect(mixed).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-text-mixed-knockout-regular",
  )
})

test("silkscreen text - all features work on non-knockout text", () => {
  const allFeatures = convertCircuitJsonToPcbSvg([
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
    // Top layer, rotated, various anchors
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_top_rotated",
      font: "tscircuit2024",
      font_size: 0.7,
      pcb_component_id: "comp_0",
      anchor_position: { x: -8, y: -8 },
      anchor_alignment: "top_left",
      text: "TOP-LEFT",
      is_knockout: false,
      ccw_rotation: 30,
    },
    // Bottom layer
    {
      type: "pcb_silkscreen_text",
      layer: "bottom",
      pcb_silkscreen_text_id: "text_bottom",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "comp_1",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "BOTTOM",
      is_knockout: false,
    },
    // Multi-line
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_multiline",
      font: "tscircuit2024",
      font_size: 0.6,
      pcb_component_id: "comp_2",
      anchor_position: { x: 8, y: 8 },
      anchor_alignment: "bottom_right",
      text: "MULTI\nLINE",
      is_knockout: false,
    },
  ])

  expect(allFeatures).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-text-non-knockout-all-features",
  )
})

test("silkscreen text - knockout_padding ignored when is_knockout is false", () => {
  const paddingIgnored = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 20,
      height: 10,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_padding_ignored",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "comp_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "NOPAD",
      is_knockout: false,
      // This should be ignored since is_knockout is false
      knockout_padding: {
        left: 5.0,
        right: 5.0,
        top: 5.0,
        bottom: 5.0,
      },
    },
  ])

  expect(paddingIgnored).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-text-padding-ignored-when-not-knockout",
  )
})
