import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import {
  type AnyCircuitElement,
  type PcbFabricationNoteDimension,
  pcb_fabrication_note_dimension,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"
import { parse, stringify } from "svgson"
const fixtures = {
  horizontal: { from: { x: 0, y: 0 }, to: { x: 6, y: 0 } },
  vertical: { from: { x: 0, y: 0 }, to: { x: 0, y: 4 } },
  diagonal: { from: { x: 0, y: 0 }, to: { x: 6, y: 4 } },
  reverse: { from: { x: 6, y: 4 }, to: { x: 0, y: 0 } },
  point: { from: { x: 2, y: -3 }, to: { x: 2, y: -3 } },
  explicitUp: {
    from: { x: 0, y: 0 },
    to: { x: 6, y: 0 },
    offset_direction: { x: 0, y: 1 },
    offset_distance: 3,
  },
  explicitDown: {
    from: { x: 0, y: 0 },
    to: { x: 6, y: 0 },
    offset_direction: { x: 0, y: -1 },
    offset_distance: 3,
  },
  skewOffset: {
    from: { x: 0, y: 0 },
    to: { x: 6, y: 4 },
    offset_direction: { x: 1, y: 2 },
    offset_distance: 3,
  },
  implicitOffset: {
    from: { x: 0, y: 0 },
    to: { x: 6, y: 0 },
    offset_distance: 3,
  },
  zeroDirection: {
    from: { x: 0, y: 0 },
    to: { x: 6, y: 0 },
    offset_direction: { x: 0, y: 0 },
    offset_distance: 3,
  },
  negativeOffset: {
    from: { x: 0, y: 0 },
    to: { x: 6, y: 0 },
    offset_direction: { x: 0, y: 1 },
    offset_distance: -3,
  },
  short: { from: { x: 0, y: 0 }, to: { x: 0.4, y: 0 } },
}
const arrows = [0.1, 0.5, 2]
async function measure(svg: string, mode = "geometry") {
  const tree = await parse(svg)
  tree.children = tree.children.filter(
    (n) => n.attributes["data-type"] === "pcb_fabrication_note_dimension",
  )
  const count = tree.children.length
  const group = tree.children[0]
  const strokeChildren =
    group?.children.filter((n) =>
      [
        "pcb-fabrication-note-dimension-line",
        "pcb-fabrication-note-dimension-extension",
      ].includes(n.attributes.class ?? ""),
    ).length ?? 0
  const textChildren =
    group?.children.filter(
      (n) => n.attributes.class === "pcb-fabrication-note-dimension-text",
    ).length ?? 0
  if (group && mode === "geometry")
    group.children = group.children.filter((n) => n.name !== "text")
  const isolated = stringify(tree)
  tree.attributes = {
    ...tree.attributes,
    width: "800",
    height: "700",
    viewBox: "-400 -400 1600 1400",
  }
  const pixels = new Resvg(stringify(tree)).render().pixels
  let crop = 0
  let visible = 0
  // 座標範囲は維持し、半解像度で範囲外の描画を測ります。
  for (let y = 0; y < 700; y++)
    for (let x = 0; x < 800; x++)
      if (pixels[(y * 800 + x) * 4 + 3]) {
        if (x < 200 || x >= 600 || y < 200 || y >= 500) crop++
        else visible++
      }
  return { crop, visible, isolated, count, strokeChildren, textChildren }
}

const noPadding = { width: 800, height: 600, drawPaddingOutsideBoard: false }
const makeDimension = (
  fixture: typeof fixtures.horizontal,
  arrow_size = 0.5,
  text = "",
) =>
  pcb_fabrication_note_dimension.parse({
    type: "pcb_fabrication_note_dimension",
    pcb_component_id: "component",
    layer: "top",
    pcb_fabrication_note_dimension_id: "dimension",
    ...fixture,
    arrow_size,
    text,
  })
for (const [name, fixture] of Object.entries(fixtures))
  for (const arrow_size of arrows)
    test(`dimension strokes fit viewport ${name} ${arrow_size}`, async () => {
      const element = makeDimension(fixture, arrow_size)
      const before = structuredClone(element)
      const pixels = await measure(
        convertCircuitJsonToPcbSvg([element], noPadding),
      )
      expect(pixels.count).toBe(1)
      expect(pixels.strokeChildren).toBe(3)
      expect(pixels.crop).toBe(0)
      expect(pixels.visible).toBeGreaterThan(0)
      expect(element).toEqual(before)
    })
for (const text_ccw_rotation of [undefined, 45, 90])
  test(`label and rotation leave strokes visible ${text_ccw_rotation}`, async () => {
    const element = pcb_fabrication_note_dimension.parse({
      ...makeDimension(fixtures.horizontal, 0.5, "6mm"),
      font_size: 0.2,
      text_ccw_rotation,
    })
    const before = structuredClone(element)
    const svg = convertCircuitJsonToPcbSvg([element], noPadding)
    const pixels = await measure(svg)
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBeGreaterThan(0)
    expect(pixels.textChildren).toBe(1)
    const tree = await parse(svg)
    const group = tree.children.find(
      (n) => n.attributes["data-type"] === "pcb_fabrication_note_dimension",
    )!
    const text = group.children.find((n) => n.name === "text")!
    expect(text.attributes.transform).toStartWith(
      `rotate(${-(text_ccw_rotation ?? 0)} `,
    )
    expect(text.children[0]?.value).toBe("6mm")
    expect(element).toEqual(before)
  })
test("horizontal round caps extend only the stroke exterior", () => {
  const b = getComprehensivePcbBounds([makeDimension(fixtures.horizontal)])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([-0.05, 6.05, -0.25, 0.55])
})
test("coincident endpoints retain a round dot envelope", () => {
  const b = getComprehensivePcbBounds([makeDimension(fixtures.point)])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([1.95, 2.05, -3.05, -2.95])
})
for (const name of [
  "horizontal",
  "diagonal",
  "negativeOffset",
  "point",
] as const)
  test(`dimension stroke snapshot ${name}`, () =>
    expect(
      convertCircuitJsonToPcbSvg([makeDimension(fixtures[name])], noPadding),
    ).toMatchSvgSnapshot(`${import.meta.path}-${name}`))
for (const arrow_size of [0, undefined, Number.NaN])
  test(`zero missing or NaN arrow keeps empty bounds ${arrow_size}`, async () => {
    const element = {
      ...makeDimension(fixtures.horizontal),
      arrow_size,
    } as PcbFabricationNoteDimension
    expect(getComprehensivePcbBounds([element]).hasBounds).toBe(false)
    const pixels = await measure(
      convertCircuitJsonToPcbSvg([element], {
        ...noPadding,
        viewport: { minX: -1, maxX: 7, minY: -1, maxY: 1 },
      }),
    )
    expect(pixels.count).toBe(0)
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBe(0)
  })
test("negative raw arrow retains old invisible fallback", async () => {
  const element = { ...makeDimension(fixtures.horizontal), arrow_size: -1 }
  const b = getComprehensivePcbBounds([element])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([-1, 7, -1, 0.5])
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(pixels.count).toBe(0)
  expect(pixels.visible).toBe(0)
})
for (const arrow_size of [Number.POSITIVE_INFINITY, "0.5mm"])
  test(`legacy malformed arrow exception is retained ${arrow_size}`, () => {
    const element = {
      ...makeDimension(fixtures.horizontal),
      arrow_size,
    } as unknown as PcbFabricationNoteDimension
    expect(() => getComprehensivePcbBounds([element])).toThrow()
  })
test("raw unit endpoints retain old parsed point fallback", () => {
  const element = {
    ...makeDimension(fixtures.horizontal),
    from: { x: "0mm", y: "0mm" },
  } as unknown as PcbFabricationNoteDimension
  const b = getComprehensivePcbBounds([element])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([0, 6, 0, 0])
})
test("overflowing stroke exterior retains old point bounds", () => {
  const element = {
    ...makeDimension(fixtures.point),
    from: { x: Number.MAX_VALUE, y: 0 },
    to: { x: Number.MAX_VALUE, y: 0 },
    arrow_size: Number.MAX_VALUE,
  }
  const b = getComprehensivePcbBounds([element])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([
    Number.MAX_VALUE,
    Number.MAX_VALUE,
    0,
    0,
  ])
})
test("missing endpoint remains unpainted", async () => {
  const element = {
    ...makeDimension(fixtures.horizontal),
    from: undefined,
  } as unknown as PcbFabricationNoteDimension
  expect(getComprehensivePcbBounds([element]).hasBounds).toBe(false)
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(pixels.count).toBe(0)
  expect(pixels.visible).toBe(0)
})
test("nonmatching layer remains unpainted", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makeDimension(fixtures.horizontal)], {
      ...noPadding,
      layer: "bottom",
    }),
  )
  expect(pixels.count).toBe(0)
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBe(0)
})
test("frozen endpoints and color remain unchanged", async () => {
  const element = Object.freeze({
    ...makeDimension(fixtures.diagonal),
    from: Object.freeze({ ...fixtures.diagonal.from }),
    to: Object.freeze({ ...fixtures.diagonal.to }),
    color: "#00aa66",
  })
  const before = structuredClone(element)
  const pixels = await measure(convertCircuitJsonToPcbSvg([element], noPadding))
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
  expect(element).toEqual(before)
})
test("explicit viewport keeps intentional cropping", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makeDimension(fixtures.horizontal)], {
      ...noPadding,
      viewport: { minX: 0, maxX: 6, minY: -0.25, maxY: 0.5 },
    }),
  )
  expect(pixels.crop).toBeGreaterThan(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("default padding fits round caps", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makeDimension(fixtures.horizontal)], {
      width: 800,
      height: 600,
    }),
  )
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("board keeps its dimensions and intentional crop", () => {
  const board = {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 3, y: 0 },
    width: 6,
    height: 4,
  } as AnyCircuitElement
  const dimension = makeDimension(fixtures.horizontal)
  const b = getComprehensivePcbBounds([board, dimension])
  expect([b.boardMinX, b.boardMaxX, b.boardMinY, b.boardMaxY]).toEqual([
    0, 6, -2, 2,
  ])
  expect(convertCircuitJsonToPcbSvg([board, dimension], noPadding)).toBe(
    convertCircuitJsonToPcbSvg([board, dimension], {
      ...noPadding,
      viewport: { minX: 0, maxX: 6, minY: -2, maxY: 2 },
    }),
  )
})
test("physical pad and ordinary dimension keep nominal geometry", () => {
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
  const pb = getComprehensivePcbBounds([pad])
  expect([pb.minX, pb.maxX, pb.minY, pb.maxY]).toEqual([0, 6, -2, 2])
  const ordinary = {
    ...fixtures.horizontal,
    type: "pcb_note_dimension",
    pcb_note_dimension_id: "ordinary",
    arrow_size: 0.5,
    text: "",
    layer: "top",
  } as AnyCircuitElement
  const b = getComprehensivePcbBounds([ordinary])
  expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([0, 6, -0.25, 0.5])
})

