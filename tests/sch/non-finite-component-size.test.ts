import { expect, test } from "bun:test"
import type { AnyCircuitElement, SchematicComponent } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { parseSync, type INode } from "svgson"

function descendants(node: INode): INode[] {
  return [node, ...node.children.flatMap(descendants)]
}

const cases = [
  { width: Number.NaN, height: 3, zeroWidth: true, zeroHeight: false },
  { width: 2, height: Number.NaN, zeroWidth: false, zeroHeight: true },
  { width: Number.NaN, height: Number.NaN, zeroWidth: true, zeroHeight: true },
  {
    width: Number.POSITIVE_INFINITY,
    height: 3,
    zeroWidth: true,
    zeroHeight: false,
  },
  {
    width: 2,
    height: Number.POSITIVE_INFINITY,
    zeroWidth: false,
    zeroHeight: true,
  },
  {
    width: Number.NEGATIVE_INFINITY,
    height: 3,
    zeroWidth: true,
    zeroHeight: false,
  },
  {
    width: 2,
    height: Number.NEGATIVE_INFINITY,
    zeroWidth: false,
    zeroHeight: true,
  },
]

for (const { width, height, zeroWidth, zeroHeight } of cases) {
  test(`schematic component size ${width} x ${height} keeps finite geometry`, () => {
    const component: SchematicComponent = Object.freeze({
      type: "schematic_component",
      schematic_component_id: "invalid-size",
      center: { x: 10, y: 10 },
      size: Object.freeze({ width, height }),
      is_box_with_pins: true,
    })
    const neighbor: SchematicComponent = {
      type: "schematic_component",
      schematic_component_id: "neighbor",
      center: { x: 20, y: 10 },
      size: { width: 2, height: 3 },
      is_box_with_pins: true,
    }
    const circuitJson: AnyCircuitElement[] = [
      component,
      neighbor,
      {
        type: "schematic_port",
        schematic_port_id: "port",
        schematic_component_id: component.schematic_component_id,
        source_port_id: "source-port",
        center: { x: 8, y: 10 },
        side_of_component: "left",
        pin_number: 1,
        display_pin_label: "ENABLE",
      },
    ]

    const svg = parseSync(
      convertCircuitJsonToSchematicSvg(circuitJson, {
        width: 400,
        height: 400,
      }),
    )
    const nodes = descendants(svg)
    for (const node of nodes) {
      for (const value of Object.values(node.attributes)) {
        expect(value).not.toMatch(/\b(?:NaN|Infinity)\b/)
      }
    }

    const bodies = nodes.filter(
      (node) => node.attributes.class === "component chip sch-component-body",
    )
    expect(bodies).toHaveLength(2)
    const body = bodies[0]!
    expect(Number(body.attributes.width) === 0).toBe(zeroWidth)
    expect(Number(body.attributes.height) === 0).toBe(zeroHeight)
    const neighborBody = bodies[1]!
    expect(Number(neighborBody.attributes.width)).toBeGreaterThan(0)
    expect(Number(neighborBody.attributes.height)).toBeGreaterThan(0)
    expect(Number(neighborBody.attributes.x)).toBeGreaterThanOrEqual(0)
    expect(Number(neighborBody.attributes.y)).toBeGreaterThanOrEqual(0)
    expect(
      Number(neighborBody.attributes.x) + Number(neighborBody.attributes.width),
    ).toBeLessThanOrEqual(400)
    expect(
      Number(neighborBody.attributes.y) +
        Number(neighborBody.attributes.height),
    ).toBeLessThanOrEqual(400)
    expect(component.size.width).toBe(width)
    expect(component.size.height).toBe(height)
  })
}

test("finite schematic component dimensions retain their geometry", () => {
  const svg = parseSync(
    convertCircuitJsonToSchematicSvg(
      [
        {
          type: "schematic_component",
          schematic_component_id: "valid-size",
          center: { x: 0, y: 0 },
          size: { width: 2, height: 3 },
          is_box_with_pins: true,
        },
      ],
      { width: 400, height: 400 },
    ),
  )
  const body = descendants(svg).find(
    (node) => node.attributes.class === "component chip sch-component-body",
  )!
  expect(Number(body.attributes.x)).toBeCloseTo(100)
  expect(Number(body.attributes.y)).toBeCloseTo(50)
  expect(Number(body.attributes.width)).toBeCloseTo(200)
  expect(Number(body.attributes.height)).toBeCloseTo(300)
})
