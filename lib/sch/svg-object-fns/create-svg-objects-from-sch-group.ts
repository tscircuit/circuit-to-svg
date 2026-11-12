import type { SchematicGroup, SchematicPort } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"
import { getSchStrokeSize } from "lib/utils/get-sch-stroke-size"
import { applyToPoint, type Matrix } from "transformation-matrix"
import { getSchematicGroupPortLabel } from "../get-schematic-group-port-label"
import { createSvgSchText } from "./create-svg-objects-for-sch-text"

/** Project the resolved schematic-world boundary (+X right, +Y up, mm) into SVG pixels. */
export function createSvgObjectsFromSchematicGroup({
  group,
  transform,
  colorMap,
}: {
  group: SchematicGroup
  transform: Matrix
  colorMap: ColorMap
}): SvgObject[] {
  if (!group.show_boundary || group.show_as_schematic_box) return []
  const topLeft = applyToPoint(transform, {
    x: group.center.x - group.width / 2,
    y: group.center.y + group.height / 2,
  })
  const bottomRight = applyToPoint(transform, {
    x: group.center.x + group.width / 2,
    y: group.center.y - group.height / 2,
  })
  const strokeWidth = getSchStrokeSize(transform)
  const children: SvgObject[] = [
    {
      type: "element",
      name: "rect",
      value: "",
      children: [],
      attributes: {
        class: "sch-group-boundary",
        x: String(topLeft.x),
        y: String(topLeft.y),
        width: String(bottomRight.x - topLeft.x),
        height: String(bottomRight.y - topLeft.y),
        fill: "none",
        stroke: colorMap.schematic.sheet,
        "stroke-width": String(strokeWidth),
        "stroke-dasharray": `${strokeWidth * 8} ${strokeWidth * 4}`,
      },
    },
  ]
  if (group.name)
    children.push(
      createSvgSchText({
        elm: {
          type: "schematic_text",
          schematic_text_id: `${group.schematic_group_id}_title`,
          text: group.name,
          color: colorMap.schematic.sheet_name,
          font_size: 0.22,
          rotation: 0,
          anchor: "top_left",
          position: {
            x: group.center.x - group.width / 2 + 0.2,
            y: group.center.y + group.height / 2 - 0.2,
          },
        },
        transform,
        colorMap,
      }),
    )
  return [
    {
      type: "element",
      name: "g",
      value: "",
      children,
      attributes: {
        class: "sch-group",
        "data-schematic-group-id": group.schematic_group_id,
        "data-source-group-id": group.source_group_id,
      },
    },
  ]
}

/** Render an explicit group terminal; neither ownership nor connectivity is inferred from proximity. */
export function createSvgObjectsFromSchematicGroupPort({
  port,
  transform,
  colorMap,
}: {
  port: SchematicPort
  transform: Matrix
  colorMap: ColorMap
}): SvgObject[] {
  if (
    !port.schematic_group_id ||
    !port.boundary_position ||
    port.schematic_component_id
  )
    return []
  const boundary = applyToPoint(transform, port.boundary_position)
  const terminal = applyToPoint(transform, port.center)
  const strokeWidth = getSchStrokeSize(transform)
  const markerSize = Math.abs(transform.a) * 0.1
  return [
    {
      type: "element",
      name: "g",
      value: "",
      attributes: {
        class: "sch-group-port",
        "data-schematic-port-id": port.schematic_port_id,
        "data-source-port-id": port.source_port_id,
        "data-schematic-group-id": port.schematic_group_id,
      },
      children: [
        {
          type: "element",
          name: "line",
          value: "",
          children: [],
          attributes: {
            x1: String(boundary.x),
            y1: String(boundary.y),
            x2: String(terminal.x),
            y2: String(terminal.y),
            stroke: colorMap.schematic.pin,
            "stroke-width": String(strokeWidth),
          },
        },
        {
          type: "element",
          name: "rect",
          value: "",
          children: [],
          attributes: {
            class: "sch-group-port-terminal",
            x: String(boundary.x - markerSize / 2),
            y: String(boundary.y - markerSize / 2),
            width: String(markerSize),
            height: String(markerSize),
            fill: colorMap.schematic.background,
            stroke: colorMap.schematic.pin,
            "stroke-width": String(strokeWidth),
          },
        },
        createSvgSchText({
          elm: {
            ...getSchematicGroupPortLabel(port),
            color: colorMap.schematic.pin_name,
          },
          transform,
          colorMap,
        }),
      ],
    },
  ]
}
