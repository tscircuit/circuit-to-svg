import type {
  AnyCircuitElement,
  SchematicTable,
  SchematicTableCell,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"
import { getSchScreenFontSize } from "lib/utils/get-sch-font-size"
import { getSchStrokeSize } from "lib/utils/get-sch-stroke-size"
import { applyToPoint, type Matrix } from "transformation-matrix"
import { getTableDimensions } from "../get-table-dimensions"

export const createSvgObjectsFromSchematicTable = ({
  schematicTable,
  transform,
  colorMap,
  circuitJson,
}: {
  schematicTable: SchematicTable
  transform: Matrix
  colorMap: ColorMap
  circuitJson: AnyCircuitElement[]
}): SvgObject[] => {
  const {
    anchor_position,
    border_width = 0.05,
    anchor = "center",
  } = schematicTable

  const { column_widths, row_heights } = getTableDimensions(
    schematicTable,
    circuitJson,
  )

  const totalWidth = column_widths.reduce((a, b) => a + b, 0)
  const totalHeight = row_heights.reduce((a, b) => a + b, 0)

  let topLeftX = anchor_position.x
  let topLeftY = anchor_position.y

  // Horizontal alignment
  if (anchor.includes("center")) {
    topLeftX -= totalWidth / 2
  } else if (anchor.includes("right")) {
    topLeftX -= totalWidth
  }

  // Vertical alignment
  if (anchor.includes("center")) {
    topLeftY += totalHeight / 2
  } else if (anchor.includes("bottom")) {
    topLeftY += totalHeight
  }

  const svgObjects: SvgObject[] = []
  const borderStrokeWidth = border_width * Math.abs(transform.a)
  const gridStrokeWidth = getSchStrokeSize(transform)

  // Draw border
  const [screenTopLeftX, screenTopLeftY] = applyToPoint(transform, [
    topLeftX,
    topLeftY,
  ])
  const [screenBottomRightX, screenBottomRightY] = applyToPoint(transform, [
    topLeftX + totalWidth,
    topLeftY - totalHeight,
  ])

  svgObjects.push({
    name: "rect",
    type: "element",
    attributes: {
      x: screenTopLeftX.toString(),
      y: screenTopLeftY.toString(),
      width: (screenBottomRightX - screenTopLeftX).toString(),
      height: (screenBottomRightY - screenTopLeftY).toString(),
      fill: "none",
      stroke: "#666",
      "stroke-width": borderStrokeWidth.toString(),
    },
    children: [],
    value: "",
  })

  // Draw grid lines
  const cells = circuitJson.filter(
    (elm): elm is SchematicTableCell =>
      elm.type === "schematic_table_cell" &&
      elm.schematic_table_id === schematicTable.schematic_table_id,
  )

  let currentX = topLeftX
  for (let i = 0; i < column_widths.length - 1; i++) {
    currentX += column_widths[i]!
    let segmentStartY = topLeftY
    for (let j = 0; j < row_heights.length; j++) {
      const segmentEndY = segmentStartY - row_heights[j]!
      const isMerged = cells.some(
        (cell) =>
          cell.start_column_index <= i &&
          cell.end_column_index > i &&
          cell.start_row_index <= j &&
          cell.end_row_index >= j,
      )

      if (!isMerged) {
        const start = applyToPoint(transform, { x: currentX, y: segmentStartY })
        const end = applyToPoint(transform, { x: currentX, y: segmentEndY })
        svgObjects.push({
          name: "line",
          type: "element",
          attributes: {
            x1: start.x.toString(),
            y1: start.y.toString(),
            x2: end.x.toString(),
            y2: end.y.toString(),
            stroke: "#666",
            "stroke-width": gridStrokeWidth.toString(),
          },
          children: [],
          value: "",
        })
      }
      segmentStartY = segmentEndY
    }
  }

  let currentY = topLeftY
  for (let i = 0; i < row_heights.length - 1; i++) {
    currentY -= row_heights[i]!
    let segmentStartX = topLeftX
    for (let j = 0; j < column_widths.length; j++) {
      const segmentEndX = segmentStartX + column_widths[j]!
      const isMerged = cells.some(
        (cell) =>
          cell.start_row_index <= i &&
          cell.end_row_index > i &&
          cell.start_column_index <= j &&
          cell.end_column_index >= j,
      )

      if (!isMerged) {
        const start = applyToPoint(transform, {
          x: segmentStartX,
          y: currentY,
        })
        const end = applyToPoint(transform, { x: segmentEndX, y: currentY })
        svgObjects.push({
          name: "line",
          type: "element",
          attributes: {
            x1: start.x.toString(),
            y1: start.y.toString(),
            x2: end.x.toString(),
            y2: end.y.toString(),
            stroke: "#666",
            "stroke-width": gridStrokeWidth.toString(),
          },
          children: [],
          value: "",
        })
      }
      segmentStartX = segmentEndX
    }
  }

  // Draw cells

  for (const cell of cells) {
    if (cell.text) {
      // Calculate cell dimensions
      const cellWidth = column_widths
        .slice(cell.start_column_index, cell.end_column_index + 1)
        .reduce((a, b) => a + b, 0)
      const cellHeight = row_heights
        .slice(cell.start_row_index, cell.end_row_index + 1)
        .reduce((a, b) => a + b, 0)

      // Calculate cell top-left position
      const cellTopLeftX =
        topLeftX +
        column_widths
          .slice(0, cell.start_column_index)
          .reduce((a, b) => a + b, 0)
      const cellTopLeftY =
        topLeftY -
        row_heights.slice(0, cell.start_row_index).reduce((a, b) => a + b, 0)

      const { cell_padding = 0.2 } = schematicTable
      const horizontal_align = cell.horizontal_align ?? "center"
      const vertical_align = cell.vertical_align ?? "middle"

      let realTextAnchorPos = {
        x: cellTopLeftX + cellWidth / 2,
        y: cellTopLeftY - cellHeight / 2,
      }

      if (horizontal_align === "left") {
        realTextAnchorPos.x = cellTopLeftX + cell_padding
      } else if (horizontal_align === "right") {
        realTextAnchorPos.x = cellTopLeftX + cellWidth - cell_padding
      }

      if (vertical_align === "top") {
        realTextAnchorPos.y = cellTopLeftY - cell_padding
      } else if (vertical_align === "bottom") {
        realTextAnchorPos.y = cellTopLeftY - cellHeight + cell_padding
      }

      const screenTextAnchorPos = applyToPoint(transform, realTextAnchorPos)

      const fontSize = getSchScreenFontSize(
        transform,
        "reference_designator",
        cell.font_size,
      )

      const textAnchorMap: Record<
        "left" | "center" | "right",
        "start" | "middle" | "end"
      > = {
        left: "start",
        center: "middle",
        right: "end",
      }

      const dominantBaselineMap: Record<
        "top" | "middle" | "bottom",
        "hanging" | "middle" | "ideographic"
      > = {
        top: "hanging",
        middle: "middle",
        bottom: "ideographic",
      }

      svgObjects.push({
        name: "text",
        type: "element",
        attributes: {
          x: screenTextAnchorPos.x.toString(),
          y: screenTextAnchorPos.y.toString(),
          "font-size": `${fontSize}px`,
          "text-anchor": textAnchorMap[horizontal_align],
          "dominant-baseline": dominantBaselineMap[vertical_align],
          fill: "#666",
          "font-family": "sans-serif",
        },
        children: [
          {
            type: "text",
            value: cell.text,
            name: "",
            attributes: {},
            children: [],
          },
        ],
        value: "",
      })
    }
  }

  return [
    {
      name: "g",
      type: "element",
      attributes: {
        "data-schematic-table-id": schematicTable.schematic_table_id,
      },
      children: svgObjects,
      value: "",
    },
  ]
}
