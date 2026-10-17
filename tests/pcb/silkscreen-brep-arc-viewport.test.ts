import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import {
  type AnyCircuitElement,
  type PcbSilkscreenGraphic,
  pcb_silkscreen_graphic,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"
import { parse, stringify } from "svgson"

const options = { width: 800, height: 600, drawPaddingOutsideBoard: false }
type Vertex = { x: number; y: number; bulge?: number }
function makeGraphic({
  bulge = 1,
  angle = 0,
  offset = { x: 0, y: 0 },
  layer = "top",
  vertices,
}: {
  bulge?: number
  angle?: number
  offset?: { x: number; y: number }
  layer?: "top" | "bottom"
  vertices?: Vertex[]
} = {}) {
  const radians = (angle * Math.PI) / 180
  return pcb_silkscreen_graphic.parse({
    type: "pcb_silkscreen_graphic",
    pcb_silkscreen_graphic_id: "graphic",
    pcb_component_id: "component",
    shape: "brep",
    layer,
    brep_shape: {
      outer_ring: {
        vertices:
          vertices ??
          [
            { x: 0, y: 0, bulge },
            { x: 4, y: 0 },
            { x: 4, y: bulge < 0 ? -1 : 1 },
            { x: 0, y: bulge < 0 ? -1 : 1 },
          ].map((v) => ({
            ...v,
            x: v.x * Math.cos(radians) - v.y * Math.sin(radians) + offset.x,
            y: v.x * Math.sin(radians) + v.y * Math.cos(radians) + offset.y,
          })),
      },
      inner_rings: [],
    },
  })
}
const extents = (element: PcbSilkscreenGraphic) => {
  const b = getComprehensivePcbBounds([element])
  return [b.minX, b.maxX, b.minY, b.maxY]
}
function expectBounds(element: PcbSilkscreenGraphic, values: number[]) {
  for (const [i, value] of values.entries())
    expect(extents(element)[i]).toBeCloseTo(value, 10)
}
async function measure(svg: string) {
  const tree = await parse(svg)
  tree.children = tree.children.filter(
    (node) => node.attributes["data-type"] === "pcb_silkscreen_graphic",
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
  // 元のviewportと描画量を別々に確認し、空の画像を成功に数えません。
  for (let y = 0; y < 350; y++)
    for (let x = 0; x < 400; x++)
      if (pixels[(y * 400 + x) * 4 + 3]) {
        if (x < 100 || x >= 300 || y < 100 || y >= 250) crop++
        else visible++
      }
  return { count, attributes, crop, visible }
}
for (const bulge of [0.5, 1, 2, -0.5, -1, -2])
  for (const angle of [0, 45, 90])
    for (const offset of [
      { x: 0, y: 0 },
      { x: 2, y: -3 },
    ])
      for (const layer of ["top", "bottom"] as const)
        test(`arc fits ${bulge} ${angle} ${offset.x} ${layer}`, async () => {
          const graphic = makeGraphic({ bulge, angle, offset, layer })
          const before = structuredClone(graphic)
          const pixels = await measure(
            convertCircuitJsonToPcbSvg([graphic], { ...options, layer }),
          )
          expect(pixels.count).toBe(1)
          expect(pixels.crop).toBe(0)
          expect(pixels.visible).toBeGreaterThan(0)
          expect(pixels.attributes?.["fill-rule"]).toBe("evenodd")
          expect(graphic).toEqual(before)
        })
for (const [bulge, expected] of [
  [0.5, [0, 4, -1, 1]],
  [-0.5, [0, 4, -1, 1]],
  [1, [0, 4, -2, 1]],
  [-1, [0, 4, -1, 2]],
  [2, [-0.5, 4.5, -4, 1]],
  [-2, [-0.5, 4.5, -1, 4]],
] as const)
  test(`independent extrema for ${bulge}`, () =>
    expectBounds(makeGraphic({ bulge }), [...expected]))
test("rotated semicircle uses only extrema on its sweep", () =>
  expectBounds(makeGraphic({ angle: 45 }), [
    -Math.SQRT1_2,
    Math.SQRT2 + 2,
    Math.SQRT2 - 2,
    5 * Math.SQRT1_2,
  ]))
for (const bulge of [1, -1, 2, -2])
  test(`closing edge keeps its arc ${bulge}`, async () => {
    const original = makeGraphic({ bulge }).brep_shape.outer_ring.vertices
    const graphic = makeGraphic({
      vertices: [...original.slice(1), original[0]!],
    })
    expect(extents(graphic)).toEqual(extents(makeGraphic({ bulge })))
    const pixels = await measure(convertCircuitJsonToPcbSvg([graphic], options))
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBeGreaterThan(0)
  })
test("reversing vertices and edge bulges preserves the painted shape", async () => {
  const original = makeGraphic({ bulge: 2 }).brep_shape.outer_ring.vertices
  const vertices = original.map((_, i) => {
    const index = original.length - 1 - i
    return {
      ...original[index]!,
      bulge: -(
        original[(index - 1 + original.length) % original.length]?.bulge ?? 0
      ),
    }
  })
  const graphic = makeGraphic({ vertices })
  expectBounds(graphic, [-0.5, 4.5, -4, 1])
  const pixels = await measure(convertCircuitJsonToPcbSvg([graphic], options))
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
const pad = {
  type: "pcb_smtpad",
  pcb_smtpad_id: "pad",
  shape: "rect",
  x: 0,
  y: 0,
  width: 2,
  height: 2,
  layer: "top",
} as AnyCircuitElement
for (const vertices of [
  [],
  [{ x: 0, y: 0, bulge: 1 }],
  [
    { x: 0, y: 0, bulge: 1 },
    { x: 0, y: 0 },
  ],
])
  test(`degenerate ring remains invisible ${vertices.length}`, async () => {
    const graphic = makeGraphic({ vertices })
    expect(getComprehensivePcbBounds([graphic]).hasBounds).toBe(
      vertices.length > 0,
    )
    const pixels = await measure(
      convertCircuitJsonToPcbSvg([pad, graphic], options),
    )
    expect(pixels.count).toBe(1)
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBe(0)
  })
test("two distinct vertices enclose a visible semicircle", async () => {
  const graphic = makeGraphic({
    vertices: [
      { x: 0, y: 0, bulge: 1 },
      { x: 4, y: 0 },
    ],
  })
  expectBounds(graphic, [0, 4, -2, 0])
  const pixels = await measure(convertCircuitJsonToPcbSvg([graphic], options))
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("zero length arc leaves the remaining straight polygon unchanged", () => {
  const graphic = makeGraphic({ bulge: 0 })
  graphic.brep_shape.outer_ring.vertices.unshift({ x: 0, y: 0, bulge: 2 })
  expect(extents(graphic)).toEqual([0, 4, 0, 1])
})
test("tiny chord is magnified and its arc remains visible", async () => {
  const graphic = makeGraphic()
  for (const v of graphic.brep_shape.outer_ring.vertices) {
    v.x *= 1e-12
    v.y *= 1e-12
  }
  const pixels = await measure(convertCircuitJsonToPcbSvg([graphic], options))
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("overflowing chord retains nominal bounds", () => {
  const graphic = makeGraphic({
    vertices: [
      { x: -Number.MAX_VALUE, y: 0, bulge: 1 },
      { x: Number.MAX_VALUE, y: 0 },
      { x: 0, y: 1 },
    ],
  })
  expect(extents(graphic)).toEqual([-Number.MAX_VALUE, Number.MAX_VALUE, 0, 1])
})
test("maximum coordinates do not overflow midpoint addition", () => {
  const graphic = makeGraphic({
    vertices: [
      { x: Number.MAX_VALUE, y: 0, bulge: 1 },
      { x: Number.MAX_VALUE, y: 1 },
    ],
  })
  expect(extents(graphic)).toEqual([Number.MAX_VALUE, Number.MAX_VALUE, 0, 1])
})
for (const bulge of [
  null,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  "1",
  true,
  Symbol("bulge"),
])
  test(`raw bulge retains nominal bounds ${String(bulge)}`, () => {
    const graphic = makeGraphic()
    const raw = graphic as unknown as {
      brep_shape: { outer_ring: { vertices: Array<{ bulge?: unknown }> } }
    }
    raw.brep_shape.outer_ring.vertices[0]!.bulge = bulge
    expect(extents(graphic)).toEqual([0, 4, 0, 1])
  })
for (const x of [undefined, null, Number.NaN, Symbol("coordinate")])
  test(`raw coordinate keeps its exception ${String(x)}`, () => {
    const graphic = makeGraphic()
    const raw = graphic as unknown as {
      brep_shape: { outer_ring: { vertices: Array<{ x?: unknown }> } }
    }
    raw.brep_shape.outer_ring.vertices[0]!.x = x
    expect(() => extents(graphic)).toThrow()
  })
test("raw invalid units preserve nominal NaN axes", () => {
  const graphic = makeGraphic()
  const raw = graphic as unknown as {
    brep_shape: { outer_ring: { vertices: Array<{ x: unknown }> } }
  }
  raw.brep_shape.outer_ring.vertices[0]!.x = "invalid"
  expect(extents(graphic)).toEqual([Number.NaN, Number.NaN, 0, 1])
})
test("raw unit coordinate keeps parsed nominal bounds", () => {
  const graphic = makeGraphic()
  const raw = graphic as unknown as {
    brep_shape: { outer_ring: { vertices: Array<{ x: unknown }> } }
  }
  raw.brep_shape.outer_ring.vertices[0]!.x = "0mm"
  expect(extents(graphic)).toEqual([0, 4, 0, 1])
})
test("infinite coordinate keeps nominal finite axes", () => {
  const graphic = makeGraphic()
  graphic.brep_shape.outer_ring.vertices[0]!.x = Number.POSITIVE_INFINITY
  expect(extents(graphic)).toEqual([0, Number.POSITIVE_INFINITY, 0, 1])
})
for (const layer of ["top", "bottom"] as const)
  test(`layer and color remain unchanged ${layer}`, async () => {
    const graphic = makeGraphic({ layer })
    const colors = { silkscreen: { top: "#00aa66", bottom: "#9955ff" } }
    const pixels = await measure(
      convertCircuitJsonToPcbSvg([graphic], {
        ...options,
        layer,
        colorOverrides: colors,
      }),
    )
    expect(pixels.attributes?.fill).toBe(
      layer === "top" ? "#00aa66" : "#9955ff",
    )
    expect(pixels.attributes?.stroke).toBe("none")
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBeGreaterThan(0)
    const hidden = await measure(
      convertCircuitJsonToPcbSvg([graphic], {
        ...options,
        layer: layer === "top" ? "bottom" : "top",
      }),
    )
    expect(hidden.count).toBe(0)
    expect(hidden.visible).toBe(0)
  })
test("straight ring retains its nominal bounds", async () => {
  const graphic = makeGraphic({ bulge: 0 })
  expect(extents(graphic)).toEqual([0, 4, 0, 1])
  const pixels = await measure(convertCircuitJsonToPcbSvg([graphic], options))
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("frozen input is not mutated", async () => {
  const graphic = makeGraphic({ bulge: -2 })
  for (const v of graphic.brep_shape.outer_ring.vertices) Object.freeze(v)
  Object.freeze(graphic.brep_shape.outer_ring.vertices)
  Object.freeze(graphic.brep_shape.outer_ring)
  Object.freeze(graphic.brep_shape)
  Object.freeze(graphic)
  const before = structuredClone(graphic)
  const pixels = await measure(convertCircuitJsonToPcbSvg([graphic], options))
  expect(graphic).toEqual(before)
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("explicit crop still clips the painted arc", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makeGraphic()], {
      ...options,
      viewport: { minX: 0, maxX: 4, minY: 0, maxY: 1 },
    }),
  )
  expect(pixels.crop).toBeGreaterThan(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("physical board and camera stay nominal", () => {
  const board = {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 2, y: 0.5 },
    width: 4,
    height: 1,
  } as AnyCircuitElement
  const graphic = makeGraphic()
  const b = getComprehensivePcbBounds([board, graphic])
  expect([b.boardMinX, b.boardMaxX, b.boardMinY, b.boardMaxY]).toEqual([
    0, 4, 0, 1,
  ])
  expect(convertCircuitJsonToPcbSvg([board, graphic], options)).toBe(
    convertCircuitJsonToPcbSvg([board, graphic], {
      ...options,
      viewport: { minX: 0, maxX: 4, minY: 0, maxY: 1 },
    }),
  )
})
test("pad keeps its nominal bounds", () => {
  const b = getComprehensivePcbBounds([pad])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([-1, 1, -1, 1])
})
for (const [name, fixture] of Object.entries({
  semicircle: {},
  major: { bulge: 2 },
  negative: { bulge: -2, layer: "bottom" as const },
  rotated: { angle: 45 },
}))
  test(`arc viewport snapshot ${name}`, () => {
    const graphic = makeGraphic(fixture)
    expect(
      convertCircuitJsonToPcbSvg([graphic], {
        ...options,
        layer: graphic.layer,
      }),
    ).toMatchSvgSnapshot(`${import.meta.path}-${name}`)
  })
function withInnerRing(disjoint: boolean) {
  const graphic = makeGraphic({
    bulge: 0,
    vertices: disjoint
      ? [
          { x: -3, y: -1 },
          { x: -1, y: -1 },
          { x: -1, y: 1 },
          { x: -3, y: 1 },
        ]
      : [
          { x: -3, y: -4 },
          { x: 7, y: -4 },
          { x: 7, y: 3 },
          { x: -3, y: 3 },
        ],
  })
  graphic.brep_shape.inner_rings = [makeGraphic().brep_shape.outer_ring]
  return graphic
}
for (const disjoint of [false, true])
  test(`inner ring retains its painted arc ${disjoint}`, async () => {
    const graphic = withInnerRing(disjoint)
    expectBounds(graphic, disjoint ? [-3, 4, -2, 1] : [-3, 7, -4, 3])
    const pixels = await measure(convertCircuitJsonToPcbSvg([graphic], options))
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBeGreaterThan(0)
    expect(convertCircuitJsonToPcbSvg([graphic], options)).toMatchSvgSnapshot(
      `${import.meta.path}-inner-${disjoint}`,
    )
  })
