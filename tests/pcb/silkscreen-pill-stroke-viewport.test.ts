import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import {
  type AnyCircuitElement,
  type PcbSilkscreenPill,
  pcb_silkscreen_pill,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"
import { parse, stringify } from "svgson"
const noPadding = { width: 800, height: 600, drawPaddingOutsideBoard: false }
const makePill = (options: Partial<PcbSilkscreenPill> = {}) =>
  pcb_silkscreen_pill.parse({
    type: "pcb_silkscreen_pill",
    pcb_silkscreen_pill_id: "pill",
    pcb_component_id: "component",
    center: { x: 2, y: -3 },
    width: 4,
    height: 2,
    layer: "top",
    ...options,
  })
const extents = (element: PcbSilkscreenPill) => {
  const b = getComprehensivePcbBounds([element])
  return [b.minX, b.maxX, b.minY, b.maxY]
}
function expectNearBounds(element: PcbSilkscreenPill, expected: number[]) {
  const actual = extents(element)
  for (const [index, value] of expected.entries())
    expect(actual[index]).toBeCloseTo(value, 10)
}
async function measure(svg: string) {
  const tree = await parse(svg)
  tree.children = tree.children.filter(
    (n) => n.attributes["data-type"] === "pcb_silkscreen_pill",
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
  // 元viewBoxを維持し、小さなバッファで範囲外の実描画を検出します。
  for (let y = 0; y < 350; y++)
    for (let x = 0; x < 400; x++)
      if (pixels[(y * 400 + x) * 4 + 3]) {
        if (x < 100 || x >= 300 || y < 100 || y >= 250) crop++
        else visible++
      }
  return { count, attributes, crop, visible }
}
for (const center of [
  { x: 0, y: 0 },
  { x: 2, y: -3 },
])
  for (const [width, height] of [
    [4, 2],
    [2, 4],
    [2, 2],
  ] as const)
    for (const ccw_rotation of [0, 1, 45, 89, 90, 180])
      for (const layer of ["top", "bottom"] as const)
        test(`pill stroke fits ${center.x} ${width} ${height} ${ccw_rotation} ${layer}`, async () => {
          const element = makePill({
            center,
            width,
            height,
            ccw_rotation,
            layer,
          })
          const before = structuredClone(element)
          const pixels = await measure(
            convertCircuitJsonToPcbSvg([element], { ...noPadding, layer }),
          )
          expect(pixels.count).toBe(1)
          expect(pixels.crop).toBe(0)
          expect(pixels.visible).toBeGreaterThan(0)
          expect(pixels.attributes?.fill).toBe("none")
          expect(element).toEqual(before)
        })
test("horizontal capsule includes fixed half stroke", () =>
  expectNearBounds(makePill(), [-0.05, 4.05, -4.05, -1.95]))
test("vertical capsule includes fixed half stroke", () =>
  expectNearBounds(makePill({ ccw_rotation: 90 }), [0.95, 3.05, -5.05, -0.95]))
test("diagonal capsule retains the larger legacy box without extra corner padding", () =>
  expectNearBounds(
    makePill({ ccw_rotation: 45 }),
    [
      -0.1213203435596424, 4.121320343559642, -5.121320343559642,
      -0.8786796564403576,
    ],
  ))
test("one degree capsule uses circular end extents instead of rotated rectangle corners", () =>
  expectNearBounds(
    makePill({ ccw_rotation: 1 }),
    [
      -0.049847695156391, 4.049847695156391, -4.067452406437283,
      -1.932547593562716,
    ],
  ))
for (const ccw_rotation of [-45, 270, 360])
  test(`additional rotation fits ${ccw_rotation}`, async () => {
    const pixels = await measure(
      convertCircuitJsonToPcbSvg([makePill({ ccw_rotation })], noPadding),
    )
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBeGreaterThan(0)
  })
for (const [width, height] of [
  [0, 2],
  [4, 0],
  [0, 0],
] as const)
  for (const layer of ["top", "bottom"] as const)
    test(`zero dimension ${width} ${height} ${layer}`, async () => {
      const element = makePill({ width, height, layer })
      const pixels = await measure(
        convertCircuitJsonToPcbSvg([element], { ...noPadding, layer }),
      )
      expect(extents(element)).toEqual([
        2 - width / 2,
        2 + width / 2,
        -3 - height / 2,
        -3 + height / 2,
      ])
      expect(pixels.count).toBe(1)
      expect(pixels.crop).toBe(0)
      expect(pixels.visible).toBe(0)
    })
for (const dimension of ["width", "height"] as const) {
  test(`negative ${dimension} retains inverted bounds`, () =>
    expect(extents({ ...makePill(), [dimension]: -2 })).toEqual(
      dimension === "width" ? [3, 1, -4, -2] : [0, 4, -2, -4],
    ))
  for (const value of [undefined, null, Number.NaN, Symbol("dimension")])
    test(`malformed ${dimension} keeps exception ${String(value)}`, () =>
      expect(() =>
        extents({
          ...makePill(),
          [dimension]: value,
        } as unknown as PcbSilkscreenPill),
      ).toThrow())
  test(`raw infinite ${dimension} keeps old bounds`, () =>
    expect(
      extents({ ...makePill(), [dimension]: Number.POSITIVE_INFINITY }),
    ).toEqual(
      dimension === "width"
        ? [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, -4, -2]
        : [0, 4, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
    ))
}
for (const ccw_rotation of [null, "45deg", Symbol("angle")])
  test(`raw nonnumeric rotation preserves nominal bounds ${String(ccw_rotation)}`, () =>
    expect(
      extents({ ...makePill(), ccw_rotation } as unknown as PcbSilkscreenPill),
    ).toEqual([0, 4, -4, -2]))
for (const ccw_rotation of [
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.MAX_VALUE,
])
  test(`nonfinite angle retains NaN bounds ${ccw_rotation}`, () =>
    expect(extents({ ...makePill(), ccw_rotation })).toEqual([
      Number.NaN,
      Number.NaN,
      Number.NaN,
      Number.NaN,
    ]))
test("raw undefined rotation uses zero", async () => {
  const element = { ...makePill(), ccw_rotation: undefined }
  expectNearBounds(element, [-0.05, 4.05, -4.05, -1.95])
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("raw units keep parsed nominal bounds", () =>
  expect(
    extents({
      ...makePill(),
      width: "4mm",
      height: "2mm",
      center: { x: "2mm", y: "-3mm" },
    } as unknown as PcbSilkscreenPill),
  ).toEqual([0, 4, -4, -2]))
test("parsed units include visible fixed stroke", async () => {
  const element = pcb_silkscreen_pill.parse({
    ...makePill(),
    width: "4mm",
    height: "2mm",
    center: { x: "2mm", y: "-3mm" },
  })
  expectNearBounds(element, [-0.05, 4.05, -4.05, -1.95])
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("missing center keeps empty bounds", () =>
  expect(
    getComprehensivePcbBounds([
      { ...makePill(), center: undefined } as unknown as PcbSilkscreenPill,
    ]).hasBounds,
  ).toBe(false))
test("overflowing geometry keeps the old infinite extents", () =>
  expect(
    extents(
      makePill({
        center: { x: Number.MAX_VALUE, y: 0 },
        width: Number.MAX_VALUE,
        height: 2,
      }),
    ),
  ).toEqual([Number.MAX_VALUE / 2, Number.POSITIVE_INFINITY, -1, 1]))
test("nonfinite center keeps its legacy exception", () =>
  expect(() =>
    extents({ ...makePill(), center: { x: Number.NaN, y: 0 } }),
  ).toThrow())
for (const layer of ["top", "bottom"] as const) {
  test(`custom color stays visible ${layer}`, async () => {
    const pixels = await measure(
      convertCircuitJsonToPcbSvg([makePill({ layer })], {
        ...noPadding,
        layer,
        colorOverrides: { silkscreen: { top: "#00aa66", bottom: "#9955ff" } },
      }),
    )
    expect(pixels.attributes?.stroke).toBe(
      layer === "top" ? "#00aa66" : "#9955ff",
    )
    expect(pixels.attributes?.fill).toBe("none")
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBeGreaterThan(0)
  })
  test(`mismatching layer remains invisible ${layer}`, async () => {
    const pixels = await measure(
      convertCircuitJsonToPcbSvg([makePill({ layer })], {
        ...noPadding,
        layer: layer === "top" ? "bottom" : "top",
      }),
    )
    expect(pixels.count).toBe(0)
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBe(0)
  })
}
test("raw default layer stays visible on top", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg(
      [{ ...makePill(), layer: undefined } as unknown as PcbSilkscreenPill],
      { ...noPadding, layer: "top" },
    ),
  )
  expect(pixels.count).toBe(1)
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("frozen input remains unchanged", async () => {
  const element = Object.freeze({
    ...makePill(),
    center: Object.freeze({ x: 2, y: -3 }),
  })
  const before = structuredClone(element)
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(element).toEqual(before)
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("notes visibility keeps the pill visible", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makePill()], {
      ...noPadding,
      showPcbNotes: false,
    }),
  )
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("explicit crop preserves intentional clipping", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makePill()], {
      ...noPadding,
      viewport: { minX: 0, maxX: 4, minY: -4, maxY: -2 },
    }),
  )
  expect(pixels.crop).toBeGreaterThan(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("default padding encloses a rotated capsule", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makePill({ ccw_rotation: 90 })], {
      width: 800,
      height: 600,
    }),
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
  horizontal: {},
  vertical: { ccw_rotation: 90 },
  diagonal: { ccw_rotation: 45 },
  bottom: { layer: "bottom" as const },
  circle: { width: 2, height: 2 },
}))
  test(`pill stroke snapshot ${name}`, () => {
    const element = makePill(options)
    expect(
      convertCircuitJsonToPcbSvg([element], {
        ...noPadding,
        layer: element.layer,
      }),
    ).toMatchSvgSnapshot(`${import.meta.path}-${name}`)
  })
test("mismatch snapshot preserves pad", () =>
  expect(
    convertCircuitJsonToPcbSvg([pad, makePill({ layer: "bottom" })], {
      ...noPadding,
      layer: "top",
    }),
  ).toMatchSvgSnapshot(`${import.meta.path}-nonmatching`))
test("board dimensions and its automatic camera remain nominal", () => {
  const board = {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 2, y: -3 },
    width: 4,
    height: 2,
  } as AnyCircuitElement
  const b = getComprehensivePcbBounds([board, makePill()])
  expect([b.boardMinX, b.boardMaxX, b.boardMinY, b.boardMaxY]).toEqual([
    0, 4, -4, -2,
  ])
  expect(convertCircuitJsonToPcbSvg([board, makePill()], noPadding)).toBe(
    convertCircuitJsonToPcbSvg([board, makePill()], {
      ...noPadding,
      viewport: { minX: 0, maxX: 4, minY: -4, maxY: -2 },
    }),
  )
})
test("physical pad and ordinary rectangle stay nominal", () => {
  const b = getComprehensivePcbBounds([pad])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([-1, 5, -5, -1])
  const rect = {
    type: "pcb_note_rect",
    pcb_note_rect_id: "note",
    center: { x: 2, y: -3 },
    width: 4,
    height: 2,
    stroke_width: 1,
  } as AnyCircuitElement
  const n = getComprehensivePcbBounds([rect])
  expect([n.minX, n.maxX, n.minY, n.maxY]).toEqual([0, 4, -4, -2])
})
