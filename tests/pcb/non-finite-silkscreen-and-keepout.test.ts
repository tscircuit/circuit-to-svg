import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const board = {
  type: "pcb_board",
  pcb_board_id: "board0",
  center: { x: 0, y: 0 },
  width: 20,
  height: 20,
}

const fontSizesIn = (svg: string) => [
  ...new Set([...svg.matchAll(/font-size="([^"]+)"/g)].map((m) => m[1])),
]

const keepoutRadiiIn = (svg: string) => [
  ...new Set(
    [...svg.matchAll(/pcb-keepout-circle[^>]*? r="([^"]+)"/g)].map((m) => m[1]),
  ),
]

// NOTE: these use Number.NaN rather than null on purpose. An unparseable unit
// string reaches the renderer as NaN in memory; it only becomes null after JSON
// serialisation, and null * n === 0 renders harmlessly. A null-based fixture
// would pass even without the fix.

test('a silkscreen text with a non-finite font_size does not emit font-size="NaN"', () => {
  const svg = convertCircuitJsonToPcbSvg([
    board,
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text0",
      anchor_position: { x: 3, y: 3 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: Number.NaN,
      layer: "top",
      text: "hi",
    },
  ] as any)

  expect(svg).not.toContain('font-size="NaN"')
  expect(fontSizesIn(svg).every((s) => Number.isFinite(Number(s)))).toBe(true)
})

test("a valid font_size is still scaled verbatim", () => {
  // Guards against clamping every label to the fallback size.
  const withSize = (font_size: number) =>
    convertCircuitJsonToPcbSvg([
      board,
      {
        type: "pcb_silkscreen_text",
        pcb_silkscreen_text_id: "text0",
        anchor_position: { x: 3, y: 3 },
        anchor_alignment: "center",
        font: "tscircuit2024",
        font_size,
        layer: "top",
        text: "hi",
      },
    ] as any)

  const one = Number(fontSizesIn(withSize(1))[0])
  const twice = Number(fontSizesIn(withSize(2))[0])

  expect(Number.isFinite(one)).toBe(true)
  // Doubling font_size must double the rendered size — a clamped fix would not.
  expect(twice / one).toBeCloseTo(2, 6)
})

test('a circular keepout with a non-finite radius does not emit r="NaN"', () => {
  const svg = convertCircuitJsonToPcbSvg([
    board,
    {
      type: "pcb_keepout",
      pcb_keepout_id: "keepout0",
      shape: "circle",
      center: { x: 5, y: 5 },
      radius: Number.NaN,
      layers: ["top"],
    },
  ] as any)

  expect(svg).not.toContain('r="NaN"')
})

test("a valid keepout radius is still rendered verbatim", () => {
  const radiusFor = (radius: number) =>
    Number(
      keepoutRadiiIn(
        convertCircuitJsonToPcbSvg([
          board,
          {
            type: "pcb_keepout",
            pcb_keepout_id: "keepout0",
            shape: "circle",
            center: { x: 5, y: 5 },
            radius,
            layers: ["top"],
          },
        ] as any),
      )[0],
    )

  const small = radiusFor(1)
  const large = radiusFor(2)

  expect(small).toBeGreaterThan(0)
  expect(large / small).toBeCloseTo(2, 6)
})
