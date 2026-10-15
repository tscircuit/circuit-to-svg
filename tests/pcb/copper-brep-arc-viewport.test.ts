import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import { type AnyCircuitElement, pcb_copper_pour } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"
import { parse, stringify } from "svgson"

const options = { width: 800, height: 600, drawPaddingOutsideBoard: false }
type Vertex = { x: number; y: number; bulge?: number }
function makePour({
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
  const pour = pcb_copper_pour.parse({
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour",
    source_net_id: "net",
    covered_with_solder_mask: false,
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
  if (pour.shape !== "brep") throw new Error("Expected a BRep pour")
  return pour
}
type BrepPour = ReturnType<typeof makePour>
const extents = (element: BrepPour) => {
  const b = getComprehensivePcbBounds([element])
  return [b.minX, b.maxX, b.minY, b.maxY]
}
function expectBounds(element: BrepPour, values: number[]) {
  for (const [i, value] of values.entries())
    expect(extents(element)[i]).toBeCloseTo(value, 10)
}
async function measure(svg: string) {
  const tree = await parse(svg)
  tree.children = tree.children.filter(
    (node) => node.attributes["data-type"] === "pcb_copper_pour",
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
          const pour = makePour({ bulge, angle, offset, layer })
          const before = structuredClone(pour)
          const pixels = await measure(
            convertCircuitJsonToPcbSvg([pour], { ...options, layer }),
          )
          expect(pixels.count).toBe(1)
          expect(pixels.crop).toBe(0)
          expect(pixels.visible).toBeGreaterThan(0)
          expect(pixels.attributes?.["fill-rule"]).toBe("evenodd")
          expect(pour).toEqual(before)
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
    expectBounds(makePour({ bulge }), [...expected]))
test("rotated semicircle uses only extrema on its sweep", () =>
  expectBounds(makePour({ angle: 45 }), [
    -Math.SQRT1_2,
    Math.SQRT2 + 2,
    Math.SQRT2 - 2,
    5 * Math.SQRT1_2,
  ]))
for (const bulge of [1, -1, 2, -2])
  test(`closing edge keeps its arc ${bulge}`, async () => {
    const original = makePour({ bulge }).brep_shape.outer_ring.vertices
    const pour = makePour({
      vertices: [...original.slice(1), original[0]!],
    })
    expect(extents(pour)).toEqual(extents(makePour({ bulge })))
    const pixels = await measure(convertCircuitJsonToPcbSvg([pour], options))
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBeGreaterThan(0)
  })
test("reversing vertices and edge bulges preserves the painted shape", async () => {
  const original = makePour({ bulge: 2 }).brep_shape.outer_ring.vertices
  const vertices = original.map((_, i) => {
    const index = original.length - 1 - i
    return {
      ...original[index]!,
      bulge: -(
        original[(index - 1 + original.length) % original.length]?.bulge ?? 0
      ),
    }
  })
  const pour = makePour({ vertices })
  expectBounds(pour, [-0.5, 4.5, -4, 1])
  const pixels = await measure(convertCircuitJsonToPcbSvg([pour], options))
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
    const pour = makePour({ vertices })
    expect(getComprehensivePcbBounds([pour]).hasBounds).toBe(
      vertices.length > 0,
    )
    const pixels = await measure(
      convertCircuitJsonToPcbSvg([pad, pour], options),
    )
    expect(pixels.count).toBe(1)
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBe(0)
  })
test("two distinct vertices enclose a visible semicircle", async () => {
  const pour = makePour({
    vertices: [
      { x: 0, y: 0, bulge: 1 },
      { x: 4, y: 0 },
    ],
  })
  expectBounds(pour, [0, 4, -2, 0])
  const pixels = await measure(convertCircuitJsonToPcbSvg([pour], options))
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("zero length arc leaves the remaining straight polygon unchanged", () => {
  const pour = makePour({ bulge: 0 })
  pour.brep_shape.outer_ring.vertices.unshift({ x: 0, y: 0, bulge: 2 })
  expect(extents(pour)).toEqual([0, 4, 0, 1])
})
test("tiny chord is magnified and its arc remains visible", async () => {
  const pour = makePour()
  for (const v of pour.brep_shape.outer_ring.vertices) {
    v.x *= 1e-12
    v.y *= 1e-12
  }
  const pixels = await measure(convertCircuitJsonToPcbSvg([pour], options))
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("overflowing chord retains nominal bounds", () => {
  const pour = makePour({
    vertices: [
      { x: -Number.MAX_VALUE, y: 0, bulge: 1 },
      { x: Number.MAX_VALUE, y: 0 },
      { x: 0, y: 1 },
    ],
  })
  expect(extents(pour)).toEqual([-Number.MAX_VALUE, Number.MAX_VALUE, 0, 1])
})
test("maximum coordinates do not overflow midpoint addition", () => {
  const pour = makePour({
    vertices: [
      { x: Number.MAX_VALUE, y: 0, bulge: 1 },
      { x: Number.MAX_VALUE, y: 1 },
    ],
  })
  expect(extents(pour)).toEqual([Number.MAX_VALUE, Number.MAX_VALUE, 0, 1])
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
    const pour = makePour()
    const raw = pour as unknown as {
      brep_shape: { outer_ring: { vertices: Array<{ bulge?: unknown }> } }
    }
    raw.brep_shape.outer_ring.vertices[0]!.bulge = bulge
    expect(extents(pour)).toEqual([0, 4, 0, 1])
  })
for (const x of [undefined, null, Number.NaN, Symbol("coordinate")])
  test(`raw coordinate keeps its exception ${String(x)}`, () => {
    const pour = makePour()
    const raw = pour as unknown as {
      brep_shape: { outer_ring: { vertices: Array<{ x?: unknown }> } }
    }
    raw.brep_shape.outer_ring.vertices[0]!.x = x
    expect(() => extents(pour)).toThrow()
  })
test("raw invalid units preserve nominal NaN axes", () => {
  const pour = makePour()
  const raw = pour as unknown as {
    brep_shape: { outer_ring: { vertices: Array<{ x: unknown }> } }
  }
  raw.brep_shape.outer_ring.vertices[0]!.x = "invalid"
  expect(extents(pour)).toEqual([Number.NaN, Number.NaN, 0, 1])
})
test("raw unit coordinate keeps parsed nominal bounds", () => {
  const pour = makePour()
  const raw = pour as unknown as {
    brep_shape: { outer_ring: { vertices: Array<{ x: unknown }> } }
  }
  raw.brep_shape.outer_ring.vertices[0]!.x = "0mm"
  expect(extents(pour)).toEqual([0, 4, 0, 1])
})
test("infinite coordinate keeps nominal finite axes", () => {
  const pour = makePour()
  pour.brep_shape.outer_ring.vertices[0]!.x = Number.POSITIVE_INFINITY
  expect(extents(pour)).toEqual([0, Number.POSITIVE_INFINITY, 0, 1])
})
for (const layer of ["top", "bottom"] as const)
  test(`layer and color remain unchanged ${layer}`, async () => {
    const pour = makePour({ layer })
    const colors = { copper: { top: "#00aa66", bottom: "#9955ff" } }
    const pixels = await measure(
      convertCircuitJsonToPcbSvg([pour], {
        ...options,
        layer,
        colorOverrides: colors,
      }),
    )
    expect(pixels.attributes?.fill).toBe(
      layer === "top" ? "#00aa66" : "#9955ff",
    )
    expect(pixels.attributes?.["fill-opacity"]).toBe("0.5")
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBeGreaterThan(0)
    const hidden = await measure(
      convertCircuitJsonToPcbSvg([pour], {
        ...options,
        layer: layer === "top" ? "bottom" : "top",
      }),
    )
    expect(hidden.count).toBe(0)
    expect(hidden.visible).toBe(0)
  })
test("straight ring retains its nominal bounds", async () => {
  const pour = makePour({ bulge: 0 })
  expect(extents(pour)).toEqual([0, 4, 0, 1])
  const pixels = await measure(convertCircuitJsonToPcbSvg([pour], options))
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("frozen input is not mutated", async () => {
  const pour = makePour({ bulge: -2 })
  for (const v of pour.brep_shape.outer_ring.vertices) Object.freeze(v)
  Object.freeze(pour.brep_shape.outer_ring.vertices)
  Object.freeze(pour.brep_shape.outer_ring)
  Object.freeze(pour.brep_shape)
  Object.freeze(pour)
  const before = structuredClone(pour)
  const pixels = await measure(convertCircuitJsonToPcbSvg([pour], options))
  expect(pour).toEqual(before)
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("explicit crop still clips the painted arc", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makePour()], {
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
  const pour = makePour()
  const b = getComprehensivePcbBounds([board, pour])
  expect([b.boardMinX, b.boardMaxX, b.boardMinY, b.boardMaxY]).toEqual([
    0, 4, 0, 1,
  ])
  expect(convertCircuitJsonToPcbSvg([board, pour], options)).toBe(
    convertCircuitJsonToPcbSvg([board, pour], {
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
    const pour = makePour(fixture)
    expect(
      convertCircuitJsonToPcbSvg([pour], {
        ...options,
        layer: pour.layer,
      }),
    ).toMatchSvgSnapshot(`${import.meta.path}-${name}`)
  })
test("contained inner arc preserves nominal outer bounds", async () => {
  const pour = makePour({
    vertices: [
      { x: -3, y: -4 },
      { x: 7, y: -4 },
      { x: 7, y: 3 },
      { x: -3, y: 3 },
    ],
  })
  pour.brep_shape.inner_rings = [makePour().brep_shape.outer_ring]
  expectBounds(pour, [-3, 7, -4, 3])
  const svg = convertCircuitJsonToPcbSvg([pour], options)
  const pixels = await measure(svg)
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
  expect(svg).toMatchSvgSnapshot(`${import.meta.path}-inner`)
})

for (const covered of [false, true])
  test(`soldermask shares the bounded copper arc ${covered}`, async () => {
    const pour = makePour({ bulge: 2 })
    pour.covered_with_solder_mask = covered
    const svg = convertCircuitJsonToPcbSvg([pour], {
      ...options,
      showSolderMask: true,
    })
    const tree = await parse(svg)
    const copper = tree.children.find(
      (node) => node.attributes["data-type"] === "pcb_copper_pour",
    )
    const mask = tree.children.find(
      (node) =>
        node.attributes.class ===
        (covered ? "pcb-soldermask-covered-pour" : "pcb-soldermask-cutout"),
    )
    expect(copper?.attributes.d).toBeDefined()
    expect(mask?.attributes.d).toBe(copper?.attributes.d)
    const pixels = await measure(svg)
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBeGreaterThan(0)
    expect(svg).toMatchSvgSnapshot(`${import.meta.path}-mask-${covered}`)
  })
