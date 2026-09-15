import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"
import { parseSync, type INode } from "svgson"

const board: AnyCircuitElement = {
  type: "pcb_board",
  pcb_board_id: "board",
  center: { x: 0, y: 0 },
  width: 2,
  height: 2,
  num_layers: 2,
  material: "fr4",
  thickness: 1.6,
}

const points = [
  { x: 6, y: -8 },
  { x: 12, y: -8 },
  { x: 12, y: -2 },
  { x: 6, y: -2 },
]

const courtyards: AnyCircuitElement[] = [
  {
    type: "pcb_courtyard_circle",
    pcb_courtyard_circle_id: "circle",
    pcb_component_id: "component",
    center: { x: 9, y: -5 },
    radius: 3,
    layer: "top",
  },
  {
    type: "pcb_courtyard_polygon",
    pcb_courtyard_polygon_id: "polygon",
    pcb_component_id: "component",
    points,
    layer: "top",
  },
  {
    type: "pcb_courtyard_outline",
    pcb_courtyard_outline_id: "outline",
    pcb_component_id: "component",
    outline: points,
    layer: "top",
  },
]

function descendants(node: INode): INode[] {
  return [node, ...node.children.flatMap(descendants)]
}

for (const courtyard of courtyards) {
  test(`${courtyard.type} supplies bounds without a board`, () => {
    const bounds = getComprehensivePcbBounds([courtyard])
    expect(bounds.hasBounds).toBe(true)
    expect(bounds.hasBoardBounds).toBe(false)
    expect(bounds.minX).toBe(6)
    expect(bounds.maxX).toBe(12)
    expect(bounds.minY).toBe(-8)
    expect(bounds.maxY).toBe(-2)
  })

  test(`${courtyard.type} remains inside the automatic SVG viewport`, () => {
    const svg = parseSync(
      convertCircuitJsonToPcbSvg([board, courtyard], {
        showCourtyards: true,
        width: 400,
        height: 400,
      }),
    )
    const shape = descendants(svg).find(
      (node) => node.attributes["data-type"] === courtyard.type,
    )!
    expect(shape).toBeDefined()

    const vertices =
      shape.name === "circle"
        ? [
            [
              Number(shape.attributes.cx) - Number(shape.attributes.r),
              Number(shape.attributes.cy) - Number(shape.attributes.r),
            ],
            [
              Number(shape.attributes.cx) + Number(shape.attributes.r),
              Number(shape.attributes.cy) + Number(shape.attributes.r),
            ],
          ]
        : shape.attributes
            .points!.split(" ")
            .map((point) => point.split(",").map(Number))

    for (const [x, y] of vertices) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(400)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(400)
    }
  })

  test(`hidden ${courtyard.type} does not change the viewport`, () => {
    expect(convertCircuitJsonToPcbSvg([board, courtyard])).toBe(
      convertCircuitJsonToPcbSvg([board]),
    )
    expect(
      convertCircuitJsonToPcbSvg([board, courtyard], {
        showCourtyards: false,
      }),
    ).toBe(convertCircuitJsonToPcbSvg([board], { showCourtyards: false }))
  })
}

test("courtyard circle outside the board remains visible", () => {
  expect(
    convertCircuitJsonToPcbSvg([board, courtyards[0]!], {
      showCourtyards: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
