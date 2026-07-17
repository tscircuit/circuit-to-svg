import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicLine,
  SchematicPort,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"
import type { Matrix } from "transformation-matrix"
import { createSvgObjectsFromSchematicLine } from "./create-svg-objects-from-sch-line"
import { createSvgObjectsFromSchematicCircle } from "./create-svg-objects-from-sch-circle"
import { createSvgObjectsFromSchematicRect } from "./create-svg-objects-from-sch-rect"
import { createSvgObjectsFromSchematicArc } from "./create-svg-objects-from-sch-arc"
import { createSvgObjectsFromSchematicPath } from "./create-svg-objects-from-sch-path"
import { createSvgObjectsForSchPortPinLabel } from "./create-svg-objects-for-sch-port-pin-label"

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

  if (schComponent.is_box_with_pins === false) {
    const schLines = circuitJson.filter(
      (elm): elm is SchematicLine =>
        elm.type === "schematic_line" && elm.schematic_component_id === compId,
    )
    const schPorts = circuitJson.filter(
      (elm): elm is SchematicPort =>
        elm.type === "schematic_port" && elm.schematic_component_id === compId,
    )

    for (const schPort of schPorts) {
      const stem = schLines.find(
        (line) =>
          (line.x1 === schPort.center.x && line.y1 === schPort.center.y) ||
          (line.x2 === schPort.center.x && line.y2 === schPort.center.y),
      )
      if (!stem) continue

      const edge =
        stem.x1 === schPort.center.x && stem.y1 === schPort.center.y
          ? { x: stem.x2, y: stem.y2 }
          : { x: stem.x1, y: stem.y1 }
      const dx = edge.x - schPort.center.x
      const dy = edge.y - schPort.center.y
      const side =
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? "left"
            : "right"
          : dy > 0
            ? "bottom"
            : "top"
      const stemLength = Math.max(Math.abs(dx), Math.abs(dy))

      svgObjects.push(
        ...createSvgObjectsForSchPortPinLabel({
          schPort: {
            ...schPort,
            side_of_component: side,
            distance_from_component_edge: stemLength,
          },
          schComponent,
          transform,
          circuitJson,
          labelClassName: "port-label sch-pin-label",
          labelColor: colorMap.schematic.pin_name,
        }),
      )
    }
  }

  return svgObjects
}
