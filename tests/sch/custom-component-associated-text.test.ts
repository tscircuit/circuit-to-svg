import { expect, test } from "bun:test"
import type { AnyCircuitElement, SchematicText } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { parseSync } from "svgson"

for (const isBoxWithPins of [false, true]) {
  test(`associated text renders once at its position (is_box_with_pins=${isBoxWithPins})`, () => {
    const component: AnyCircuitElement = {
      type: "schematic_component",
      schematic_component_id: "component_1",
      center: { x: 0, y: 0 },
      size: { width: 2, height: 2 },
      is_box_with_pins: isBoxWithPins,
    }
    const label: SchematicText = {
      type: "schematic_text",
      schematic_text_id: "text_1",
      schematic_component_id: "component_1",
      text: "U739",
      position: { x: 1.5, y: 1 },
      font_size: 0.2,
      anchor: "left",
      rotation: 0,
      color: "black",
    }
    const render = (text: SchematicText) =>
      parseSync(convertCircuitJsonToSchematicSvg([component, text]))
    const findLabels = (node: ReturnType<typeof parseSync>) => {
      const matches: ReturnType<typeof parseSync>[] = []
      const visit = (element: ReturnType<typeof parseSync>) => {
        if (
          element.name === "text" &&
          element.children.some((child) => child.value === label.text)
        ) {
          matches.push(element)
        }
        element.children.forEach(visit)
      }
      visit(node)
      return matches
    }

    const associated = findLabels(render(label))
    const { schematic_component_id, ...unassociatedLabel } = label
    const unassociated = findLabels(render(unassociatedLabel))

    expect(unassociated).toHaveLength(1)
    expect(associated).toHaveLength(1)
    expect(associated[0]).toEqual(unassociated[0])
  })
}
