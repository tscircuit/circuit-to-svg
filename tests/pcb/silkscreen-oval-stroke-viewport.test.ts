import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import {
  type AnyCircuitElement,
  type PcbSilkscreenOval,
  pcb_silkscreen_oval,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"
import { parse, stringify } from "svgson"
const noPadding = { width: 800, height: 600, drawPaddingOutsideBoard: false }
const makeOval = (options: Partial<PcbSilkscreenOval> = {}) =>
  pcb_silkscreen_oval.parse({
    type: "pcb_silkscreen_oval",
    pcb_silkscreen_oval_id: "oval",
    pcb_component_id: "component",
    center: { x: 2, y: -3 },
    radius_x: 2,
    radius_y: 1,
    layer: "top",
    ...options,
  })
const extents = (element: PcbSilkscreenOval) => {
  const b = getComprehensivePcbBounds([element])
  return [b.minX, b.maxX, b.minY, b.maxY]
}
function expectNearBounds(element: PcbSilkscreenOval, expected: number[]) {
  const actual = extents(element)
  for (const [index, value] of expected.entries())
    expect(actual[index]).toBeCloseTo(value, 10)
}
async function measure(svg: string) {
  const tree = await parse(svg)
  tree.children = tree.children.filter(
    (n) => n.attributes["data-type"] === "pcb_silkscreen_oval",
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
  for (const [radius_x, radius_y] of [
    [2, 1],
    [1, 2],
    [1, 1],
  ] as const)
    for (const ccw_rotation of [0, 45, 90, 180])
      for (const layer of ["top", "bottom"] as const)
        test(`oval stroke fits ${center.x} ${radius_x} ${radius_y} ${ccw_rotation} ${layer}`, async () => {
          const element = makeOval({
            center,
            radius_x,
            radius_y,
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
test("unrotated ellipse includes fixed half stroke", () =>
  expectNearBounds(makeOval(), [-0.05, 4.05, -4.05, -1.95]))
test("ninety degree ellipse includes projected radius and retains old bounds", () => {
  const b = extents(makeOval({ ccw_rotation: 90 }))
  for (const [i, value] of [0, 4, -5.05, -0.95].entries())
    expect(b[i]).toBeCloseTo(value, 10)
})
test("diagonal ellipse uses an ellipse projection rather than rectangle corners", () => {
  const b = extents(makeOval({ ccw_rotation: 45 }))
  for (const [i, value] of [
    0, 4, -4.63113883008419, -1.36886116991581,
  ].entries())
    expect(b[i]).toBeCloseTo(value, 10)
})
for (const ccw_rotation of [-45, 270, 360])
  test(`additional rotation fits ${ccw_rotation}`, async () => {
    const pixels = await measure(
      convertCircuitJsonToPcbSvg([makeOval({ ccw_rotation })], noPadding),
    )
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBeGreaterThan(0)
  })
for (const [radius_x, radius_y] of [
  [0, 1],
  [1, 0],
  [0, 0],
] as const)
  for (const layer of ["top", "bottom"] as const)
    test(`zero radius control ${radius_x} ${radius_y} ${layer}`, async () => {
      const element = makeOval({ radius_x, radius_y, layer })
      const pixels = await measure(
        convertCircuitJsonToPcbSvg([element], { ...noPadding, layer }),
      )
      expect(extents(element)).toEqual([
        2 - radius_x,
        2 + radius_x,
        -3 - radius_y,
        -3 + radius_y,
      ])
      expect(pixels.count).toBe(1)
      expect(pixels.crop).toBe(0)
      expect(pixels.visible).toBe(0)
    })
for (const radius of ["radius_x", "radius_y"] as const) {
  test(`negative ${radius} preserves inverted bounds`, () =>
    expect(extents({ ...makeOval(), [radius]: -1 })).toEqual(
      radius === "radius_x" ? [3, 1, -4, -2] : [0, 4, -2, -4],
    ))
  for (const value of [undefined, Number.NaN, null])
    test(`malformed ${radius} preserves exception ${value}`, () =>
      expect(() =>
        extents({
          ...makeOval(),
          [radius]: value,
        } as unknown as PcbSilkscreenOval),
      ).toThrow())
}
for (const ccw_rotation of [
  null,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.MAX_VALUE,
  "45deg",
  Symbol("angle"),
])
  test(`raw invalid rotation keeps legacy radius bounds ${String(ccw_rotation)}`, () =>
    expect(
      extents({ ...makeOval(), ccw_rotation } as unknown as PcbSilkscreenOval),
    ).toEqual([0, 4, -4, -2]))
test("raw missing rotation uses renderer zero", async () => {
  const element = { ...makeOval(), ccw_rotation: undefined }
  expectNearBounds(element, [-0.05, 4.05, -4.05, -1.95])
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("raw unit geometry keeps old parsed radius bounds", () =>
  expect(
    extents({
      ...makeOval(),
      radius_x: "2mm",
      radius_y: "1mm",
      center: { x: "2mm", y: "-3mm" },
    } as unknown as PcbSilkscreenOval),
  ).toEqual([0, 4, -4, -2]))
test("parsed units enclose the visible fixed stroke", async () => {
  const element = pcb_silkscreen_oval.parse({
    ...makeOval(),
    radius_x: "2mm",
    radius_y: "1mm",
    center: { x: "2mm", y: "-3mm" },
  })
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expectNearBounds(element, [-0.05, 4.05, -4.05, -1.95])
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("raw infinite radius preserves the old infinite bounds", () =>
  expect(
    extents({ ...makeOval(), radius_x: Number.POSITIVE_INFINITY }),
  ).toEqual([Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, -4, -2]))
test("raw missing center retains empty bounds", () =>
  expect(
    getComprehensivePcbBounds([
      { ...makeOval(), center: undefined } as unknown as PcbSilkscreenOval,
    ]).hasBounds,
  ).toBe(false))
test("legacy overflowing geometry remains unchanged", () =>
  expect(
    extents(
      makeOval({
        center: { x: Number.MAX_VALUE, y: 0 },
        radius_x: Number.MAX_VALUE / 2,
        radius_y: 1,
      }),
    ),
  ).toEqual([Number.MAX_VALUE / 2, Number.POSITIVE_INFINITY, -1, 1]))
for (const layer of ["top", "bottom"] as const) {
  test(`custom color stays visible ${layer}`, async () => {
    const pixels = await measure(
      convertCircuitJsonToPcbSvg([makeOval({ layer })], {
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
      convertCircuitJsonToPcbSvg([makeOval({ layer })], {
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
      [{ ...makeOval(), layer: undefined } as unknown as PcbSilkscreenOval],
      { ...noPadding, layer: "top" },
    ),
  )
  expect(pixels.count).toBe(1)
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("frozen input remains unchanged", async () => {
  const element = Object.freeze({
    ...makeOval(),
    center: Object.freeze({ x: 2, y: -3 }),
  })
  const before = structuredClone(element)
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(element).toEqual(before)
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("notes visibility keeps the oval visible", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makeOval()], {
      ...noPadding,
      showPcbNotes: false,
    }),
  )
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("explicit crop preserves intentional clipping", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makeOval()], {
      ...noPadding,
      viewport: { minX: 0, maxX: 4, minY: -4, maxY: -2 },
    }),
  )
  expect(pixels.crop).toBeGreaterThan(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("default padding encloses a rotated ellipse", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makeOval({ ccw_rotation: 90 })], {
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
  circle: { radius_x: 1, radius_y: 1 },
}))
  test(`oval stroke snapshot ${name}`, () => {
    const element = makeOval(options)
    expect(
      convertCircuitJsonToPcbSvg([element], {
        ...noPadding,
        layer: element.layer,
      }),
    ).toMatchSvgSnapshot(`${import.meta.path}-${name}`)
  })
test("mismatch snapshot preserves pad", () =>
  expect(
    convertCircuitJsonToPcbSvg([pad, makeOval({ layer: "bottom" })], {
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
  const b = getComprehensivePcbBounds([board, makeOval()])
  expect([b.boardMinX, b.boardMaxX, b.boardMinY, b.boardMaxY]).toEqual([
    0, 4, -4, -2,
  ])
  expect(convertCircuitJsonToPcbSvg([board, makeOval()], noPadding)).toBe(
    convertCircuitJsonToPcbSvg([board, makeOval()], {
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

test("overflowing rotated exterior retains finite nominal bounds", () => {
  const centerX = Number.MAX_VALUE * 0.875
  const radiusX = Number.MAX_VALUE / 8
  const radiusY = Number.MAX_VALUE / 4
  const element = makeOval({
    center: { x: centerX, y: 0 },
    radius_x: radiusX,
    radius_y: radiusY,
    ccw_rotation: 90,
  })
  expect(extents(element)).toEqual([
    centerX - radiusX,
    centerX + radiusX,
    -radiusY,
    radiusY,
  ])
})
