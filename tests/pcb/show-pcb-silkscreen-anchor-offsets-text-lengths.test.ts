import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("showAnchorOffsets with varying text lengths", () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 0, y: 0 },
      width: 40,
      height: 30,
      num_layers: 2,
      material: "fr4",
      thickness: 1.6,
    },
    // Very short text - top left (large font)
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_1",
      pcb_component_id: "comp_1",
      layer: "top",
      anchor_position: { x: -15, y: 10 },
      anchor_alignment: "top_left",
      text: "AB",
      font: "tscircuit2024",
      font_size: 1.5,
    },
    // Medium text - top right (medium font)
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_2",
      pcb_component_id: "comp_2",
      layer: "top",
      anchor_position: { x: 15, y: 10 },
      anchor_alignment: "top_right",
      text: "MEDIUM",
      font: "tscircuit2024",
      font_size: 0.8,
    },
    // Long text - bottom left (small font)
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_3",
      pcb_component_id: "comp_3",
      layer: "top",
      anchor_position: { x: -15, y: -10 },
      anchor_alignment: "bottom_left",
      text: "VERY LONG TEXT HERE",
      font: "tscircuit2024",
      font_size: 0.6,
    },
    // Very short text - center (extra large font)
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_4",
      pcb_component_id: "comp_4",
      layer: "top",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "X",
      font: "tscircuit2024",
      font_size: 2.0,
    },
    // Long text - bottom right (tiny font)
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_5",
      pcb_component_id: "comp_5",
      layer: "top",
      anchor_position: { x: 15, y: -10 },
      anchor_alignment: "bottom_right",
      text: "COMPONENT_REF_123",
      font: "tscircuit2024",
      font_size: 0.5,
    },
    // Medium text - center left (large font)
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_6",
      pcb_component_id: "comp_6",
      layer: "top",
      anchor_position: { x: -15, y: 0 },
      anchor_alignment: "center_left",
      text: "R1K",
      font: "tscircuit2024",
      font_size: 1.3,
    },
  ] as any

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    showAnchorOffsets: true,
  })

  // Verify anchor markers are present
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
