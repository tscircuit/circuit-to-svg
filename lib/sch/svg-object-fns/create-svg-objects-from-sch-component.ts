import type { AnyCircuitElement, SchematicComponent } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"
import { createSvgObjectsFromSchematicComponentWithSymbol } from "./create-svg-objects-from-sch-component-with-symbol"
import { createSvgObjectsFromSchematicComponentWithBox } from "./create-svg-objects-from-sch-component-with-box"
import { createSvgObjectsFromSchematicComponentWithPrimitives } from "./create-svg-objects-from-sch-component-with-primitives"
import type { Matrix } from "transformation-matrix"

export function createSvgObjectsFromSchematicComponent(params: {
  component: SchematicComponent
  transform: Matrix
  circuitJson: AnyCircuitElement[]
  colorMap: ColorMap
}): SvgObject[] {
  const { component } = params

  let boxOrSymbolElements: SvgObject[] = []
  if (component.is_box_with_pins !== false) {
    if (component.symbol_name) {
      boxOrSymbolElements =
        createSvgObjectsFromSchematicComponentWithSymbol(params)
    } else {
      boxOrSymbolElements =
        createSvgObjectsFromSchematicComponentWithBox(params)
    }
  }

  // Owned primitives render after box/symbol so they appear on top
  const primitiveElements =
    createSvgObjectsFromSchematicComponentWithPrimitives(params)

  const innerElements = [...boxOrSymbolElements, ...primitiveElements]

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
