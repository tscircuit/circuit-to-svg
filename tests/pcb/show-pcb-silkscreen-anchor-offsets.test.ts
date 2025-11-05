import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("showAnchorOffsets displays offset indicators for silkscreen text", () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 0, y: 0 },
      width: 30,
      height: 30,
      num_layers: 2,
      material: "fr4",
      thickness: 1.6,
    },
    // Center aligned text
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_1",
      pcb_component_id: "comp_1",
      layer: "top",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "CENTER",
      font: "tscircuit2024",
      font_size: 1,
    },
    // Top-left aligned text
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_2",
      pcb_component_id: "comp_2",
      layer: "top",
      anchor_position: { x: -8, y: 8 },
      anchor_alignment: "top_left",
      text: "TOP LEFT",
      font: "tscircuit2024",
      font_size: 0.8,
    },
    // Bottom-right aligned text
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_3",
      pcb_component_id: "comp_3",
      layer: "top",
      anchor_position: { x: 8, y: -8 },
      anchor_alignment: "bottom_right",
      text: "BOTTOM RIGHT",
      font: "tscircuit2024",
      font_size: 0.8,
    },
    // Top-right aligned text
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_4",
      pcb_component_id: "comp_4",
      layer: "top",
      anchor_position: { x: 8, y: 8 },
      anchor_alignment: "top_right",
      text: "TOP RIGHT",
      font: "tscircuit2024",
      font_size: 0.8,
    },
    // Bottom-left aligned text
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_5",
      pcb_component_id: "comp_5",
      layer: "top",
      anchor_position: { x: -8, y: -8 },
      anchor_alignment: "bottom_left",
      text: "BOTTOM LEFT",
      font: "tscircuit2024",
      font_size: 0.8,
    },
    // Center-left aligned text
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_6",
      pcb_component_id: "comp_6",
      layer: "top",
      anchor_position: { x: -10, y: 0 },
      anchor_alignment: "center_left",
      text: "CENTER LEFT",
      font: "tscircuit2024",
      font_size: 0.7,
    },
    // Center-right aligned text
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_7",
      pcb_component_id: "comp_7",
      layer: "top",
      anchor_position: { x: 10, y: 0 },
      anchor_alignment: "center_right",
      text: "CENTER RIGHT",
      font: "tscircuit2024",
      font_size: 0.7,
    },
  ] as any

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    showAnchorOffsets: true,
  })

  // Verify anchor markers are present (white + symbols)
  expect(svg).toContain('class="anchor-offset-marker"')
  expect(svg).toContain('stroke="#ffffff"')

  // Verify dimension lines are present
  expect(svg).toContain('class="anchor-offset-dimension-x"')
  expect(svg).toContain('class="anchor-offset-dimension-y"')

  // Verify labels with measurements
  expect(svg).toContain('class="anchor-offset-label"')
  expect(svg).toContain("mm")

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("showAnchorOffsets disabled does not add indicators", () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      num_layers: 2,
      material: "fr4",
      thickness: 1.6,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_1",
      pcb_component_id: "comp_1",
      layer: "top",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "CENTER",
      font: "tscircuit2024",
      font_size: 1,
    },
  ] as any

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    showAnchorOffsets: false,
  })

  // Verify NO anchor markers
  expect(svg).not.toContain('class="anchor-offset-marker"')
  expect(svg).not.toContain('class="anchor-offset-dimension-x"')
  expect(svg).not.toContain('class="anchor-offset-dimension-y"')
})
