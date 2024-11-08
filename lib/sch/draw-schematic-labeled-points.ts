import { colorMap } from "lib/utils/colors"
import type { INode as SvgObject } from "svgson"
import { applyToPoint, type Matrix } from "transformation-matrix"

interface LabeledPoint {
  x: number
  y: number
  label?: string
}

export function drawSchematicLabeledPoints(params: {
  points: LabeledPoint[]
  transform: Matrix
}): SvgObject {
  const { points, transform } = params
  const labeledPointsGroup: any[] = []

  for (const point of points) {
    // Transform offset points for X marker
    const [x1, y1] = applyToPoint(transform, [point.x - 0.1, point.y - 0.1])
    const [x2, y2] = applyToPoint(transform, [point.x + 0.1, point.y + 0.1])
    const [x3, y3] = applyToPoint(transform, [point.x - 0.1, point.y + 0.1])
    const [x4, y4] = applyToPoint(transform, [point.x + 0.1, point.y - 0.1])

    // Add X marker
    labeledPointsGroup.push({
      name: "path",
      type: "element",
      attributes: {
        d: `M${x1},${y1} L${x2},${y2} M${x3},${y3} L${x4},${y4}`,
        stroke: colorMap.schematic.grid,
        "stroke-width": (0.02 * Math.abs(transform.a)).toString(),
        "stroke-opacity": "0.7",
      },
    })

    // Transform label position
    const [labelX, labelY] = applyToPoint(transform, [
      point.x + 0.15,
      point.y - 0.15,
    ])

    // Add label
    labeledPointsGroup.push({
      name: "text",
      type: "element",
      attributes: {
        x: labelX.toString(),
        y: labelY.toString(),
        fill: colorMap.schematic.grid,
        "font-size": (0.1 * Math.abs(transform.a)).toString(),
        "fill-opacity": "0.7",
        "text-anchor": "start",
        "font-family": "sans-serif",
        "dominant-baseline": "middle",
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
