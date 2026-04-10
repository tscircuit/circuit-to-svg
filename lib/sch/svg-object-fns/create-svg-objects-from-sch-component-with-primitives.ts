import type { AnyCircuitElement, SchematicComponent } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"
import type { Matrix } from "transformation-matrix"
import { createSvgObjectsFromSchematicLine } from "./create-svg-objects-from-sch-line"
import { createSvgObjectsFromSchematicCircle } from "./create-svg-objects-from-sch-circle"
import { createSvgObjectsFromSchematicRect } from "./create-svg-objects-from-sch-rect"
import { createSvgObjectsFromSchematicArc } from "./create-svg-objects-from-sch-arc"
import { createSvgObjectsFromSchematicPath } from "./create-svg-objects-from-sch-path"

export const createSvgObjectsFromSchematicComponentWithPrimitives = ({
  component: schComponent,
  transform,
  circuitJson,
  colorMap,
}: {
  component: SchematicComponent
  transform: Matrix
  circuitJson: AnyCircuitElement[]
  colorMap: ColorMap
}): SvgObject[] => {
  const svgObjects: SvgObject[] = []
  const compId = schComponent.schematic_component_id

  for (const elm of circuitJson) {
    if (
      !("schematic_component_id" in elm) ||
      elm.schematic_component_id !== compId
    )
      continue

    if (elm.type === "schematic_line") {
      svgObjects.push(
        ...createSvgObjectsFromSchematicLine({
          schLine: elm,
          transform,
          colorMap,
        }),
      )
    } else if (elm.type === "schematic_circle") {
      svgObjects.push(
        ...createSvgObjectsFromSchematicCircle({
          schCircle: elm,
          transform,
          colorMap,
        }),
      )
    } else if (elm.type === "schematic_rect") {
      svgObjects.push(
        ...createSvgObjectsFromSchematicRect({
          schRect: elm,
          transform,
          colorMap,
        }),
      )
    } else if (elm.type === "schematic_arc") {
      svgObjects.push(
        ...createSvgObjectsFromSchematicArc({
          schArc: elm,
          transform,
          colorMap,
        }),
      )
    } else if (elm.type === "schematic_path") {
      svgObjects.push(
        ...createSvgObjectsFromSchematicPath({
          schPath: elm,
          transform,
          colorMap,
        }),
      )
    }
  }

  return svgObjects
}
