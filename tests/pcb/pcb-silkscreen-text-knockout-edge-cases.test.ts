import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen knockout text - default padding (no knockout_padding specified)", () => {
  const defaultPadding = convertCircuitJsonToPcbSvg([
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
      pcb_silkscreen_text_id: "text_default_padding",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "comp_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "DEFAULT",
      is_knockout: true,
      // knockout_padding not specified - should use defaults
    },
  ])

  expect(defaultPadding).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-default-padding",
  )
})

test("silkscreen knockout text - asymmetric padding", () => {
  const asymmetricPadding = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 25,
      height: 12,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_asymmetric",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "comp_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "ASYMMETRIC",
      is_knockout: true,
      knockout_padding: {
        left: 0.3,
        right: 1.5,
        top: 0.2,
        bottom: 1.0,
      },
    },
  ])

  expect(asymmetricPadding).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-asymmetric-padding",
  )
})

test("silkscreen knockout text - very small font size", () => {
  const smallFont = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 15,
      height: 8,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_small",
      font: "tscircuit2024",
      font_size: 0.3,
      pcb_component_id: "comp_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "TINY",
      is_knockout: true,
    },
  ])

  expect(smallFont).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-small-font",
  )
})

test("silkscreen knockout text - very large font size", () => {
  const largeFont = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 30,
      height: 15,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_large",
      font: "tscircuit2024",
      font_size: 2.5,
      pcb_component_id: "comp_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "BIG",
      is_knockout: true,
    },
  ])

  expect(largeFont).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-large-font",
  )
})

test("silkscreen knockout text - single character", () => {
  const singleChar = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 10,
      height: 10,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_single",
      font: "tscircuit2024",
      font_size: 2,
      pcb_component_id: "comp_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "X",
      is_knockout: true,
    },
  ])

  expect(singleChar).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-single-char",
  )
})

test("silkscreen knockout text - numbers and special chars", () => {
  const specialChars = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 25,
      height: 10,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_special",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "comp_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "R123-456",
      is_knockout: true,
    },
  ])

  expect(specialChars).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-special-chars",
  )
})
