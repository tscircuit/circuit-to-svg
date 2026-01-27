import type { SchematicPath } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint, toString as matrixToString } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"

export function createSvgObjectsFromSchematicPath({
  schPath,
  transform,
  colorMap,
}: {
  schPath: SchematicPath
  transform: Matrix
  colorMap: ColorMap
}): SvgObject[] {
  const strokeColor = schPath.stroke_color ?? colorMap.schematic.component_outline
  const fillColor = schPath.fill_color ?? "none"
  const strokeWidth = schPath.stroke_width
    ? Math.abs(transform.a) * schPath.stroke_width
    : Math.abs(transform.a) * 0.02

  // If svg_path is provided, use it directly with a transform
  if (schPath.svg_path) {
    return [
      {
        name: "g",
        type: "element",
        attributes: {
          transform: matrixToString(transform),
          ...(schPath.schematic_component_id && {
            "data-schematic-component-id": schPath.schematic_component_id,
          }),
        },
        children: [
          {
            name: "path",
            type: "element",
            attributes: {
              d: schPath.svg_path,
              stroke: strokeColor,
              "stroke-width": (schPath.stroke_width ?? 0.02).toString(),
              fill: schPath.is_filled ? fillColor : "none",
              "stroke-linecap": "round",
              "stroke-linejoin": "round",
            },
            children: [],
            value: "",
          },
        ],
        value: "",
      },
    ]
  }

  // Fall back to points-based path
  if (!schPath.points || schPath.points.length < 2) {
    return []
  }

  const transformedPoints = schPath.points.map((p) =>
    applyToPoint(transform, { x: p.x, y: p.y }),
  )

  // Build SVG path d attribute
  const pathD = transformedPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ")

  return [
    {
      name: "path",
      type: "element",
      attributes: {
        d: pathD,
        stroke: strokeColor,
        "stroke-width": strokeWidth.toString(),
        fill: schPath.is_filled ? fillColor : "none",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        ...(schPath.schematic_component_id && {
          "data-schematic-component-id": schPath.schematic_component_id,
        }),
      },
      children: [],
      value: "",
    },
  ]
}
