import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import {
  type AnyCircuitElement,
  type PcbNotePath,
  pcb_note_path,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"
import { parse, stringify } from "svgson"
const routes = {
  diagonal: [
    { x: 0, y: 0 },
    { x: 6, y: 4 },
  ],
  reverse: [
    { x: 6, y: 4 },
    { x: 0, y: 0 },
  ],
  horizontal: [
    { x: 0, y: 2 },
    { x: 6, y: 2 },
  ],
  vertical: [
    { x: 2, y: 0 },
    { x: 2, y: 4 },
  ],
  rightAngle: [
    { x: 0, y: 0 },
    { x: 3, y: 0 },
    { x: 3, y: 4 },
  ],
  nearMiterLimit: [
    { x: -1.05, y: -4 },
    { x: 0, y: 0 },
    { x: 1.05, y: -4 },
  ],
  bevel: [
    { x: -0.5, y: -4 },
    { x: 0, y: 0 },
    { x: 0.5, y: -4 },
  ],
  zigzag: [
    { x: 0, y: 0 },
    { x: 2, y: 3 },
    { x: 4, y: 0 },
    { x: 6, y: 3 },
  ],
  duplicate: [
    { x: 0, y: 0 },
    { x: 3, y: 4 },
    { x: 3, y: 4 },
    { x: 6, y: 0 },
  ],
  return: [
    { x: 0, y: 0 },
    { x: 6, y: 4 },
    { x: 0, y: 0 },
  ],
  closed: [
    { x: 0, y: 0 },
    { x: 6, y: 0 },
    { x: 3, y: 4 },
    { x: 0, y: 0 },
  ],
  straight: [
    { x: 0, y: 0 },
    { x: 3, y: 2 },
    { x: 6, y: 4 },
  ],
  point: [{ x: 2, y: -3 }],
  repeatedPoint: [
    { x: 2, y: -3 },
    { x: 2, y: -3 },
    { x: 2, y: -3 },
  ],
  empty: [],
}
const widths = [0.05, 0.4, 1]
async function measure(svg: string) {
  const tree = await parse(svg)
  tree.children = tree.children.filter(
    (n) => n.attributes["data-type"] === "pcb_note_path",
  )
  const isolated = stringify(tree)
  tree.attributes = {
    ...tree.attributes,
    width: "1600",
    height: "1400",
    viewBox: "-400 -400 1600 1400",
  }
  const pixels = new Resvg(stringify(tree)).render().pixels
  let crop = 0
  let visible = 0
  for (let y = 0; y < 1400; y++)
    for (let x = 0; x < 1600; x++)
      if (pixels[(y * 1600 + x) * 4 + 3]) {
        if (x < 400 || x >= 1200 || y < 400 || y >= 1000) crop++
        else visible++
      }
  return { crop, visible, isolated, attributes: tree.children[0]?.attributes }
}

const noPadding = { width: 800, height: 600, drawPaddingOutsideBoard: false }
const makePath = (route: { x: number; y: number }[], stroke_width = 0.4) =>
  pcb_note_path.parse({
    type: "pcb_note_path",
    pcb_note_path_id: "path",
    route,
    stroke_width,
  })
for (const [name, route] of Object.entries(routes))
  for (const width of widths) {
    test(`note path stroke fits viewport ${name} ${width}`, async () => {
      const element = makePath(route, width)
      const before = structuredClone(element)
      const bounds = getComprehensivePcbBounds([element])
      const first = route[0]
      const painted =
        !!first && route.some((p) => p.x !== first.x || p.y !== first.y)
      if (first) {
        const padding = painted ? width * (route.length > 2 ? 2 : 0.5) : 0
        expect(bounds.minX).toBeCloseTo(
          Math.min(...route.map((p) => p.x)) - padding,
          12,
        )
        expect(bounds.maxX).toBeCloseTo(
          Math.max(...route.map((p) => p.x)) + padding,
          12,
        )
        expect(bounds.minY).toBeCloseTo(
          Math.min(...route.map((p) => p.y)) - padding,
          12,
        )
        expect(bounds.maxY).toBeCloseTo(
          Math.max(...route.map((p) => p.y)) + padding,
          12,
        )
      } else expect(bounds.hasBounds).toBe(false)
      const pixels = await measure(
        convertCircuitJsonToPcbSvg([element], noPadding),
      )
      expect(pixels.crop).toBe(0)
      if (painted) expect(pixels.visible).toBeGreaterThan(0)
      else expect(pixels.visible).toBe(0)
      expect(element).toEqual(before)
    })
  }
for (const name of [
  "diagonal",
  "rightAngle",
  "nearMiterLimit",
  "bevel",
] as const) {
  test(`note path viewport snapshot ${name}`, () =>
    expect(
      convertCircuitJsonToPcbSvg([makePath(routes[name])], noPadding),
    ).toMatchSvgSnapshot(`${import.meta.path}-${name}`))
}
for (const stroke_width of [
  undefined,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  -1,
  0,
]) {
  test(`invalid and invisible widths retain route bounds ${stroke_width}`, () => {
    const element = {
      ...makePath(routes.diagonal),
      stroke_width,
    } as PcbNotePath
    const bounds = getComprehensivePcbBounds([element])
    expect([bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]).toEqual([
      0, 6, 0, 4,
    ])
  })
}
test("zero width paints nothing", async () => {
  const p = await measure(
    convertCircuitJsonToPcbSvg([makePath(routes.diagonal, 0)], noPadding),
  )
  expect(p.crop).toBe(0)
  expect(p.visible).toBe(0)
})
test("unparsed units retain legacy route fallback", () => {
  const element = {
    ...makePath(routes.diagonal),
    route: [
      { x: "0mm", y: "0mm" },
      { x: "6mm", y: "4mm" },
    ],
  } as unknown as PcbNotePath
  const b = getComprehensivePcbBounds([element])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([0, 6, 0, 4])
})
test("overflowing stroke bounds retain route fallback", () => {
  const element = makePath(routes.rightAngle, Number.MAX_VALUE)
  const b = getComprehensivePcbBounds([element])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([0, 3, 0, 4])
})
test("overflowing envelope diameter retains route fallback", () => {
  const b = getComprehensivePcbBounds([makePath(routes.rightAngle, 8e307)])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([0, 3, 0, 4])
})
test("explicit viewport retains intentional crop", async () => {
  const p = await measure(
    convertCircuitJsonToPcbSvg([makePath(routes.nearMiterLimit)], {
      ...noPadding,
      viewport: { minX: -2, maxX: 2, minY: -4, maxY: 0 },
    }),
  )
  expect(p.crop).toBeGreaterThan(0)
  expect(p.visible).toBeGreaterThan(0)
})
test("default padding fits note path", async () => {
  const p = await measure(
    convertCircuitJsonToPcbSvg([makePath(routes.nearMiterLimit)], {
      width: 800,
      height: 600,
    }),
  )
  expect(p.crop).toBe(0)
  expect(p.visible).toBeGreaterThan(0)
})
test("board keeps its intentional crop", () => {
  const board = {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: -2 },
    width: 4,
    height: 4,
  } as AnyCircuitElement
  const note = makePath(routes.nearMiterLimit)
  const b = getComprehensivePcbBounds([board, note])
  expect([b.boardMinX, b.boardMaxX, b.boardMinY, b.boardMaxY]).toEqual([
    -2, 2, -4, 0,
  ])
  expect(convertCircuitJsonToPcbSvg([board, note], noPadding)).toBe(
    convertCircuitJsonToPcbSvg([board, note], {
      ...noPadding,
      viewport: { minX: -2, maxX: 2, minY: -4, maxY: 0 },
    }),
  )
})
test("frozen input and color are retained", async () => {
  const element = Object.freeze({
    ...makePath(routes.nearMiterLimit),
    color: "#00aa66",
    route: Object.freeze(
      routes.nearMiterLimit.map((p) => Object.freeze({ ...p })),
    ),
  }) as unknown as PcbNotePath
  const before = structuredClone(element)
  expect(getComprehensivePcbBounds([element]).hasBounds).toBe(true)
  const p = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(p.crop).toBe(0)
  expect(p.visible).toBeGreaterThan(0)
  expect(element).toEqual(before)
})
test("physical pad and fabrication path keep nominal bounds", () => {
  for (const element of [
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad",
      shape: "rect",
      x: 3,
      y: 2,
      width: 6,
      height: 4,
      layer: "top",
    },
    {
      type: "pcb_fabrication_note_path",
      pcb_fabrication_note_path_id: "fab",
      route: routes.diagonal,
      stroke_width: 0.4,
      layer: "top",
    },
  ] as AnyCircuitElement[]) {
    const b = getComprehensivePcbBounds([element])
    expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([0, 6, 0, 4])
  }
})

test("missing raw route retains old invisible fallback", async () => {
  const element = {
    type: "pcb_note_path",
    pcb_note_path_id: "raw",
    stroke_width: 0.4,
  } as unknown as PcbNotePath
  expect(getComprehensivePcbBounds([element]).hasBounds).toBe(false)
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBe(0)
})
