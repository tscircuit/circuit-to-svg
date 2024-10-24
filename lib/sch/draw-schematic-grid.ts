import { colorMap } from "lib/utils/colors"
import type { INode as SvgObject } from "svgson"
import type { Matrix } from "transformation-matrix"

export function drawSchematicGrid(params: {
  bounds: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
  transform: Matrix
  cellSize?: number
  labelCells?: boolean
}): SvgObject {
  const { minX, minY, maxX, maxY } = params.bounds
  const cellSize = params.cellSize ?? 1
  const labelCells = params.labelCells ?? false
  const gridLines: any[] = []

  // Vertical lines
  for (let x = Math.ceil(minX); x <= Math.floor(maxX); x += cellSize) {
    gridLines.push({
      name: "line",
      type: "element",
      attributes: {
        x1: x.toString(),
        y1: minY.toString(),
        x2: x.toString(),
        y2: maxY.toString(),
        stroke: colorMap.schematic.grid,
        "stroke-width": "0.01",
        "stroke-opacity": "0.5",
      },
    })
  }

  // Horizontal lines
  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y += cellSize) {
    gridLines.push({
      name: "line",
      type: "element",
      attributes: {
        x1: minX.toString(),
        y1: y.toString(),
        x2: maxX.toString(),
        y2: y.toString(),
        stroke: colorMap.schematic.grid,
        "stroke-width": "0.01",
        "stroke-opacity": "0.5",
      },
    })
  }

  // Add cell labels if enabled
  if (labelCells) {
    for (let x = Math.ceil(minX); x <= Math.floor(maxX); x += cellSize) {
      for (let y = Math.ceil(minY); y <= Math.floor(maxY); y += cellSize) {
        gridLines.push({
          name: "text",
          type: "element",
          attributes: {
            x: x.toString(),
            y: y.toString(),
            fill: colorMap.schematic.grid,
            "font-size": (cellSize / 6).toString(),
            "fill-opacity": "0.5",
          },
          children: [
            {
              type: "text",
              value: `${x},${y}`,
              name: "",
              attributes: {},
              children: [],
            },
          ],
        })
      }
    }
  }

  return {
    name: "g",
    value: "",
    type: "element",
    attributes: { class: "grid" },
    children: gridLines,
  }
}
