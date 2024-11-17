import type { SchematicText } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { colorMap } from "lib/utils/colors"
import { getSchScreenFontSize } from "lib/utils/get-sch-font-size"
import { applyToPoint, type Matrix } from "transformation-matrix"

export const createSvgSchText = (
  elm: SchematicText,
  transform: Matrix,
): SvgObject => {
  // Apply transformation
  const center = applyToPoint(transform, elm.position)

  const textAnchorMap: Record<typeof elm.anchor, string> = {
    center: "middle",
    left: "start",
    right: "end",
    top: "middle",
    bottom: "middle",
  }

  const dominantBaselineMap: Record<typeof elm.anchor, string> = {
    center: "middle",
    left: "middle",
    right: "middle",
    top: "hanging",
    bottom: "ideographic",
  }

  return {
    type: "element",
    name: "text",
    value: "",
    attributes: {
      x: center.x.toString(),
      y: center.y.toString(),
      fill: elm.color ?? colorMap.schematic.sheet_label,
      "text-anchor": textAnchorMap[elm.anchor],
      "dominant-baseline": dominantBaselineMap[elm.anchor],
      "font-family": "sans-serif",
      "font-size": `${getSchScreenFontSize(transform, "reference_designator")}px`,
      transform: `rotate(${elm.rotation}, ${center.x}, ${center.y})`,
    },
    children: [
      {
        type: "text",
        value: elm.text,
        name: elm.schematic_text_id,
        attributes: {},
        children: [],
      },
    ],
  }
}
