import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import {
  type AnyCircuitElement,
  type PcbFabricationNoteRect,
  pcb_fabrication_note_rect,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"
import { parse, stringify } from "svgson"
const rectangle = pcb_fabrication_note_rect.parse({
  type: "pcb_fabrication_note_rect",
  pcb_fabrication_note_rect_id: "rect",
  pcb_component_id: "component",
  layer: "top",
  center: { x: 2, y: -3 },
  width: 6,
  height: 4,
  stroke_width: 0.4,
  has_stroke: true,
  is_filled: false,
})
const noPadding = { width: 800, height: 600, drawPaddingOutsideBoard: false }
async function measurePixels(svg: string, expectedRectangles = 1) {
  const tree = await parse(svg)
  tree.children = tree.children.filter(
    (n) => n.attributes["data-type"] === "pcb_fabrication_note_rect",
  )
  expect(tree.children).toHaveLength(expectedRectangles)
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
for (const [width, height] of [
  [6, 4],
  [-6, 4],
  [6, -4],
  [-6, -4],
])
  for (const stroke_width of [0.05, 0.4])
    for (const corner_radius of [0, 0.6])
      for (const is_stroke_dashed of [false, true])
        for (const is_filled of [false, true])
          test(`note rect outline fits viewport ${width} ${height} ${stroke_width} ${corner_radius} ${is_stroke_dashed} ${is_filled}`, async () => {
            const element = pcb_fabrication_note_rect.parse({
              ...rectangle,
              width,
              height,
              stroke_width,
              corner_radius,
              is_stroke_dashed,
              is_filled,
            })
            const before = structuredClone(element)
            const bounds = getComprehensivePcbBounds([element])
            expect(bounds.minX).toBeCloseTo(
              2 - (Math.abs(width!) + stroke_width) / 2,
              12,
            )
            expect(bounds.maxX).toBeCloseTo(
              2 + (Math.abs(width!) + stroke_width) / 2,
              12,
            )
            expect(bounds.minY).toBeCloseTo(
              -3 - (Math.abs(height!) + stroke_width) / 2,
              12,
            )
            expect(bounds.maxY).toBeCloseTo(
              -3 + (Math.abs(height!) + stroke_width) / 2,
              12,
            )
            const pixels = await measurePixels(
              convertCircuitJsonToPcbSvg([element], noPadding),
            )
            expect(pixels.crop).toBe(0)
            expect(pixels.visible).toBeGreaterThan(0)
            expect(element).toEqual(before)
          })
for (const has_stroke of [true, false])
  for (const is_filled of [false, true])
    test(`zero width and fill preserve nominal bounds ${has_stroke} ${is_filled}`, async () => {
      const element = { ...rectangle, stroke_width: 0, has_stroke, is_filled }
      const bounds = getComprehensivePcbBounds([element])
      expect([bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]).toEqual([
        -1, 5, -5, -1,
      ])
      const pixels = await measurePixels(
        convertCircuitJsonToPcbSvg([element], noPadding),
      )
      expect(pixels.crop).toBe(0)
      if (is_filled) expect(pixels.visible).toBeGreaterThan(0)
      else expect(pixels.visible).toBe(0)
    })
for (const is_filled of [false, true])
  test(`disabled stroke preserves fill-only bounds ${is_filled}`, async () => {
    const element = { ...rectangle, has_stroke: false, is_filled }
    const bounds = getComprehensivePcbBounds([element])
    expect([bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]).toEqual([
      -1, 5, -5, -1,
    ])
    const pixels = await measurePixels(
      convertCircuitJsonToPcbSvg([element], noPadding),
    )
    expect(pixels.crop).toBe(0)
    if (is_filled) expect(pixels.visible).toBeGreaterThan(0)
    else expect(pixels.visible).toBe(0)
  })
for (const [width, height] of [
  [-6, 4],
  [6, -4],
  [-6, -4],
])
  test(`fill follows absolute signed dimensions ${width} ${height}`, async () => {
    const element = pcb_fabrication_note_rect.parse({
      ...rectangle,
      width,
      height,
      has_stroke: false,
      is_filled: true,
    })
    const bounds = getComprehensivePcbBounds([element])
    expect([bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]).toEqual([
      -1, 5, -5, -1,
    ])
    const pixels = await measurePixels(
      convertCircuitJsonToPcbSvg([element], noPadding),
    )
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBeGreaterThan(0)
  })
test("custom color preserves painted exterior", async () => {
  const pixels = await measurePixels(
    convertCircuitJsonToPcbSvg(
      [{ ...rectangle, color: "#00aa66", is_filled: true }],
      noPadding,
    ),
  )
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
for (const [name, element] of [
  ["fabrication-rect-stroke-sharp", rectangle],
  ["fabrication-rect-stroke-rounded", { ...rectangle, corner_radius: 0.6 }],
  [
    "fabrication-rect-stroke-dashed",
    { ...rectangle, stroke_width: 0.05, is_stroke_dashed: true },
  ],
  [
    "fabrication-rect-stroke-negative-filled",
    { ...rectangle, width: -6, height: -4, is_filled: true },
  ],
] as const)
  test(`note rectangle stroke snapshot ${name}`, () =>
    expect(convertCircuitJsonToPcbSvg([element], noPadding)).toMatchSvgSnapshot(
      import.meta.path,
      name,
    ))
for (const stroke_width of [
  undefined,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  -0.4,
])
  test(`invalid stroke retains nominal bounds ${stroke_width}`, () => {
    const bounds = getComprehensivePcbBounds([
      { ...rectangle, stroke_width } as PcbFabricationNoteRect,
    ])
    expect([bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]).toEqual([
      -1, 5, -5, -1,
    ])
  })
for (const [width, height] of [
  [0, 4],
  [6, 0],
])
  test(`zero dimensions preserve old bounds ${width} ${height}`, () => {
    const bounds = getComprehensivePcbBounds([
      { ...rectangle, width: width!, height: height! },
    ])
    expect([bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]).toEqual([
      2 - width! / 2,
      2 + width! / 2,
      -3 - height! / 2,
      -3 + height! / 2,
    ])
  })
test("overflowed exterior retains nominal dimensions", () => {
  const bounds = getComprehensivePcbBounds([
    { ...rectangle, width: Number.MAX_VALUE, stroke_width: Number.MAX_VALUE },
  ])
  expect([bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]).toEqual([
    2 - Number.MAX_VALUE / 2,
    2 + Number.MAX_VALUE / 2,
    -5,
    -1,
  ])
})
test("unparsed unit dimensions retain old signed fallback", () => {
  const bounds = getComprehensivePcbBounds([
    {
      ...rectangle,
      width: "-6mm",
      height: "4mm",
    } as unknown as PcbFabricationNoteRect,
  ])
  expect([bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]).toEqual([
    5, -1, -5, -1,
  ])
})
test("explicit viewport keeps intentional cropping", async () => {
  const pixels = await measurePixels(
    convertCircuitJsonToPcbSvg([rectangle], {
      ...noPadding,
      viewport: { minX: -1, maxX: 5, minY: -5, maxY: -1 },
    }),
  )
  expect(pixels.crop).toBeGreaterThan(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("default padding already includes the painted exterior", async () => {
  const pixels = await measurePixels(
    convertCircuitJsonToPcbSvg([rectangle], { width: 800, height: 600 }),
  )
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("board crop and physical dimensions remain unchanged", () => {
  const board = {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 2, y: -3 },
    width: 6,
    height: 4,
  } as AnyCircuitElement
  const actual = convertCircuitJsonToPcbSvg([board, rectangle], noPadding)
  const explicit = convertCircuitJsonToPcbSvg([board, rectangle], {
    ...noPadding,
    viewport: { minX: -1, maxX: 5, minY: -5, maxY: -1 },
  })
  expect(actual).toBe(explicit)
  const bounds = getComprehensivePcbBounds([board, rectangle])
  expect([
    bounds.boardMinX,
    bounds.boardMaxX,
    bounds.boardMinY,
    bounds.boardMaxY,
  ]).toEqual([-1, 5, -5, -1])
})
test("frozen nominal dimensions and style flags are unchanged", () => {
  const frozen = Object.freeze({
    ...rectangle,
    width: -6,
    center: Object.freeze({ ...rectangle.center }),
    is_filled: true,
    is_stroke_dashed: true,
  })
  const before = structuredClone(frozen)
  expect(getComprehensivePcbBounds([frozen]).hasBounds).toBe(true)
  expect(frozen).toEqual(before)
})
test("physical pad and ordinary rectangle retain nominal bounds", () => {
  for (const element of [
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad",
      shape: "rect",
      x: 2,
      y: -3,
      width: 6,
      height: 4,
      layer: "top",
    },
    {
      ...rectangle,
      type: "pcb_note_rect",
      pcb_note_rect_id: "normal",
      layer: "top",
    },
  ] as AnyCircuitElement[]) {
    const bounds = getComprehensivePcbBounds([element])
    expect([bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]).toEqual([
      -1, 5, -5, -1,
    ])
  }
})

for (const layer of ["top", "bottom"] as const)
  test(`matching fabrication rectangle layer shows full stroke ${layer}`, async () => {
    const note = { ...rectangle, layer }
    const pixels = await measurePixels(
      convertCircuitJsonToPcbSvg([note], {
        ...noPadding,
        layer,
        showFabricationNotes: true,
      }),
    )
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBeGreaterThan(0)
  })
test("nonmatching rectangle layer remains invisible", async () => {
  const pixels = await measurePixels(
    convertCircuitJsonToPcbSvg([rectangle], { ...noPadding, layer: "bottom" }),
    0,
  )
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBe(0)
})
test("hidden fabrication rectangles do not affect other geometry", async () => {
  const pad = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad",
    shape: "rect",
    x: 2,
    y: -3,
    width: 6,
    height: 4,
    layer: "top",
  } as AnyCircuitElement
  const options = { ...noPadding, showFabricationNotes: false }
  const svg = convertCircuitJsonToPcbSvg([pad, rectangle], options)
  expect(svg).toBe(convertCircuitJsonToPcbSvg([pad], options))
  const pixels = await measurePixels(svg, 0)
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBe(0)
})
