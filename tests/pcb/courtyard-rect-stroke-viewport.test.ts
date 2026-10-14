import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import {
  type AnyCircuitElement,
  type PcbCourtyardRect,
  pcb_courtyard_rect,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"
import { parse, stringify } from "svgson"

const rectangle = pcb_courtyard_rect.parse({
  type: "pcb_courtyard_rect",
  pcb_courtyard_rect_id: "courtyard",
  pcb_component_id: "component",
  center: { x: 2, y: -3 },
  width: 6,
  height: 4,
  layer: "top",
})
const noPadding = {
  width: 800,
  height: 600,
  showCourtyards: true,
  drawPaddingOutsideBoard: false,
}

async function countClippedPixels(svg: string) {
  const tree = await parse(svg)
  tree.children = tree.children.filter(
    (node) => node.attributes["data-type"] === "pcb_courtyard_rect",
  )
  expect(tree.children).toHaveLength(1)
  tree.attributes = {
    ...tree.attributes,
    width: "900",
    height: "700",
    viewBox: "-50 -50 900 700",
  }
  const pixels = new Resvg(stringify(tree)).render().pixels
  let clippedPixels = 0
  for (let y = 0; y < 700; y++)
    for (let x = 0; x < 900; x++)
      if (
        (x < 50 || x >= 850 || y < 50 || y >= 650) &&
        pixels[(y * 900 + x) * 4 + 3]! > 0
      )
        clippedPixels++
  return clippedPixels
}

for (const angle of [0, 30, 45, 90, -37, 360])
  for (const layer of ["top", "bottom"] as const)
    test(`automatic viewport contains round rectangle stroke ${angle} ${layer}`, async () => {
      const element = { ...rectangle, ccw_rotation: angle, layer }
      const svg = convertCircuitJsonToPcbSvg([element], { ...noPadding, layer })
      expect(await countClippedPixels(svg)).toBe(0)
      const bounds = getComprehensivePcbBounds([element])
      const radians = (angle * Math.PI) / 180
      const halfWidth =
        3 * Math.abs(Math.cos(radians)) +
        2 * Math.abs(Math.sin(radians)) +
        0.025
      const halfHeight =
        3 * Math.abs(Math.sin(radians)) +
        2 * Math.abs(Math.cos(radians)) +
        0.025
      expect(bounds.minX).toBeCloseTo(2 - halfWidth, 12)
      expect(bounds.maxX).toBeCloseTo(2 + halfWidth, 12)
      expect(bounds.minY).toBeCloseTo(-3 - halfHeight, 12)
      expect(bounds.maxY).toBeCloseTo(-3 + halfHeight, 12)
      expect(bounds.hasBoardBounds).toBe(false)
    })

for (const [name, element, options] of [
  ["courtyard-rect-stroke-no-padding", rectangle, noPadding],
  [
    "courtyard-rect-stroke-rotated-bottom",
    { ...rectangle, ccw_rotation: 45, layer: "bottom" },
    { ...noPadding, layer: "bottom" },
  ],
  [
    "courtyard-rect-stroke-default-padding",
    rectangle,
    { width: 800, height: 600, showCourtyards: true },
  ],
] as const)
  test(`courtyard rectangle visible outline ${name}`, () => {
    const svg = convertCircuitJsonToPcbSvg([element], options)
    expect(svg).toMatchSvgSnapshot(import.meta.path, name)
  })

test("default padding already preserves the full outline", async () =>
  expect(
    await countClippedPixels(
      convertCircuitJsonToPcbSvg([rectangle], {
        width: 800,
        height: 600,
        showCourtyards: true,
      }),
    ),
  ).toBe(0))
for (const [width, height] of [
  [0.1, 0.2],
  [4, 4],
])
  test(`small and square outline fits automatic viewport ${width} ${height}`, async () => {
    const svg = convertCircuitJsonToPcbSvg(
      [{ ...rectangle, width: width!, height: height! }],
      noPadding,
    )
    expect(await countClippedPixels(svg)).toBe(0)
  })
for (const [width, height] of [
  [0, 4],
  [6, 0],
  [-6, 4],
  [6, -4],
])
  test(`nonpainted dimensions retain nominal bounds ${width} ${height}`, () => {
    const bounds = getComprehensivePcbBounds([
      { ...rectangle, width: width!, height: height! },
    ])
    expect(bounds.minX).toBe(2 - width! / 2)
    expect(bounds.maxX).toBe(2 + width! / 2)
    expect(bounds.minY).toBe(-3 - height! / 2)
    expect(bounds.maxY).toBe(-3 + height! / 2)
  })
for (const layer of ["top", "bottom"] as const)
  test(`board crop is unchanged ${layer}`, () => {
    const board = {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 2, y: -3 },
      width: 6,
      height: 4,
    } as AnyCircuitElement
    const actual = convertCircuitJsonToPcbSvg(
      [board, { ...rectangle, layer }],
      { ...noPadding, layer },
    )
    const explicit = convertCircuitJsonToPcbSvg(
      [board, { ...rectangle, layer }],
      {
        ...noPadding,
        layer,
        viewport: { minX: -1, maxX: 5, minY: -5, maxY: -1 },
      },
    )
    expect(actual).toBe(explicit)
    const bounds = getComprehensivePcbBounds([board, rectangle])
    expect([
      bounds.boardMinX,
      bounds.boardMaxX,
      bounds.boardMinY,
      bounds.boardMaxY,
    ]).toEqual([-1, 5, -5, -1])
  })
test("explicit viewport remains an intentional crop", async () => {
  const svg = convertCircuitJsonToPcbSvg([rectangle], {
    ...noPadding,
    viewport: { minX: -1, maxX: 5, minY: -5, maxY: -1 },
  })
  expect(await countClippedPixels(svg)).toBeGreaterThan(0)
})
test("hidden and mismatched layers remain hidden", () => {
  for (const options of [
    { ...noPadding, showCourtyards: false },
    { ...noPadding, layer: "bottom" as const },
  ])
    expect(convertCircuitJsonToPcbSvg([rectangle], options)).not.toContain(
      'data-type="pcb_courtyard_rect"',
    )
})
test("physical pad stays nominal", () => {
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
  const bounds = getComprehensivePcbBounds([pad])
  expect([bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]).toEqual([
    -1, 5, -5, -1,
  ])
})
test("bounds preserve nominal dimensions and frozen input", () => {
  const frozen = Object.freeze({
    ...rectangle,
    ccw_rotation: 45,
    center: Object.freeze({ ...rectangle.center }),
  })
  const before = structuredClone(frozen)
  expect(getComprehensivePcbBounds([frozen]).hasBounds).toBe(true)
  expect(frozen).toEqual(before)
})

test("unparsed unit strings retain nominal fallback", () => {
  const element = {
    ...rectangle,
    width: "6mm",
    height: "4mm",
  } as unknown as PcbCourtyardRect
  const bounds = getComprehensivePcbBounds([element])
  expect([bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]).toEqual([
    -1, 5, -5, -1,
  ])
})
