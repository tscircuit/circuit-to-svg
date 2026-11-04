import { expect, test } from "bun:test"
import { circuitJsonToPcbSvg } from "../lib/index"

/**
 * Reproduction for tscircuit/circuit-to-svg#636
 * Non-finite silkscreen font_size and keepout radius emit font-size="NaN" and r="NaN"
 */
test("repro: non-finite silkscreen font_size emits font-size='NaN'", () => {
  const soup: any = [
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text1",
      text: "hello",
      font_size: Number.NaN,
      anchor_position: { x: 0, y: 0 },
      layer: "top",
    },
  ]

  const svg = circuitJsonToPcbSvg(soup)

  // Current defect: font_size = 1 default only handles undefined, so NaN propagates to font-size="NaN"
  expect(svg).toContain('font-size="NaN"')
})

test("repro: non-finite circular keepout radius emits r='NaN'", () => {
  const soup: any = [
    {
      type: "pcb_keepout",
      pcb_keepout_id: "keepout1",
      shape: "circle",
      center: { x: 0, y: 0 },
      radius: Number.NaN,
      layers: ["top"],
    },
  ]

  const svg = circuitJsonToPcbSvg(soup)

  // Current defect: keepout circle radius has no finite check, emitting r="NaN"
  expect(svg).toContain('r="NaN"')
})

test("control: finite silkscreen font_size and keepout radius emit valid SVG attributes", () => {
  const soup: any = [
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text1",
      text: "hello",
      font_size: 1.5,
      anchor_position: { x: 0, y: 0 },
      layer: "top",
    },
    {
      type: "pcb_keepout",
      pcb_keepout_id: "keepout1",
      shape: "circle",
      center: { x: 0, y: 0 },
      radius: 3,
      layers: ["top"],
    },
  ]

  const svg = circuitJsonToPcbSvg(soup)

  expect(svg).not.toContain('font-size="NaN"')
  expect(svg).not.toContain('r="NaN"')
})
