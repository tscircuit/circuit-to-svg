import type { SchematicText } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"
import { getSchScreenFontSize } from "lib/utils/get-sch-font-size"
import { applyToPoint, type Matrix } from "transformation-matrix"

export const createSvgSchText = ({
  elm,
  transform,
  colorMap,
}: {
  elm: SchematicText
  transform: Matrix
  colorMap: ColorMap
}): SvgObject => {
  // Apply transformation
  const center = applyToPoint(transform, elm.position)

  const textAnchorMap: Record<
    | "center"
    | "left"
    | "right"
    | "top"
    | "bottom"
    | "top_left"
    | "top_center"
    | "top_right"
    | "center_left"
    | "center_right"
    | "bottom_left"
    | "bottom_center"
    | "bottom_right",
    string
  > = {
    center: "middle",
    left: "start",
    right: "end",
    top: "middle",
    bottom: "middle",
    top_left: "start",
    top_center: "middle",
    top_right: "end",
    center_left: "start",
    center_right: "end",
    bottom_left: "start",
    bottom_center: "middle",
    bottom_right: "end",
  }

  const dominantBaselineMap: Record<
    | "center"
    | "left"
    | "right"
    | "top"
    | "bottom"
    | "top_left"
    | "top_center"
    | "top_right"
    | "center_left"
    | "center_right"
    | "bottom_left"
    | "bottom_center"
    | "bottom_right",
    string
  > = {
    center: "middle",
    left: "middle",
    right: "middle",
    top: "hanging",
    bottom: "ideographic",
    top_left: "hanging",
    top_center: "hanging",
    top_right: "hanging",
    center_left: "middle",
    center_right: "middle",
    bottom_left: "ideographic",
    bottom_center: "ideographic",
    bottom_right: "ideographic",
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