for (const layer of ["top", "bottom"] as const)
  test(`matching fabrication layer renders ${layer}`, async () => {
    const element = { ...makeDimension(fixtures.horizontal), layer }
    const pixels = await measure(
      convertCircuitJsonToPcbSvg([element], { ...noPadding, layer }),
    )
    expect(pixels.count).toBe(1)
    expect(pixels.strokeChildren).toBe(3)
    expect(pixels.visible).toBeGreaterThan(0)
    expect(pixels.crop).toBe(0)
  })
test("showPcbNotes keeps fabrication dimension visible", async () => {
  const pixels = await measure(
    convertCircuitJsonToPcbSvg([makeDimension(fixtures.horizontal)], {
      ...noPadding,
      showPcbNotes: false,
    }),
  )
  expect(pixels.count).toBe(1)
  expect(pixels.crop).toBe(0)
  expect(pixels.visible).toBeGreaterThan(0)
})
test("raw layerless fabrication dimension remains visible for either face", async () => {
  const element = {
    ...makeDimension(fixtures.horizontal),
    layer: undefined,
  } as unknown as PcbFabricationNoteDimension
  for (const layer of ["top", "bottom"] as const) {
    const pixels = await measure(
      convertCircuitJsonToPcbSvg([element], { ...noPadding, layer }),
    )
    expect(pixels.count).toBe(1)
    expect(pixels.crop).toBe(0)
    expect(pixels.visible).toBeGreaterThan(0)
  }
})
