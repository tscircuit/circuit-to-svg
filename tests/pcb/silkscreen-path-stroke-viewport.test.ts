import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import {
  type AnyCircuitElement,
  type PcbSilkscreenPath,
  pcb_silkscreen_path,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"
import { parse, stringify } from "svgson"
const fixtures = {
  horizontal: [
    { x: 0, y: 0 },
    { x: 6, y: 0 },
  ],
  vertical: [
    { x: 0, y: 0 },
    { x: 0, y: 4 },
  ],
  diagonal: [
    { x: 0, y: 0 },
    { x: 6, y: 4 },
  ],
  reverse: [
    { x: 6, y: 4 },
    { x: 0, y: 0 },
  ],
  short: [
    { x: 0, y: 0 },
    { x: 0.1, y: 0.1 },
  ],
  corner: [
    { x: 0, y: 0 },
    { x: 6, y: 0 },
    { x: 6, y: 4 },
  ],
  zigzag: [
    { x: 0, y: 0 },
    { x: 3, y: 4 },
    { x: 6, y: 0 },
  ],
  closed: [
    { x: 0, y: 0 },
    { x: 6, y: 0 },
    { x: 6, y: 4 },
    { x: 0, y: 0 },
  ],
  nearClosed: [
    { x: 0, y: 0 },
    { x: 6, y: 0 },
    { x: 6, y: 4 },
    { x: 0.001, y: 0.001 },
  ],
  repeated: [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 6, y: 4 },
  ],
  retraced: [
    { x: 0, y: 0 },
    { x: 6, y: 4 },
    { x: 0, y: 0 },
  ],
  point: [{ x: 2, y: -3 }],
  same: [
    { x: 2, y: -3 },
    { x: 2, y: -3 },
  ],
  empty: [],
}
const widths = [0.1, 0.5, 2]

const noPadding = { width: 800, height: 600, drawPaddingOutsideBoard: false }
const makePath = (
  route: typeof fixtures.horizontal,
  stroke_width = 0.5,
  layer: "top" | "bottom" = "top",
) =>
  pcb_silkscreen_path.parse({
    type: "pcb_silkscreen_path",
    pcb_silkscreen_path_id: "path",
    pcb_component_id: "component",
    route,
    stroke_width,
    layer,
  })
async function measure(svg: string) {
  const tree = await parse(svg)
  tree.children = tree.children.filter(
    (n) => n.attributes["data-type"] === "pcb_silkscreen_path",
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
for (const [name, route] of Object.entries(fixtures))
  for (const stroke_width of widths)
    for (const layer of ["top", "bottom"] as const)
      test(`round silkscreen path fits ${name} ${stroke_width} ${layer}`, async () => {
        const element = makePath(route, stroke_width, layer)
        const before = structuredClone(element)
        const pixels = await measure(
          convertCircuitJsonToPcbSvg([element], { ...noPadding, layer }),
        )
        expect(pixels.count).toBe(1)
        expect(pixels.crop).toBe(0)
        if (["point", "same", "empty"].includes(name))
          expect(pixels.visible).toBe(0)
        else expect(pixels.visible).toBeGreaterThan(0)
        expect(element).toEqual(before)
        expect(pixels.attributes?.["stroke-linecap"]).toBe("round")
        expect(pixels.attributes?.["stroke-linejoin"]).toBe("round")
      })
test("horizontal path bounds include the round exterior", () => {
  const b = getComprehensivePcbBounds([makePath(fixtures.horizontal)])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([-0.25, 6.25, -0.25, 0.25])
})
for (const name of ["horizontal", "corner", "closed", "retraced"] as const)
  test(`silkscreen path snapshot ${name}`, () =>
    expect(
      convertCircuitJsonToPcbSvg(
        [makePath(fixtures[name], 0.5, name === "closed" ? "bottom" : "top")],
        { ...noPadding, layer: name === "closed" ? "bottom" : "top" },
      ),
    ).toMatchSvgSnapshot(`${import.meta.path}-${name}`))
const pad = {
  type: "pcb_smtpad",
  pcb_smtpad_id: "pad",
  shape: "rect",
  x: 3,
  y: 0,
  width: 6,
  height: 4,
  layer: "top",
} as AnyCircuitElement
for (const layer of ["top", "bottom"] as const)
  test(`nonmatching layer keeps only the pad ${layer}`, async () => {
    const element = makePath(fixtures.horizontal, 0.5, layer)
    const opposite = layer === "top" ? "bottom" : "top"
    const svg = convertCircuitJsonToPcbSvg([pad, element], {
      ...noPadding,
      layer: opposite,
    })
    const pixels = await measure(svg)
    expect(pixels.count).toBe(0)
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBe(0)
  })
test("nonmatching layer visual snapshot", () =>
  expect(
    convertCircuitJsonToPcbSvg(
      [pad, makePath(fixtures.horizontal, 0.5, "bottom")],
      { ...noPadding, layer: "top" },
    ),
  ).toMatchSvgSnapshot(`${import.meta.path}-nonmatching`))
for (const stroke_width of [
  0,
  -1,
  undefined,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  "0.5mm",
])
  test(`raw width keeps legacy geometry ${stroke_width}`, () => {
    const element = {
      ...makePath(fixtures.diagonal),
      stroke_width,
    } as unknown as PcbSilkscreenPath
    const b = getComprehensivePcbBounds([element])
    expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([0, 6, 0, 4])
  })
test("zero stroke remains unpainted", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makePath(fixtures.diagonal, 0)], noPadding),
  )
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBe(0)
})
for (const name of ["point", "same"] as const)
  test(`degenerate ${name} retains point bounds`, () => {
    const b = getComprehensivePcbBounds([makePath(fixtures[name])])
    expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([2, 2, -3, -3])
  })
