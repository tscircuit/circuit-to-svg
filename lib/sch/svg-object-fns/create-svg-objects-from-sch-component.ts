import type { AnyCircuitElement, SchematicComponent } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"
import type { Matrix } from "transformation-matrix"
import { createSvgObjectsFromSchematicComponentWithBox } from "./create-svg-objects-from-sch-component-with-box"
import { createSvgObjectsFromSchematicComponentWithPrimitives } from "./create-svg-objects-from-sch-component-with-primitives"
import { createSvgObjectsFromSchematicComponentWithSymbol } from "./create-svg-objects-from-sch-component-with-symbol"
import { createSvgObjectsForSchPortOnNonBox } from "./create-svg-objects-for-sch-port-on-non-box"
import { su } from "@tscircuit/circuit-json-util"

export function createSvgObjectsFromSchematicComponent(params: {
  component: SchematicComponent
  transform: Matrix
  circuitJson: AnyCircuitElement[]
  colorMap: ColorMap
}): SvgObject[] {
  const { component, circuitJson, transform, colorMap } = params

  let boxOrSymbolElements: SvgObject[] = []
  if (component.is_box_with_pins !== false) {
    if (component.symbol_name) {
      boxOrSymbolElements =
        createSvgObjectsFromSchematicComponentWithSymbol(params)
    } else {
      boxOrSymbolElements =
        createSvgObjectsFromSchematicComponentWithBox(params)
    }
  } else {
    // Components marked as not box-with-pins draw their body as owned
    // primitives rather than a rectangle, so the box and symbol renderers
    // cannot draw their port decoration. Previously these components rendered
    // no inversion bubbles at all.
    //
    // Core already inserts the stem as a schematic_line, so only the bubble is
    // added here.
    boxOrSymbolElements = su(circuitJson as any)
      .schematic_port.list({
        schematic_component_id: component.schematic_component_id,
      })
      .flatMap((schPort) =>
        createSvgObjectsForSchPortOnNonBox({
          schPort,
          transform,
          colorMap,
        }),
      )
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
        class: "sch-component",
        "data-circuit-json-type": "schematic_component",
        "data-schematic-component-id": component.schematic_component_id,
        ...(component.schematic_sheet_id
          ? { "data-schematic-sheet-id": component.schematic_sheet_id }
          : {}),
      },
      children: innerElements,
      value: "",
    },
  ]
}
