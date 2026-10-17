import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import {
  type AnyCircuitElement,
  type PcbSilkscreenRect,
  pcb_silkscreen_rect,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"
import { parse, stringify } from "svgson"

const noPadding = { width: 800, height: 600, drawPaddingOutsideBoard: false }
const makeRect = (options: Partial<PcbSilkscreenRect> = {}) =>
  pcb_silkscreen_rect.parse({
    type: "pcb_silkscreen_rect",
    pcb_silkscreen_rect_id: "rect",
    pcb_component_id: "component",
    center: { x: 2, y: -3 },
    width: 4,
    height: 2,
    stroke_width: 0.5,
    layer: "top",
    ...options,
  })
const extents = (element: PcbSilkscreenRect) => {
  const b = getComprehensivePcbBounds([element])
  return [b.minX, b.maxX, b.minY, b.maxY]
}
async function measure(svg: string) {
  const tree = await parse(svg)
  tree.children = tree.children.filter(
    (n) => n.attributes["data-type"] === "pcb_silkscreen_rect",
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
  // 元の座標範囲を維持し、半解像度で外周の画素を検証します。
  for (let y = 0; y < 700; y++)
    for (let x = 0; x < 800; x++)
      if (pixels[(y * 800 + x) * 4 + 3]) {
        if (x < 200 || x >= 600 || y < 200 || y >= 500) crop++
        else visible++
      }
  return { count, attributes, crop, visible }
}
for (const ccw_rotation of [0, 45, 90])
  for (const stroke_width of [0.1, 0.5, 2])
    for (const corner_radius of [0, 0.25])
      for (const is_filled of [false, true])
        for (const layer of ["top", "bottom"] as const)
          test(`rectangle stroke fits ${ccw_rotation} ${stroke_width} ${corner_radius} ${is_filled} ${layer}`, async () => {
            const element = makeRect({
              ccw_rotation,
              stroke_width,
              corner_radius,
              is_filled,
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
            expect(pixels.attributes?.fill).toBe(
              is_filled ? pixels.attributes?.stroke : "none",
            )
          })
test("rectangle bounds include half the stroke on each side", () =>
  expect(extents(makeRect())).toEqual([-0.25, 4.25, -4.25, -1.75]))
test("rotated rectangle bounds include the rotated stroke", () => {
  const b = extents(makeRect({ ccw_rotation: 90 }))
  expect(b[0]).toBeCloseTo(0.75, 10)
  expect(b[1]).toBeCloseTo(3.25, 10)
  expect(b[2]).toBeCloseTo(-5.25, 10)
  expect(b[3]).toBeCloseTo(-0.75, 10)
})
for (const has_stroke of [false, true, undefined])
  for (const is_filled of [false, true])
    test(`stroke visibility ${has_stroke} ${is_filled}`, async () => {
      const element = makeRect({ has_stroke, is_filled })
      const pixels = await measure(
        convertCircuitJsonToPcbSvg([element], noPadding),
      )
      expect(pixels.crop).toBe(0)
      expect(pixels.count).toBe(1)
      if (has_stroke === false) {
        expect(extents(element)).toEqual([0, 4, -4, -2])
        expect(pixels.attributes?.stroke).toBe("none")
      } else expect(extents(element)).toEqual([-0.25, 4.25, -4.25, -1.75])
      if (has_stroke !== false || is_filled)
        expect(pixels.visible).toBeGreaterThan(0)
      else expect(pixels.visible).toBe(0)
    })
for (const is_stroke_dashed of [false, true])
  test(`explicit stroke and dash ${is_stroke_dashed}`, async () => {
    const pixels = await measure(
      convertCircuitJsonToPcbSvg(
        [makeRect({ has_stroke: true, is_stroke_dashed })],
        noPadding,
      ),
    )
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBeGreaterThan(0)
    expect(Boolean(pixels.attributes?.["stroke-dasharray"])).toBe(
      is_stroke_dashed,
    )
  })
for (const is_filled of [false, true])
  for (const has_stroke of [false, true, undefined])
    test(`zero stroke control ${is_filled} ${has_stroke}`, async () => {
      const element = makeRect({ is_filled, has_stroke, stroke_width: 0 })
      const pixels = await measure(
        convertCircuitJsonToPcbSvg([element], noPadding),
      )
      expect(extents(element)).toEqual([0, 4, -4, -2])
      expect(pixels.crop).toBe(0)
      if (is_filled) expect(pixels.visible).toBeGreaterThan(0)
      else expect(pixels.visible).toBe(0)
    })
for (const dimension of ["width", "height"] as const)
  test(`zero ${dimension} remains unpainted`, async () => {
    const element = makeRect({ [dimension]: 0 })
    const pixels = await measure(
      convertCircuitJsonToPcbSvg([element], noPadding),
    )
    expect(pixels.count).toBe(1)
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBe(0)
    expect(extents(element)).toEqual(
      dimension === "width" ? [2, 2, -4, -2] : [0, 4, -3, -3],
    )
  })
test("schema default stroke is visible and enclosed", async () => {
  const element = makeRect({ stroke_width: undefined })
  expect(element.stroke_width).toBe(1)
  expect(extents(element)).toEqual([-0.5, 4.5, -4.5, -1.5])
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("raw missing stroke has no renderer default", async () => {
  const element = {
    ...makeRect(),
    stroke_width: undefined,
  } as unknown as PcbSilkscreenRect
  expect(extents(element)).toEqual([0, 4, -4, -2])
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(pixels.attributes?.stroke).toBe("none")
  expect(pixels.visible).toBe(0)
})
for (const stroke_width of [
  null,
  -1,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  "0.5mm",
  Symbol("width"),
])
  test(`raw invalid stroke preserves nominal bounds ${String(stroke_width)}`, () =>
    expect(
      extents({ ...makeRect(), stroke_width } as unknown as PcbSilkscreenRect),
    ).toEqual([0, 4, -4, -2]))
for (const dimension of ["width", "height"] as const) {
  test(`raw negative ${dimension} preserves legacy bounds`, () =>
    expect(extents({ ...makeRect(), [dimension]: -2 })).toEqual(
      dimension === "width" ? [3, 1, -4, -2] : [0, 4, -2, -4],
    ))
  for (const value of [undefined, Number.NaN])
    test(`raw malformed ${dimension} retains exception ${value}`, () =>
      expect(() =>
        extents({
          ...makeRect(),
          [dimension]: value,
        } as unknown as PcbSilkscreenRect),
      ).toThrow())
}
for (const ccw_rotation of [
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.MAX_VALUE,
])
  test(`invalid rotation preserves legacy bounds ${ccw_rotation}`, () =>
    expect(extents({ ...makeRect(), ccw_rotation })).toEqual([
      Number.NaN,
      Number.NaN,
      Number.NaN,
      Number.NaN,
    ]))
test("raw unit rotation preserves unrotated nominal bounds", () =>
  expect(
    extents({
      ...makeRect(),
      ccw_rotation: "45deg",
    } as unknown as PcbSilkscreenRect),
  ).toEqual([0, 4, -4, -2]))
test("raw unit geometry preserves nominal bounds", () =>
  expect(
    extents({
      ...makeRect(),
      width: "4mm",
      center: { x: "2mm", y: "-3mm" },
    } as unknown as PcbSilkscreenRect),
  ).toEqual([0, 4, -4, -2]))
test("parsed units enclose the visible stroke", async () => {
  const element = pcb_silkscreen_rect.parse({
    ...makeRect(),
    width: "4mm",
    height: "2mm",
    stroke_width: "0.5mm",
    center: { x: "2mm", y: "-3mm" },
  })
  expect(extents(element)).toEqual([-0.25, 4.25, -4.25, -1.75])
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("missing center retains empty bounds", () =>
  expect(
    getComprehensivePcbBounds([
      { ...makeRect(), center: undefined } as unknown as PcbSilkscreenRect,
    ]).hasBounds,
  ).toBe(false))
test("overflowing exterior retains finite nominal bounds", () =>
  expect(
    extents(
      makeRect({
        center: { x: Number.MAX_VALUE, y: 0 },
        stroke_width: Number.MAX_VALUE,
      }),
    ),
  ).toEqual([Number.MAX_VALUE, Number.MAX_VALUE, -1, 1]))
for (const layer of ["top", "bottom"] as const) {
  test(`custom colors stay visible ${layer}`, async () => {
    const pixels = await measure(
      convertCircuitJsonToPcbSvg([makeRect({ layer, is_filled: true })], {
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
  test(`nonmatching layer is unpainted ${layer}`, async () => {
    const pixels = await measure(
      convertCircuitJsonToPcbSvg([makeRect({ layer })], {
        ...noPadding,
        layer: layer === "top" ? "bottom" : "top",
      }),
    )
    expect(pixels.count).toBe(0)
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBe(0)
  })
}
test("raw default layer renders top", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg(
      [{ ...makeRect(), layer: undefined } as unknown as PcbSilkscreenRect],
      { ...noPadding, layer: "top" },
    ),
  )
  expect(pixels.count).toBe(1)
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("frozen input is preserved", async () => {
  const element = Object.freeze({
    ...makeRect(),
    center: Object.freeze({ x: 2, y: -3 }),
  })
  const before = structuredClone(element)
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(element).toEqual(before)
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("notes visibility keeps silkscreen visible", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makeRect()], {
      ...noPadding,
      showPcbNotes: false,
    }),
  )
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("explicit crop retains intentional clipping", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makeRect()], {
      ...noPadding,
      viewport: { minX: 0, maxX: 4, minY: -4, maxY: -2 },
    }),
  )
  expect(pixels.crop).toBeGreaterThan(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("default padding fits the stroke", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makeRect()], { width: 800, height: 600 }),
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
  outline: {},
  rotated: { ccw_rotation: 45 },
  rounded: { ccw_rotation: 45, corner_radius: 0.25 },
  filled: { is_filled: true },
  bottom: { layer: "bottom" as const, is_stroke_dashed: true },
}))
  test(`rectangle stroke snapshot ${name}`, () => {
    const element = makeRect(options)
    expect(
      convertCircuitJsonToPcbSvg([element], {
        ...noPadding,
        layer: element.layer,
      }),
    ).toMatchSvgSnapshot(`${import.meta.path}-${name}`)
  })
test("nonmatching snapshot keeps pad visible", () =>
  expect(
    convertCircuitJsonToPcbSvg([pad, makeRect({ layer: "bottom" })], {
      ...noPadding,
      layer: "top",
    }),
  ).toMatchSvgSnapshot(`${import.meta.path}-nonmatching`))
test("board dimensions and automatic board camera remain nominal", () => {
  const board = {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 2, y: -3 },
    width: 4,
    height: 2,
  } as AnyCircuitElement
  const b = getComprehensivePcbBounds([board, makeRect()])
  expect([b.boardMinX, b.boardMaxX, b.boardMinY, b.boardMaxY]).toEqual([
    0, 4, -4, -2,
  ])
  expect(convertCircuitJsonToPcbSvg([board, makeRect()], noPadding)).toBe(
    convertCircuitJsonToPcbSvg([board, makeRect()], {
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
    width: 6,
    height: 4,
    stroke_width: 1,
  } as AnyCircuitElement
  const r = getComprehensivePcbBounds([rect])
  expect([r.minX, r.maxX, r.minY, r.maxY]).toEqual([-1, 5, -5, -1])
})