test("empty path keeps empty bounds", () =>
  expect(getComprehensivePcbBounds([makePath([])]).hasBounds).toBe(false))
for (const route of [undefined, {}])
  test(`raw malformed route keeps legacy exception ${String(route)}`, () =>
    expect(() =>
      getComprehensivePcbBounds([
        {
          ...makePath(fixtures.horizontal),
          route,
        } as unknown as PcbSilkscreenPath,
      ]),
    ).toThrow(TypeError))
test("raw absent route keeps empty bounds", () => {
  const element = {
    type: "pcb_silkscreen_path",
    pcb_silkscreen_path_id: "path",
    pcb_component_id: "component",
    layer: "top",
    stroke_width: 0.5,
  } as unknown as PcbSilkscreenPath
  expect(
    getComprehensivePcbBounds([element as unknown as PcbSilkscreenPath])
      .hasBounds,
  ).toBe(false)
})
test("raw unit coordinates retain legacy geometry", () => {
  const element = {
    ...makePath(fixtures.diagonal),
    route: [
      { x: "0mm", y: "0mm" },
      { x: 6, y: 4 },
    ],
  } as unknown as PcbSilkscreenPath
  const b = getComprehensivePcbBounds([element])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([0, 6, 0, 4])
})
test("overflowing exterior retains legacy finite bounds", () => {
  const element = makePath(
    [
      { x: Number.MAX_VALUE, y: 0 },
      { x: Number.MAX_VALUE, y: 1 },
    ],
    Number.MAX_VALUE,
  )
  const b = getComprehensivePcbBounds([element])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([
    Number.MAX_VALUE,
    Number.MAX_VALUE,
    0,
    1,
  ])
})
test("parsed units have a visible stroke envelope", async () => {
  const element = pcb_silkscreen_path.parse({
    ...makePath(fixtures.horizontal),
    stroke_width: "0.5mm",
  })
  expect(element.stroke_width).toBe(0.5)
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
for (const layer of ["top", "bottom"] as const)
  test(`color map is retained ${layer}`, async () => {
    const pixels = await measure(
      convertCircuitJsonToPcbSvg([makePath(fixtures.diagonal, 0.5, layer)], {
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
test("frozen route and input remain unchanged", async () => {
  const element = Object.freeze({
    ...makePath(fixtures.corner),
    route: Object.freeze(fixtures.corner.map((p) => Object.freeze({ ...p }))),
  }) as unknown as PcbSilkscreenPath
  const before = structuredClone(element)
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(element).toEqual(before)
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("showPcbNotes keeps silkscreen visible", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makePath(fixtures.horizontal)], {
      ...noPadding,
      showPcbNotes: false,
    }),
  )
  expect(pixels.count).toBe(1)
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("explicit viewport preserves intentional clipping", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makePath(fixtures.diagonal)], {
      ...noPadding,
      viewport: { minX: 0, maxX: 6, minY: 0, maxY: 4 },
    }),
  )
  expect(pixels.crop).toBeGreaterThan(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("default padding fits the stroke", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makePath(fixtures.horizontal)], {
      width: 800,
      height: 600,
    }),
  )
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("board dimensions and requested crop remain nominal", () => {
  const board = {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 3, y: 0 },
    width: 6,
    height: 4,
  } as AnyCircuitElement
  const element = makePath(fixtures.horizontal)
  const b = getComprehensivePcbBounds([board, element])
  expect([b.boardMinX, b.boardMaxX, b.boardMinY, b.boardMaxY]).toEqual([
    0, 6, -2, 2,
  ])
  expect(convertCircuitJsonToPcbSvg([board, element], noPadding)).toBe(
    convertCircuitJsonToPcbSvg([board, element], {
      ...noPadding,
      viewport: { minX: 0, maxX: 6, minY: -2, maxY: 2 },
    }),
  )
})
test("physical pad and fabrication path retain legacy geometry", () => {
  const b = getComprehensivePcbBounds([pad])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([0, 6, -2, 2])
  const path = {
    type: "pcb_fabrication_note_path",
    pcb_fabrication_note_path_id: "fab",
    pcb_component_id: "component",
    layer: "top",
    route: fixtures.diagonal,
    stroke_width: 0.5,
  } as AnyCircuitElement
  const fb = getComprehensivePcbBounds([path])
  expect([fb.minX, fb.maxX, fb.minY, fb.maxY]).toEqual([0, 6, 0, 4])
})
