import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import {
  type AnyCircuitElement,
  type PcbSilkscreenCircle,
  pcb_silkscreen_circle,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"
import { parse, stringify } from "svgson"
const noPadding = { width: 800, height: 600, drawPaddingOutsideBoard: false }
const makeCircle = (
  radius = 1,
  stroke_width = 0.5,
  is_filled = false,
  layer: "top" | "bottom" = "top",
  center = { x: 2, y: -3 },
) =>
  pcb_silkscreen_circle.parse({
    type: "pcb_silkscreen_circle",
    pcb_silkscreen_circle_id: "circle",
    pcb_component_id: "component",
    center,
    radius,
    stroke_width,
    is_filled,
    layer,
  })
async function measure(svg: string) {
  const tree = await parse(svg)
  tree.children = tree.children.filter(
    (n) => n.attributes["data-type"] === "pcb_silkscreen_circle",
  )
  const count = tree.children.length
  const attributes = tree.children[0]?.attributes
  tree.attributes = {
    ...tree.attributes,
    width: "800",
    height: "700",
    viewBox: "-400 -400 1600 1400",
  }
  const pixels = new Resvg(stringify(tree)).render().pixels
  let crop = 0
  let visible = 0
  // 座標範囲を維持し、半解像度で範囲外の描画を測ります。
  for (let y = 0; y < 700; y++)
    for (let x = 0; x < 800; x++)
      if (pixels[(y * 800 + x) * 4 + 3]) {
        if (x < 200 || x >= 600 || y < 200 || y >= 500) crop++
        else visible++
      }
  return { crop, visible, count, attributes }
}
for (const center of [
  { x: 0, y: 0 },
  { x: 2, y: -3 },
])
  for (const radius of [0.25, 1, 3])
    for (const stroke_width of [0.1, 0.5, 2])
      for (const is_filled of [false, true])
        for (const layer of ["top", "bottom"] as const)
          test(`circle stroke fits ${center.x} ${radius} ${stroke_width} ${is_filled} ${layer}`, async () => {
            const element = makeCircle(
              radius,
              stroke_width,
              is_filled,
              layer,
              center,
            )
            const before = structuredClone(element)
            const pixels = await measure(
              convertCircuitJsonToPcbSvg([element], { ...noPadding, layer }),
            )
            expect(pixels.count).toBe(1)
            expect(pixels.crop).toBe(0)
            expect(pixels.visible).toBeGreaterThan(0)
            expect(element).toEqual(before)
            expect(pixels.attributes?.fill).toBe(
              is_filled ? pixels.attributes?.stroke : "none",
            )
          })
for (const radius of [0, 1])
  for (const stroke_width of [0, 0.5])
    for (const is_filled of [false, true])
      test(`zero radius or width control ${radius} ${stroke_width} ${is_filled}`, async () => {
        const element = makeCircle(radius, stroke_width, is_filled)
        const pixels = await measure(
          convertCircuitJsonToPcbSvg([element], noPadding),
        )
        expect(pixels.count).toBe(1)
        expect(pixels.crop).toBe(0)
        if (radius > 0 && (stroke_width > 0 || is_filled))
          expect(pixels.visible).toBeGreaterThan(0)
        else expect(pixels.visible).toBe(0)
      })
test("circle envelope includes half of the visible stroke", () => {
  const b = getComprehensivePcbBounds([makeCircle()])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([0.75, 3.25, -4.25, -1.75])
})
test("schema default stroke is included", async () => {
  const element = pcb_silkscreen_circle.parse({
    ...makeCircle(),
    stroke_width: undefined,
  })
  expect(element.stroke_width).toBe(1)
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("raw missing stroke uses the renderer default", async () => {
  const element = {
    ...makeCircle(),
    stroke_width: undefined,
  } as unknown as PcbSilkscreenCircle
  const b = getComprehensivePcbBounds([element])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([0.5, 3.5, -4.5, -1.5])
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
for (const stroke_width of [
  0,
  -1,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  null,
  "0.5mm",
  Symbol("width"),
])
  test(`raw invalid stroke retains radius bounds ${String(stroke_width)}`, () => {
    const element = {
      ...makeCircle(),
      stroke_width,
    } as unknown as PcbSilkscreenCircle
    const b = getComprehensivePcbBounds([element])
    expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([1, 3, -4, -2])
  })
test("zero radius keeps a point envelope", () => {
  const b = getComprehensivePcbBounds([makeCircle(0)])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([2, 2, -3, -3])
})
test("raw negative radius preserves the legacy inverted envelope", () => {
  const b = getComprehensivePcbBounds([{ ...makeCircle(), radius: -1 }])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([3, 1, -2, -4])
})
for (const radius of [Number.NaN, undefined])
  test(`raw malformed radius keeps the legacy exception ${radius}`, () =>
    expect(() =>
      getComprehensivePcbBounds([
        { ...makeCircle(), radius } as unknown as PcbSilkscreenCircle,
      ]),
    ).toThrow())
test("raw infinite radius keeps the legacy infinite envelope", () => {
  const b = getComprehensivePcbBounds([
    { ...makeCircle(), radius: Number.POSITIVE_INFINITY },
  ])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  ])
})
test("raw unit radius retains legacy geometry", () => {
  const b = getComprehensivePcbBounds([
    { ...makeCircle(), radius: "1mm" } as unknown as PcbSilkscreenCircle,
  ])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([1, 3, -4, -2])
})
test("raw unit center retains legacy geometry", () => {
  const b = getComprehensivePcbBounds([
    {
      ...makeCircle(),
      center: { x: "2mm", y: "-3mm" },
    } as unknown as PcbSilkscreenCircle,
  ])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([1, 3, -4, -2])
})
test("raw missing center retains empty bounds", () =>
  expect(
    getComprehensivePcbBounds([
      { ...makeCircle(), center: undefined } as unknown as PcbSilkscreenCircle,
    ]).hasBounds,
  ).toBe(false))
test("overflowing exterior retains the original finite bounds", () => {
  const b = getComprehensivePcbBounds([
    makeCircle(1, Number.MAX_VALUE, false, "top", {
      x: Number.MAX_VALUE,
      y: 0,
    }),
  ])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([
    Number.MAX_VALUE,
    Number.MAX_VALUE,
    -1,
    1,
  ])
})
test("parsed length units have a visible envelope", async () => {
  const element = pcb_silkscreen_circle.parse({
    ...makeCircle(),
    radius: "1mm",
    stroke_width: "0.5mm",
    center: { x: "2mm", y: "-3mm" },
  })
  expect(element.radius).toBe(1)
  expect(element.stroke_width).toBe(0.5)
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
for (const layer of ["top", "bottom"] as const)
  test(`color map remains unchanged ${layer}`, async () => {
    const pixels = await measure(
      convertCircuitJsonToPcbSvg([makeCircle(1, 0.5, true, layer)], {
        ...noPadding,
        layer,
        colorOverrides: { silkscreen: { top: "#00aa66", bottom: "#9955ff" } },
      }),
    )
    expect(pixels.attributes?.stroke).toBe(
      layer === "top" ? "#00aa66" : "#9955ff",
    )
    expect(pixels.attributes?.fill).toBe(pixels.attributes?.stroke)
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBeGreaterThan(0)
  })
for (const layer of ["top", "bottom"] as const)
  test(`nonmatching layer remains unpainted ${layer}`, async () => {
    const pixels = await measure(
      convertCircuitJsonToPcbSvg([makeCircle(1, 0.5, false, layer)], {
        ...noPadding,
        layer: layer === "top" ? "bottom" : "top",
      }),
    )
    expect(pixels.count).toBe(0)
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBe(0)
  })
test("raw default layer remains visible on top", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg(
      [{ ...makeCircle(), layer: undefined } as unknown as PcbSilkscreenCircle],
      { ...noPadding, layer: "top" },
    ),
  )
  expect(pixels.count).toBe(1)
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("frozen input remains unchanged", async () => {
  const element = Object.freeze({
    ...makeCircle(),
    center: Object.freeze({ x: 2, y: -3 }),
  })
  const before = structuredClone(element)
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(element).toEqual(before)
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("showPcbNotes keeps the circle visible", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makeCircle()], {
      ...noPadding,
      showPcbNotes: false,
    }),
  )
  expect(pixels.count).toBe(1)
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("explicit crop preserves intentional clipping", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makeCircle()], {
      ...noPadding,
      viewport: { minX: 1, maxX: 3, minY: -4, maxY: -2 },
    }),
  )
  expect(pixels.crop).toBeGreaterThan(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("default padding fits the circle", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makeCircle()], { width: 800, height: 600 }),
  )
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
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
for (const [name, element] of Object.entries({
  outline: makeCircle(),
  filled: makeCircle(1, 0.5, true),
  bottom: makeCircle(1, 0.5, false, "bottom"),
  default: pcb_silkscreen_circle.parse({
    ...makeCircle(),
    stroke_width: undefined,
  }),
}))
  test(`circle stroke snapshot ${name}`, () =>
    expect(
      convertCircuitJsonToPcbSvg([element], {
        ...noPadding,
        layer: element.layer,
      }),
    ).toMatchSvgSnapshot(`${import.meta.path}-${name}`))
test("nonmatching layer snapshot keeps the pad visible", () =>
  expect(
    convertCircuitJsonToPcbSvg([pad, makeCircle(1, 0.5, false, "bottom")], {
      ...noPadding,
      layer: "top",
    }),
  ).toMatchSvgSnapshot(`${import.meta.path}-nonmatching`))
test("board dimensions and explicit crop remain nominal", () => {
  const board = {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 2, y: -3 },
    width: 2,
    height: 2,
  } as AnyCircuitElement
  const element = makeCircle()
  const b = getComprehensivePcbBounds([board, element])
  expect([b.boardMinX, b.boardMaxX, b.boardMinY, b.boardMaxY]).toEqual([
    1, 3, -4, -2,
  ])
  expect(convertCircuitJsonToPcbSvg([board, element], noPadding)).toBe(
    convertCircuitJsonToPcbSvg([board, element], {
      ...noPadding,
      viewport: { minX: 1, maxX: 3, minY: -4, maxY: -2 },
    }),
  )
})
test("physical pad and rectangle keep nominal geometry", () => {
  const b = getComprehensivePcbBounds([pad])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([-1, 5, -5, -1])
  const rect = {
    type: "pcb_note_rect",
    pcb_note_rect_id: "rect",
    center: { x: 2, y: -3 },
    width: 6,
    height: 4,
    stroke_width: 1,
  } as AnyCircuitElement
  const r = getComprehensivePcbBounds([rect])
  expect([r.minX, r.maxX, r.minY, r.maxY]).toEqual([-1, 5, -5, -1])
})
