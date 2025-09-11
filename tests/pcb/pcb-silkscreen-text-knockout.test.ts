import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const baseText = {
  type: "pcb_silkscreen_text",
  layer: "top",
  pcb_silkscreen_text_id: "pcb_silkscreen_text_0",
  font: "tscircuit2024",
  font_size: 1,
  pcb_component_id: "pcb_generic_component_0",
  anchor_position: { x: 0, y: 0 },
  anchor_alignment: "center",
  text: "KNOCK",
  is_knockout: true,
} as const

test("silkscreen text knockout", () => {
  const result = convertCircuitJsonToPcbSvg([{ ...baseText }])

  expect(result).toMatchSvgSnapshot(import.meta.path)
})

test("silkscreen text knockout with uniform padding", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      ...baseText,
      knockout_padding: {
        left: 0.5,
        top: 0.5,
        bottom: 0.5,
        right: 0.5,
      },
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path + ".uniform-padding")
})

test("silkscreen text knockout with asymmetric padding", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      ...baseText,
      knockout_padding: {
        left: 0.1,
        top: 0.4,
        bottom: 0.2,
        right: 0.6,
      },
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path + ".asymmetric-padding")
})
