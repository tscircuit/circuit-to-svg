import { colorMap } from "lib/utils/colors"
import type { INode as SvgObject } from "svgson"

interface LabeledPoint {
  x: number
  y: number
  label?: string
}

export function drawSchematicLabeledPoints(points: LabeledPoint[]): SvgObject {
  const labeledPointsGroup: any[] = []

  for (const point of points) {
    // Add X marker
    labeledPointsGroup.push({
      name: "path",
      type: "element",
      attributes: {
        d: `M${point.x - 0.1},${point.y - 0.1} L${point.x + 0.1},${point.y + 0.1} M${point.x - 0.1},${point.y + 0.1} L${point.x + 0.1},${point.y - 0.1}`,
        stroke: colorMap.schematic.grid,
        "stroke-width": "0.02",
        "stroke-opacity": "0.7",
      },
    })

    // Add label
    labeledPointsGroup.push({
      name: "text",
      type: "element",
      attributes: {
        x: (point.x + 0.15).toString(),
        y: (point.y - 0.15).toString(),
        fill: colorMap.schematic.grid,
        "font-size": "0.15",
        "fill-opacity": "0.7",
      },
      children: [
        {
          type: "text",
          value: point.label || `(${point.x},${point.y})`,
          name: "",
          attributes: {},
          children: [],
        },
      ],
    })
  }

  return {
    name: "g",
    value: "",
    type: "element",
    attributes: { class: "labeled-points" },
    children: labeledPointsGroup,
  }
}
