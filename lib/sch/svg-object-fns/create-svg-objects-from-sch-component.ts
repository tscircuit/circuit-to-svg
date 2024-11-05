import type { AnyCircuitElement, SchematicComponent } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { createSvgObjectsFromSchematicComponentWithSymbol } from "./create-svg-objects-from-sch-component-with-symbol"
import { createSvgObjectsFromSchematicComponentWithBox } from "./create-svg-objects-from-sch-component-with-box"
import type { Matrix } from "transformation-matrix"

export function createSvgObjectsFromSchematicComponent(params: {
  component: SchematicComponent
  transform: Matrix
  circuitJson: AnyCircuitElement[]
}): SvgObject[] {
  const { component } = params

  if (component.symbol_name) {
    return createSvgObjectsFromSchematicComponentWithSymbol(params)
  }

  return createSvgObjectsFromSchematicComponentWithBox(params)
}
