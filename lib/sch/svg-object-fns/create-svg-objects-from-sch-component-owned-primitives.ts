import type { AnyCircuitElement } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"
import type { Matrix } from "transformation-matrix"
import { createSvgObjectsFromSchematicArc } from "./create-svg-objects-from-sch-arc"
import { createSvgObjectsFromSchematicCircle } from "./create-svg-objects-from-sch-circle"
import { createSvgObjectsFromSchematicLine } from "./create-svg-objects-from-sch-line"
import { createSvgObjectsFromSchematicPath } from "./create-svg-objects-from-sch-path"
import { createSvgObjectsFromSchematicRect } from "./create-svg-objects-from-sch-rect"

export function createSvgObjectsFromSchematicComponentOwnedPrimitives(params: {
  schematicComponentId: string
  circuitJson: AnyCircuitElement[]
  transform: Matrix
  colorMap: ColorMap
}): SvgObject[] {
  const { schematicComponentId, circuitJson, transform, colorMap } = params
  const svgObjects: SvgObject[] = []

  for (const element of circuitJson) {
    if (element.type === "schematic_line") {
      if (element.schematic_component_id !== schematicComponentId) {
        continue
      }
      svgObjects.push(
        ...createSvgObjectsFromSchematicLine({
          schLine: element,
          transform,
          colorMap,
        }),
      )
      continue
    }

    if (element.type === "schematic_circle") {
      if (element.schematic_component_id !== schematicComponentId) {
        continue
      }
      svgObjects.push(
        ...createSvgObjectsFromSchematicCircle({
          schCircle: element,
          transform,
          colorMap,
        }),
      )
      continue
    }

    if (element.type === "schematic_rect") {
      if (element.schematic_component_id !== schematicComponentId) {
        continue
      }
      svgObjects.push(
        ...createSvgObjectsFromSchematicRect({
          schRect: element,
          transform,
          colorMap,
        }),
      )
      continue
    }

    if (element.type === "schematic_arc") {
      if (element.schematic_component_id !== schematicComponentId) {
        continue
      }
      svgObjects.push(
        ...createSvgObjectsFromSchematicArc({
          schArc: element,
          transform,
          colorMap,
        }),
      )
      continue
    }

    if (element.type === "schematic_path") {
      if (element.schematic_component_id !== schematicComponentId) {
        continue
      }
      svgObjects.push(
        ...createSvgObjectsFromSchematicPath({
          schPath: element,
          transform,
          colorMap,
        }),
      )
    }
  }

  return svgObjects
}
