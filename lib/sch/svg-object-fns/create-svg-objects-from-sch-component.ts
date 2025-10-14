import type { AnyCircuitElement, SchematicComponent } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"
import { createSvgObjectsFromSchematicComponentWithSymbol } from "./create-svg-objects-from-sch-component-with-symbol"
import { createSvgObjectsFromSchematicComponentWithBox } from "./create-svg-objects-from-sch-component-with-box"
import { applyToPoint, type Matrix } from "transformation-matrix"
import { getSchStrokeSize } from "lib/utils/get-sch-stroke-size"
import { getSchScreenFontSize } from "lib/utils/get-sch-font-size"

export function createSvgObjectsFromSchematicComponent(params: {
  component: SchematicComponent
  transform: Matrix
  circuitJson: AnyCircuitElement[]
  colorMap: ColorMap
}): SvgObject[] {
  const { component, transform, circuitJson, colorMap } = params

  if (component.is_box_with_pins === false) {
    const innerElements: SvgObject[] = []

    const srcComponent = su(circuitJson).source_component.get(
      component.source_component_id!,
    )

    if (srcComponent?.name) {
      // Calculate position above the component center
      const labelPosition = applyToPoint(transform, {
        x: component.center.x,
        y: component.center.y + component.size.height / 2,
      })

      innerElements.push({
        name: "text",
        type: "element",
        attributes: {
          x: labelPosition.x.toString(),
          y: (labelPosition.y - Math.abs(transform.a) * 0.1).toString(),
          fill: colorMap.schematic.reference,
          stroke: colorMap.schematic.background,
          "stroke-width": `${getSchStrokeSize(transform)}px`,
          "paint-order": "stroke",
          "font-family": "sans-serif",
          "text-anchor": "middle",
          "dominant-baseline": "auto",
          "font-size": `${getSchScreenFontSize(transform, "reference_designator")}px`,
          class: "component-name",
          "data-schematic-component-id": component.schematic_component_id,
        },
        value: "",
        children: [
          {
            type: "text",
            value: srcComponent.name,
            name: "",
            attributes: {},
            children: [],
          },
        ],
      })
    }

    return [
      {
        type: "element",
        name: "g",
        attributes: {
          "data-circuit-json-type": "schematic_component",
          "data-schematic-component-id": component.schematic_component_id,
        },
        children: innerElements,
        value: "",
      },
    ]
  }

  const innerElements = component.symbol_name
    ? createSvgObjectsFromSchematicComponentWithSymbol(params)
    : createSvgObjectsFromSchematicComponentWithBox(params)

  return [
    {
      type: "element",
      name: "g",
      attributes: {
        "data-circuit-json-type": "schematic_component",
        "data-schematic-component-id": component.schematic_component_id,
      },
      children: innerElements,
      value: "",
    },
  ]
}
