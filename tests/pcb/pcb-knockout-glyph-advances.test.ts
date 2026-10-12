import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { createAlphabetKnockoutText } from "lib/pcb/svg-object-fns/create-alphabet-knockout-text"

// 同梱されるAlphabet 0.0.27のTTFから独立して測定したインク範囲です。
const measurements = [
  {
    text: "ili",
    size: 1,
    starts: [-0.6],
    bounds: { minX: -0.485, minY: -0.762, maxX: 0.485, maxY: 0.005 },
  },
  {
    text: "iAi",
    size: 1,
    starts: [-0.746],
    bounds: { minX: -0.631, minY: -0.756, maxX: 0.631, maxY: -0.006 },
  },
  {
    text: "Hello",
    size: 1,
    starts: [-1.438],
    bounds: { minX: -1.416, minY: -0.762, maxX: 1.326, maxY: 0.018 },
  },
  {
    text: "iii\nR1",
    size: 1,
    starts: [-0.6, -0.692],
    bounds: { minX: -0.702, minY: -0.756, maxX: 0.485, maxY: 1.094 },
  },
  {
    text: "Hello",
    size: 1.5,
    starts: [-2.157],
    bounds: { minX: -2.124, minY: -1.143, maxX: 1.989, maxY: 0.027 },
  },
  {
    text: "HELLO",
    size: 1,
    starts: [-1.73],
    bounds: { minX: -1.708, minY: -0.74, maxX: 1.627, maxY: 0.006 },
  },
]

for (const m of measurements) {
  test(`knockout follows TTF advances for ${JSON.stringify(m.text)} at ${m.size}mm`, () => {
    const geometry = createAlphabetKnockoutText(m.text, m.size)
    if (!geometry.bounds) throw new Error("Expected supported text bounds")
    for (const [index, start] of m.starts.entries()) {
      const line = geometry.textNode.children[index]
      if (!line) throw new Error("Missing text line")
      expect(Number(line.attributes.x)).toBeCloseTo(start, 10)
    }
    for (const key of ["minX", "minY", "maxX", "maxY"] as const) {
      expect(Math.abs(geometry.bounds[key] - m.bounds[key])).toBeLessThan(
        0.001 * m.size,
      )
    }
  })
}

test("empty and unsupported-only text retain no ink bounds", () => {
  expect(createAlphabetKnockoutText("", 1).bounds).toBeNull()
  expect(createAlphabetKnockoutText("Ω", 1).bounds).toBeNull()
})

test("renders tightly aligned backgrounds around narrow lowercase knockout text", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      width: 12,
      height: 8,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
  ]
  for (const [index, text] of ["ili", "iAi", "Hello", "HELLO"].entries())
    elements.push({
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: `text-${index}`,
      pcb_component_id: "component",
      layer: "top",
      font: "tscircuit2024",
      font_size: 1,
      anchor_position: { x: 0, y: 2.4 - index * 1.6 },
      anchor_alignment: "center",
      ccw_rotation: 0,
      text,
      is_knockout: true,
      knockout_padding: { left: 0.2, right: 0.2, top: 0.2, bottom: 0.2 },
    })
  expect(convertCircuitJsonToPcbSvg(elements)).toMatchSvgSnapshot(
    import.meta.path,
    "narrow-lowercase",
  )
})
