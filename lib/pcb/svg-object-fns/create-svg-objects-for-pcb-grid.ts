import { type INode as SvgObject } from "svgson"

export interface PcbGridOptions {
  cellSize: number
  lineColor?: string
  majorCellSize?: number
  majorLineColor?: string
}

export interface CreateSvgObjectsForPcbGridParams {
  grid?: PcbGridOptions
  svgWidth: number
  svgHeight: number
}

export interface PcbGridSvgObjects {
  defs?: SvgObject
  rect?: SvgObject
}

const DEFAULT_GRID_LINE_COLOR = "rgba(255, 255, 255, 0.5)"
const GRID_PATTERN_ID = "pcb-grid-pattern"

export function createSvgObjectsForPcbGrid({
  grid,
  svgWidth,
  svgHeight,
}: CreateSvgObjectsForPcbGridParams): PcbGridSvgObjects {
  if (!grid) {
    return {}
  }

  const gridLineColor = grid.lineColor ?? DEFAULT_GRID_LINE_COLOR
  const gridCellSize = grid.cellSize
  const majorCellSize = grid.majorCellSize
  const majorLineColor = grid.majorLineColor ?? gridLineColor

  if (majorCellSize !== undefined) {
    if (!gridCellSize || gridCellSize <= 0) {
      throw new Error("grid.majorCellSize requires a positive grid.cellSize")
    }

    if (majorCellSize <= 0) {
      throw new Error(
        "grid.majorCellSize must be a positive multiple of grid.cellSize",
      )
    }

    const ratio = majorCellSize / gridCellSize
    const nearestInteger = Math.round(ratio)

    if (!Number.isFinite(ratio) || Math.abs(ratio - nearestInteger) > 1e-6) {
      throw new Error(
        "grid.majorCellSize must be a positive multiple of grid.cellSize",
      )
    }
  }

  if (!gridCellSize || gridCellSize <= 0) {
    return {}
  }

  const hasMajorGrid = majorCellSize !== undefined

  const patternChildren = hasMajorGrid
    ? createMajorGridPatternChildren(
        gridCellSize,
        majorCellSize!,
        gridLineColor,
        majorLineColor,
      )
    : [
        {
          name: "path",
          type: "element",
          value: "",
          attributes: {
            d: `M ${gridCellSize} 0 L 0 0 0 ${gridCellSize}`,
            fill: "none",
            stroke: gridLineColor,
            "stroke-width": "1",
            "shape-rendering": "crispEdges",
          },
          children: [],
        },
      ]

  const defs: SvgObject = {
    name: "defs",
    type: "element",
    value: "",
    attributes: {},
    children: [
      {
        name: "pattern",
        type: "element",
        value: "",
        attributes: {
          id: GRID_PATTERN_ID,
          width: hasMajorGrid
            ? majorCellSize!.toString()
            : gridCellSize.toString(),
          height: hasMajorGrid
            ? majorCellSize!.toString()
            : gridCellSize.toString(),
          patternUnits: "userSpaceOnUse",
        },
        children: patternChildren,
      },
    ],
  }

  const rect: SvgObject = {
    name: "rect",
    type: "element",
    value: "",
    attributes: {
      x: "0",
      y: "0",
      width: svgWidth.toString(),
      height: svgHeight.toString(),
      fill: `url(#${GRID_PATTERN_ID})`,
      "pointer-events": "none",
      "data-type": "pcb_grid",
      "data-pcb-layer": "global",
    },
    children: [],
  }

  return { defs, rect }
}

function createMajorGridPatternChildren(
  cellSize: number,
  majorCellSize: number,
  lineColor: string,
  majorLineColor: string,
): SvgObject[] {
  const children: SvgObject[] = []
  const steps = Math.round(majorCellSize / cellSize)

  for (let step = 0; step < steps; step += 1) {
    const offset = Number((step * cellSize).toFixed(6))
    const offsetString = offset.toString()
    const color = step === 0 ? majorLineColor : lineColor
    const majorSizeString = majorCellSize.toString()

    children.push({
      name: "line",
      type: "element",
      value: "",
      attributes: {
        x1: offsetString,
        y1: "0",
        x2: offsetString,
        y2: majorSizeString,
        stroke: color,
        "stroke-width": "1",
        "shape-rendering": "crispEdges",
      },
      children: [],
    })

    children.push({
      name: "line",
      type: "element",
      value: "",
      attributes: {
        x1: "0",
        y1: offsetString,
        x2: majorSizeString,
        y2: offsetString,
        stroke: color,
        "stroke-width": "1",
        "shape-rendering": "crispEdges",
      },
      children: [],
    })
  }

  return children
}
