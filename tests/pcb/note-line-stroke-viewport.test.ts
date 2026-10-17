import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import {
  type AnyCircuitElement,
  type PcbNoteLine,
  pcb_note_line,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"
import { parse, stringify } from "svgson"

const line = pcb_note_line.parse({
  type: "pcb_note_line",
  pcb_note_line_id: "line",
  x1: -1,
  y1: -3,
  x2: 5,
  y2: 1,
  stroke_width: 0.4,
})
const noPadding = { width: 800, height: 600, drawPaddingOutsideBoard: false }
const paths = [
  [-1, -3, 5, 1],
  [5, 1, -1, -3],
  [-1, -3, 5, -3],
  [2, -3, 2, 1],
  [2, -3, 2, -3],
] as const
async function measurePixels(svg: string) {
  const tree = await parse(svg)
  tree.children = tree.children.filter(
    (n) => n.attributes["data-type"] === "pcb_note_line",
  )
  expect(tree.children).toHaveLength(1)
  tree.attributes = {
    ...tree.attributes,
    width: "1312",
    height: "1112",
    viewBox: "-256 -256 1312 1112",
  }
  const pixels = new Resvg(stringify(tree)).render().pixels
  let crop = 0
  let visible = 0
  for (let y = 0; y < 1112; y++)
    for (let x = 0; x < 1312; x++)
      if (pixels[(y * 1312 + x) * 4 + 3]! > 0) {
        if (x < 256 || x >= 1056 || y < 256 || y >= 856) crop++
        else visible++
      }
  return { crop, visible }
}
for (const [x1, y1, x2, y2] of paths)
  for (const stroke_width of [0.05, 0.4, 2])
    for (const is_dashed of [false, true])
      test(`note line exterior fits viewport ${x1} ${y1} ${x2} ${y2} ${stroke_width} ${is_dashed}`, async () => {
        const element = { ...line, x1, y1, x2, y2, stroke_width, is_dashed }
        const bounds = getComprehensivePcbBounds([element])
        const unpaintedDot = is_dashed && x1 === x2 && y1 === y2
        const halfStroke = unpaintedDot ? 0 : stroke_width / 2
        expect([bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]).toEqual([
          Math.min(x1, x2) - halfStroke,
          Math.max(x1, x2) + halfStroke,
          Math.min(y1, y2) - halfStroke,
          Math.max(y1, y2) + halfStroke,
        ])
        const svg = convertCircuitJsonToPcbSvg(
          [element],
          unpaintedDot
            ? {
                ...noPadding,
                viewport: { minX: 1, maxX: 3, minY: -4, maxY: -2 },
              }
            : noPadding,
        )
        const pixels = await measurePixels(svg)
        expect(pixels.crop).toBe(0)
        if (unpaintedDot) expect(pixels.visible).toBe(0)
        else expect(pixels.visible).toBeGreaterThan(0)
      })
for (const [name, element] of [
  ["note-line-stroke-diagonal", line],
  ["note-line-stroke-dashed", { ...line, stroke_width: 0.05, is_dashed: true }],
  ["note-line-stroke-horizontal", { ...line, y2: -3 }],
  ["note-line-stroke-round-dot", { ...line, x2: -1, y2: -3 }],
] as const)
  test(`note line outline snapshot ${name}`, () =>
    expect(convertCircuitJsonToPcbSvg([element], noPadding)).toMatchSvgSnapshot(
      import.meta.path,
      name,
    ))
for (const stroke_width of [
  0,
  -0.4,
  undefined,
  Number.NaN,
  Number.POSITIVE_INFINITY,
])
  test(`unpainted width keeps endpoints ${stroke_width}`, () => {
    const bounds = getComprehensivePcbBounds([
      { ...line, stroke_width } as PcbNoteLine,
    ])
    expect([bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]).toEqual([
      -1, 5, -3, 1,
    ])
  })
test("overflowed stroke retains endpoints", () => {
  const bounds = getComprehensivePcbBounds([
    {
      ...line,
      x1: Number.MAX_VALUE,
      x2: Number.MAX_VALUE,
      stroke_width: Number.MAX_VALUE,
    },
  ])
  expect([bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]).toEqual([
    Number.MAX_VALUE,
    Number.MAX_VALUE,
    -3,
    1,
  ])
})
test("unparsed unit endpoints keep prior nominal bounds", () => {
  const bounds = getComprehensivePcbBounds([
    { ...line, x1: "-1mm", x2: "5mm" } as unknown as PcbNoteLine,
  ])
  expect([bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]).toEqual([
    -1, 5, -3, 1,
  ])
})
test("explicit viewport keeps intentional cropping", async () => {
  const pixels = await measurePixels(
    convertCircuitJsonToPcbSvg([line], {
      ...noPadding,
      viewport: { minX: -1, maxX: 5, minY: -3, maxY: 1 },
    }),
  )
  expect(pixels.crop).toBeGreaterThan(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("default padding preserves the outline", async () => {
  const pixels = await measurePixels(
    convertCircuitJsonToPcbSvg([line], { width: 800, height: 600 }),
  )
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("board bounds and board crop remain unchanged", () => {
  const board = {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 2, y: -1 },
    width: 6,
    height: 4,
  } as AnyCircuitElement
  const actual = convertCircuitJsonToPcbSvg([board, line], noPadding)
  const explicit = convertCircuitJsonToPcbSvg([board, line], {
    ...noPadding,
    viewport: { minX: -1, maxX: 5, minY: -3, maxY: 1 },
  })
  expect(actual).toBe(explicit)
  const bounds = getComprehensivePcbBounds([board, line])
  expect([
    bounds.boardMinX,
    bounds.boardMaxX,
    bounds.boardMinY,
    bounds.boardMaxY,
  ]).toEqual([-1, 5, -3, 1])
})
test("nominal endpoints, width, dash and color are unchanged", () => {
  const frozen = Object.freeze({ ...line, is_dashed: true, color: "#00aa66" })
  const before = structuredClone(frozen)
  expect(getComprehensivePcbBounds([frozen]).hasBounds).toBe(true)
  expect(frozen).toEqual(before)
})
test("physical pad stays nominal", () => {
  const bounds = getComprehensivePcbBounds([
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad",
      shape: "rect",
      x: 2,
      y: -1,
      width: 6,
      height: 4,
      layer: "top",
    } as AnyCircuitElement,
  ])
  expect([bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]).toEqual([
    -1, 5, -3, 1,
  ])
})
