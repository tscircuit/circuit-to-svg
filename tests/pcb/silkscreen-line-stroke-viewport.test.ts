import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import {
  type AnyCircuitElement,
  type PcbSilkscreenLine,
  pcb_silkscreen_line,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"
import { parse, stringify } from "svgson"
const noPadding = { width: 800, height: 600, drawPaddingOutsideBoard: false }
const makeLine = (options: Partial<PcbSilkscreenLine> = {}) =>
  pcb_silkscreen_line.parse({
    type: "pcb_silkscreen_line",
    pcb_silkscreen_line_id: "line",
    pcb_component_id: "component",
    x1: 2,
    y1: -3,
    x2: 5,
    y2: 1,
    stroke_width: 0.5,
    layer: "top",
    ...options,
  })
const extents = (element: PcbSilkscreenLine) => {
  const b = getComprehensivePcbBounds([element])
  return [b.minX, b.maxX, b.minY, b.maxY]
}
async function measure(svg: string) {
  const tree = await parse(svg)
  tree.children = tree.children.filter(
    (n) => n.attributes["data-type"] === "pcb_silkscreen_line",
  )
  const count = tree.children.length
  const attributes = tree.children[0]?.attributes
  tree.attributes = {
    ...tree.attributes,
    width: "400",
    height: "350",
    viewBox: "-400 -400 1600 1400",
  }
  const pixels = new Resvg(stringify(tree)).render().pixels
  let crop = 0
  let visible = 0
  // 元の座標範囲を維持し、4分の1の解像度でもviewport外の実描画を検出します。
  for (let y = 0; y < 350; y++)
    for (let x = 0; x < 400; x++)
      if (pixels[(y * 400 + x) * 4 + 3]) {
        if (x < 100 || x >= 300 || y < 100 || y >= 250) crop++
        else visible++
      }
  return { count, attributes, crop, visible }
}
for (const [dx, dy] of [
  [6, 0],
  [0, 6],
  [6, 4],
  [-6, 4],
] as const)
  for (const reverse of [false, true])
    for (const stroke_width of [0.1, 0.5, 2])
      for (const layer of ["top", "bottom"] as const)
        test(`line stroke fits ${dx} ${dy} ${reverse} ${stroke_width} ${layer}`, async () => {
          const start = { x: 2, y: -3 }
          const end = { x: 2 + dx, y: -3 + dy }
          const element = makeLine({
            x1: reverse ? end.x : start.x,
            y1: reverse ? end.y : start.y,
            x2: reverse ? start.x : end.x,
            y2: reverse ? start.y : end.y,
            stroke_width,
            layer,
          })
          const before = structuredClone(element)
          const pixels = await measure(
            convertCircuitJsonToPcbSvg([element], { ...noPadding, layer }),
          )
          expect(pixels.count).toBe(1)
          expect(pixels.crop).toBe(0)
          expect(pixels.visible).toBeGreaterThan(0)
          expect(element).toEqual(before)
        })
test("butt stroke bounds use normal offsets without extending endpoints", () => {
  const b = extents(makeLine({ stroke_width: 1 }))
  for (const [index, value] of [1.6, 5.4, -3.3, 1.3].entries())
    expect(b[index]).toBeCloseTo(value, 10)
})
test("horizontal butt stroke keeps its endpoint x positions", () =>
  expect(extents(makeLine({ x2: 8, y2: -3, stroke_width: 1 }))).toEqual([
    2, 8, -3.5, -2.5,
  ]))
test("vertical butt stroke keeps its endpoint y positions", () =>
  expect(extents(makeLine({ x2: 2, y2: 3, stroke_width: 1 }))).toEqual([
    1.5, 2.5, -3, 3,
  ]))
for (const stroke_width of [0, 0.5, 2])
  for (const layer of ["top", "bottom"] as const)
    test(`point line remains unpainted ${stroke_width} ${layer}`, async () => {
      const element = makeLine({ x2: 2, y2: -3, stroke_width, layer })
      const pixels = await measure(
        convertCircuitJsonToPcbSvg([element], { ...noPadding, layer }),
      )
      expect(extents(element)).toEqual([2, 2, -3, -3])
      expect(pixels.count).toBe(1)
      expect(pixels.crop).toBe(0)
      expect(pixels.visible).toBe(0)
    })
test("zero stroke stays unpainted with endpoint bounds", async () => {
  const element = makeLine({ stroke_width: 0 })
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(extents(element)).toEqual([2, 5, -3, 1])
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBe(0)
})
for (const stroke_width of [
  null,
  -1,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  "0.5mm",
  Symbol("width"),
  undefined,
])
  test(`raw invalid stroke keeps endpoint bounds ${String(stroke_width)}`, () =>
    expect(
      extents({ ...makeLine(), stroke_width } as unknown as PcbSilkscreenLine),
    ).toEqual([2, 5, -3, 1]))
test("raw missing stroke is not replaced by a schema default", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg(
      [
        {
          ...makeLine(),
          stroke_width: undefined,
        } as unknown as PcbSilkscreenLine,
      ],
      noPadding,
    ),
  )
  expect(pixels.attributes?.["stroke-width"]).toBe("NaN")
  expect(pixels.visible).toBeGreaterThan(0)
})
test("schema default stroke is visible and enclosed", async () => {
  const element = makeLine({ stroke_width: undefined })
  expect(element.stroke_width).toBe(0.1)
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
for (const coordinate of ["x1", "y1", "x2", "y2"] as const)
  for (const value of [undefined, Number.NaN])
    test(`raw missing coordinate retains its exception ${coordinate} ${value}`, () =>
      expect(() =>
        extents({
          ...makeLine(),
          [coordinate]: value,
        } as unknown as PcbSilkscreenLine),
      ).toThrow())
test("raw unit endpoints keep their parsed nominal bounds", () =>
  expect(
    extents({
      ...makeLine(),
      x1: "2mm",
      y1: "-3mm",
      x2: "5mm",
      y2: "1mm",
    } as unknown as PcbSilkscreenLine),
  ).toEqual([2, 5, -3, 1]))
test("parsed units have a visible normal envelope", async () => {
  const element = pcb_silkscreen_line.parse({
    ...makeLine(),
    x1: "2mm",
    y1: "-3mm",
    x2: "5mm",
    y2: "1mm",
    stroke_width: "0.5mm",
  })
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("raw infinite endpoints keep their old infinite bounds", () =>
  expect(extents({ ...makeLine(), x2: Number.POSITIVE_INFINITY })).toEqual([
    2,
    Number.POSITIVE_INFINITY,
    -3,
    1,
  ]))
test("overflowing vector keeps its old finite endpoint bounds", () =>
  expect(
    extents(makeLine({ x1: -Number.MAX_VALUE, x2: Number.MAX_VALUE })),
  ).toEqual([-Number.MAX_VALUE, Number.MAX_VALUE, -3, 1]))
test("overflowing exterior retains finite endpoint bounds", () =>
  expect(
    extents(
      makeLine({
        x1: Number.MAX_VALUE,
        x2: Number.MAX_VALUE,
        y1: 0,
        y2: 1,
        stroke_width: Number.MAX_VALUE,
      }),
    ),
  ).toEqual([Number.MAX_VALUE, Number.MAX_VALUE, 0, 1]))
for (const layer of ["top", "bottom"] as const) {
  test(`color remains unchanged ${layer}`, async () => {
    const pixels = await measure(
      convertCircuitJsonToPcbSvg([makeLine({ layer })], {
        ...noPadding,
        layer,
        colorOverrides: { silkscreen: { top: "#00aa66", bottom: "#9955ff" } },
      }),
    )
    expect(pixels.attributes?.stroke).toBe(
      layer === "top" ? "#00aa66" : "#9955ff",
    )
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBeGreaterThan(0)
  })
  test(`layer mismatch is unpainted ${layer}`, async () => {
    const pixels = await measure(
      convertCircuitJsonToPcbSvg([makeLine({ layer })], {
        ...noPadding,
        layer: layer === "top" ? "bottom" : "top",
      }),
    )
    expect(pixels.count).toBe(0)
    expect(pixels.visible).toBe(0)
    expect(pixels.crop).toBe(0)
  })
}
test("raw default layer remains visible on top", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg(
      [{ ...makeLine(), layer: undefined } as unknown as PcbSilkscreenLine],
      { ...noPadding, layer: "top" },
    ),
  )
  expect(pixels.count).toBe(1)
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("frozen input stays unchanged", async () => {
  const element = Object.freeze(makeLine())
  const before = structuredClone(element)
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(element).toEqual(before)
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("notes visibility keeps the line visible", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makeLine()], {
      ...noPadding,
      showPcbNotes: false,
    }),
  )
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("explicit crop keeps intentional clipping", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makeLine()], {
      ...noPadding,
      viewport: { minX: 2, maxX: 5, minY: -3, maxY: 1 },
    }),
  )
  expect(pixels.crop).toBeGreaterThan(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("default padding fits the line", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makeLine()], { width: 800, height: 600 }),
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
for (const [name, options] of Object.entries({
  diagonal: {},
  horizontal: { x2: 8, y2: -3 },
  vertical: { x2: 2, y2: 3 },
  bottom: { layer: "bottom" as const },
  reversed: { x1: 5, y1: 1, x2: 2, y2: -3 },
}))
  test(`line stroke snapshot ${name}`, () => {
    const element = makeLine(options)
    expect(
      convertCircuitJsonToPcbSvg([element], {
        ...noPadding,
        layer: element.layer,
      }),
    ).toMatchSvgSnapshot(`${import.meta.path}-${name}`)
  })
test("nonmatching snapshot preserves pad", () =>
  expect(
    convertCircuitJsonToPcbSvg([pad, makeLine({ layer: "bottom" })], {
      ...noPadding,
      layer: "top",
    }),
  ).toMatchSvgSnapshot(`${import.meta.path}-nonmatching`))
test("board dimensions and its automatic camera stay nominal", () => {
  const board = {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 3.5, y: -1 },
    width: 3,
    height: 4,
  } as AnyCircuitElement
  const b = getComprehensivePcbBounds([board, makeLine()])
  expect([b.boardMinX, b.boardMaxX, b.boardMinY, b.boardMaxY]).toEqual([
    2, 5, -3, 1,
  ])
  expect(convertCircuitJsonToPcbSvg([board, makeLine()], noPadding)).toBe(
    convertCircuitJsonToPcbSvg([board, makeLine()], {
      ...noPadding,
      viewport: { minX: 2, maxX: 5, minY: -3, maxY: 1 },
    }),
  )
})
test("physical pad and ordinary annotation line remain nominal", () => {
  const b = getComprehensivePcbBounds([pad])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([-1, 5, -5, -1])
  const note = {
    ...makeLine(),
    type: "pcb_note_line",
    pcb_note_line_id: "note",
  } as AnyCircuitElement
  const n = getComprehensivePcbBounds([note])
  expect([n.minX, n.maxX, n.minY, n.maxY]).toEqual([2, 5, -3, 1])
})
