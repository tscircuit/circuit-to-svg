import { applyToPoint, type Matrix } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"
import { getSchStrokeSize } from "lib/utils/get-sch-stroke-size"
import type { SchematicBox } from "circuit-json"

export const createSvgObjectsFromSchematicBox = ({
  schematicBox,
  transform,
  colorMap,
}: {
  schematicBox: SchematicBox
  transform: Matrix
  colorMap: ColorMap
}): SvgObject[] => {
  const topLeft = applyToPoint(transform, {
    x: schematicBox.x,
    y: schematicBox.y,
  })
  const bottomRight = applyToPoint(transform, {
    x: schematicBox.x + schematicBox.width,
    y: schematicBox.y + schematicBox.height,
  })

  const yTop = Math.min(topLeft.y, bottomRight.y)
  const yBottom = Math.max(topLeft.y, bottomRight.y)
  const xLeft = Math.min(topLeft.x, bottomRight.x)
  const xRight = Math.max(topLeft.x, bottomRight.x)

  const strokeWidthPx = getSchStrokeSize(transform)
  const attributes: Record<string, string> = {
    class: "schematic-box",
    x: xLeft.toString(),
    y: yTop.toString(),
    width: (xRight - xLeft).toString(),
    height: (yBottom - yTop).toString(),
    "stroke-width": `${strokeWidthPx}px`,
    stroke: colorMap.schematic.component_outline || "black",
    fill: "transparent",
  }

  if (schematicBox.is_dashed) {
    // Scale dash length according to zoom level
    const dashLength = 8 * strokeWidthPx
    const gapLength = 4 * strokeWidthPx
    attributes["stroke-dasharray"] = `${dashLength} ${gapLength}`
  }

  return [
    {
      name: "rect",
      type: "element",
      value: "",
      attributes,
      children: [],
    },
  ]
}
