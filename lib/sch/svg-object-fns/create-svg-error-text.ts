import type { SvgObject } from "lib/svg-object"
import { getSchScreenFontSize } from "lib/utils/get-sch-font-size"
import { type Matrix, type Point, applyToPoint } from "transformation-matrix"

export const createSvgSchErrorText = ({
  text,
  realCenter,
  realToScreenTransform,
}: {
  text: string
  realCenter: { x: number; y: number }
  realToScreenTransform: Matrix
}): SvgObject => {
  const screenCenter = applyToPoint(realToScreenTransform, realCenter)

  return {
    type: "element",
    name: "text",
    value: "",
    attributes: {
      x: screenCenter.x.toString(),
      y: screenCenter.y.toString(),
      fill: "red",
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      "font-family": "sans-serif",
      "font-size": `${getSchScreenFontSize(realToScreenTransform, "error")}px`,
    },
    children: [
      {
        type: "text",
        value: text,
        name: "",
        attributes: {},
        children: [],
      },
    ],
  }
}
