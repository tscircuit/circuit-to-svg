import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("degrades non-finite silkscreen font_size and circular keepout radius to valid SVG lengths", () => {
  const baseBoard: AnyCircuitElement = {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
    num_layers: 2,
    material: "fr4",
    thickness: 1.6,
  }

  const defaultSvg = convertCircuitJsonToPcbSvg([
    baseBoard,
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_default",
      pcb_component_id: "pcb_component_0",
      anchor_position: { x: 3, y: 3 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 1,
      layer: "top",
      text: "hi",
    },
  ])

  const defaultFontSizeMatch = defaultSvg.match(/font-size="([^"]+)"/)
  expect(defaultFontSizeMatch).not.toBeNull()

  const nonFiniteSvg = convertCircuitJsonToPcbSvg([
    baseBoard,
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_nan",
      pcb_component_id: "pcb_component_0",
      anchor_position: { x: 3, y: 3 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: Number.NaN,
      layer: "top",
      text: "hi",
    },
    {
      type: "pcb_keepout",
      pcb_keepout_id: "pcb_keepout_nan",
      shape: "circle",
      center: { x: 5, y: 5 },
      radius: Number.NaN,
      layers: ["top"],
    },
  ])

  expect(nonFiniteSvg).not.toContain('font-size="NaN"')
  expect(nonFiniteSvg).not.toContain('r="NaN"')
  expect(nonFiniteSvg).toContain(`font-size="${defaultFontSizeMatch![1]}"`)
  expect(nonFiniteSvg).toContain("pcb-keepout-circle")
  expect(nonFiniteSvg).toContain('r="0"')
})
