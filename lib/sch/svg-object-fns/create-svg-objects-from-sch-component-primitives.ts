import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"
import type { Matrix } from "transformation-matrix"
import { createSvgObjectsFromSchematicArc } from "./create-svg-objects-from-sch-arc"
import { createSvgObjectsFromSchematicCircle } from "./create-svg-objects-from-sch-circle"
import { createSvgObjectsFromSchematicLine } from "./create-svg-objects-from-sch-line"
import { createSvgObjectsFromSchematicPath } from "./create-svg-objects-from-sch-path"
import { createSvgObjectsFromSchematicRect } from "./create-svg-objects-from-sch-rect"

export const createSvgObjectsFromSchematicPrimitivesForComponent = ({
  circuitJson,
  schematicComponentId,
  transform,
  colorMap,
}: {
  circuitJson: AnyCircuitElement[]
  schematicComponentId: string
  transform: Matrix
  colorMap: ColorMap
}): SvgObject[] => {
  const svgObjects: SvgObject[] = []
  const schDb = su(circuitJson as any)

  for (const schLine of schDb.schematic_line.list({
    schematic_component_id: schematicComponentId,
  })) {
    svgObjects.push(
      ...createSvgObjectsFromSchematicLine({
        schLine,
        transform,
        colorMap,
      }),
    )
  }

  for (const schCircle of schDb.schematic_circle.list({
    schematic_component_id: schematicComponentId,
  })) {
    svgObjects.push(
      ...createSvgObjectsFromSchematicCircle({
        schCircle,
        transform,
        colorMap,
      }),
    )
  }

  for (const schRect of schDb.schematic_rect.list({
    schematic_component_id: schematicComponentId,
  })) {
    svgObjects.push(
      ...createSvgObjectsFromSchematicRect({
        schRect,
        transform,
        colorMap,
      }),
    )
  }

  for (const schArc of schDb.schematic_arc.list({
    schematic_component_id: schematicComponentId,
  })) {
    svgObjects.push(
      ...createSvgObjectsFromSchematicArc({
        schArc,
        transform,
        colorMap,
      }),
    )
  }

  for (const schPath of schDb.schematic_path.list({
    schematic_component_id: schematicComponentId,
  })) {
    svgObjects.push(
      ...createSvgObjectsFromSchematicPath({
        schPath,
        transform,
        colorMap,
      }),
    )
  }

  return svgObjects
}
