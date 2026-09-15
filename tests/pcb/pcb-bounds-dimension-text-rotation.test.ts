import { expect, test } from "bun:test"
import {
  any_circuit_element,
  type PcbBoard,
  type PcbFabricationNoteDimension,
  type PcbNoteDimension,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"
import { parseSync } from "svgson"

const board: PcbBoard = {
  type: "pcb_board",
  pcb_board_id: "board",
  center: { x: 5, y: -2 },
  width: 10,
  height: 4,
  num_layers: 2,
  material: "fr4",
  thickness: 1.6,
}

const dimensions: Array<PcbNoteDimension | PcbFabricationNoteDimension> = [
  {
    type: "pcb_note_dimension",
    pcb_note_dimension_id: "dimension",
    layer: "top",
    from: { x: 0, y: 0 },
    to: { x: 10, y: 0 },
    text: "10.00 mm",
    font: "tscircuit2024",
    font_size: 1,
    arrow_size: 0.5,
    offset_distance: 1,
    offset_direction: { x: 0, y: 1 },
    text_ccw_rotation: 90,
  },
  {
    type: "pcb_fabrication_note_dimension",
    pcb_fabrication_note_dimension_id: "dimension",
    pcb_component_id: "component",
    layer: "top",
    from: { x: 0, y: 0 },
    to: { x: 10, y: 0 },
    text: "10.00 mm",
    font: "tscircuit2024",
    font_size: 1,
    arrow_size: 0.5,
    offset_distance: 1,
    offset_direction: { x: 0, y: 1 },
    text_ccw_rotation: 90,
  },
]

for (const dimension of dimensions) {
  test(`${dimension.type} bounds include rotated text and its clearance offset`, async () => {
    any_circuit_element.parse(dimension)
    const bounds = getComprehensivePcbBounds([dimension])

    // Text center is 1 + 0.75 + (2.4 + 0.3); its rotated half-height is 2.4.
    expect(bounds.maxY).toBeCloseTo(6.85)

    const svg = convertCircuitJsonToPcbSvg([board, dimension], {
      width: 400,
      height: 300,
    })
    const root = parseSync(svg)
    const group = root.children.find(
      (node) => node.attributes["data-type"] === dimension.type,
    )
    const text = group?.children.find((node) => node.name === "text")
    expect(text).toBeDefined()
    const textY = Number(text!.attributes.y)
    const halfTextHeight = Number(text!.attributes["font-size"]) * 2.4
    expect(textY - halfTextHeight).toBeGreaterThanOrEqual(0)
    expect(textY + halfTextHeight).toBeLessThanOrEqual(300)
    await expect(svg).toMatchSvgSnapshot(
      import.meta.path,
      `${dimension.type}-rotated-text-bounds`,
    )
  })

  test(`${dimension.type} bounds follow the dimension direction without an explicit text rotation`, () => {
    const verticalDimension = {
      ...dimension,
      from: { x: 0, y: 0 },
      to: { x: 0, y: 10 },
      offset_distance: 0,
      offset_direction: { x: -1, y: 0 },
      text_ccw_rotation: undefined,
    }
    const bounds = getComprehensivePcbBounds([verticalDimension])

    expect(bounds.minX).toBeCloseTo(-1.25)
    expect(bounds.maxX).toBeCloseTo(0.25)
    expect(bounds.minY).toBeCloseTo(0)
    expect(bounds.maxY).toBeCloseTo(10)
  })

  test(`${dimension.type} combines the segment direction with relative text rotation`, () => {
    const diagonalDimension = {
      ...dimension,
      to: { x: 2, y: 2 },
      text: "2.83 mm",
      offset_direction: { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
      text_ccw_rotation: 45,
    }
    const bounds = getComprehensivePcbBounds([diagonalDimension])

    // A 45-degree segment plus 45-degree text rotation makes the label vertical.
    expect(bounds.minX).toBeCloseTo(-2.249568901, 6)
    expect(bounds.maxY).toBeCloseTo(5.849568901, 6)
  })
}
