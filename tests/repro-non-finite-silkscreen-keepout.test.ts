import { expect, test } from "bun:test"
import { circuitJsonToPcbSvg } from "../lib/index"

/**
 * Tests for tscircuit/circuit-to-svg#636
 * Non-finite silkscreen font_size and keepout radius emit font-size="NaN" and r="NaN"
 */
test("non-finite silkscreen font_size falls back to default size (1) instead of font-size='NaN'", () => {
  const soupWithNaN: any = [
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_nan",
      text: "hello",
      font_size: Number.NaN,
      anchor_position: { x: 0, y: 0 },
      layer: "top",
    },
  ]

  const soupWithDefault: any = [
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_default",
      text: "hello",
      anchor_position: { x: 0, y: 0 },
      layer: "top",
    },
  ]

  const svgNaN = circuitJsonToPcbSvg(soupWithNaN)
  const svgDefault = circuitJsonToPcbSvg(soupWithDefault)

  expect(svgNaN).not.toContain('font-size="NaN"')

  // Extract font-size attribute value from both and verify they match the default fallback
  const fontSizeMatchNaN = svgNaN.match(/font-size="([^"]+)"/)
  const fontSizeMatchDefault = svgDefault.match(/font-size="([^"]+)"/)
  expect(fontSizeMatchNaN).toBeTruthy()
  expect(fontSizeMatchDefault).toBeTruthy()
  expect(fontSizeMatchNaN?.[1]).toBe(fontSizeMatchDefault?.[1])
})

test("non-finite circular keepout radius falls back to 0 instead of r='NaN'", () => {
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

  expect(svg).not.toContain('r="NaN"')
  expect(svg).toContain('r="0"')
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
  expect(svg).not.toContain('r="0"')
})
