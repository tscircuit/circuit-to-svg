import type { SchematicSheet } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"
import { getSchScreenFontSize } from "lib/utils/get-sch-font-size"
import { type Matrix, applyToPoint } from "transformation-matrix"
import { getSchematicSheetLayout } from "../schematic-sheet-utils"

const SHEET_STROKE_WIDTH = 0.2
const SHEET_LABEL_FONT_SIZE = 3
const SHEET_COLUMNS = ["1", "2", "3", "4", "5", "6"]
const SHEET_ROWS = ["A", "B", "C", "D"]

export function createSvgObjectsFromSchematicSheet({
  schematicSheet,
  transform,
  colorMap,
}: {
  schematicSheet: SchematicSheet
  transform: Matrix
  colorMap: ColorMap
}): SvgObject[] {
  const layout = getSchematicSheetLayout(schematicSheet)
  const sheetColor = colorMap.schematic.sheet
  const labelColor = colorMap.schematic.net_name
  const children: SvgObject[] = [
    createSheetRect({
      id: `${schematicSheet.schematic_sheet_id}_outer`,
      center: layout.center,
      width: layout.width,
      height: layout.height,
      transform,
      color: sheetColor,
    }),
    createSheetRect({
      id: `${schematicSheet.schematic_sheet_id}_inner`,
      center: layout.center,
      width: layout.innerMaxX - layout.innerMinX,
      height: layout.innerMaxY - layout.innerMinY,
      transform,
      color: sheetColor,
    }),
  ]

  for (let i = 1; i < SHEET_COLUMNS.length; i++) {
    const x =
      layout.innerMinX +
      ((layout.innerMaxX - layout.innerMinX) * i) / SHEET_COLUMNS.length
    children.push(
      createSheetLine({
        id: `${schematicSheet.schematic_sheet_id}_top_column_${i}`,
        x1: x,
        y1: layout.maxY,
        x2: x,
        y2: layout.innerMaxY,
        transform,
        color: sheetColor,
      }),
      createSheetLine({
        id: `${schematicSheet.schematic_sheet_id}_bottom_column_${i}`,
        x1: x,
        y1: layout.minY,
        x2: x,
        y2: layout.innerMinY,
        transform,
        color: sheetColor,
      }),
    )
  }

  for (let i = 1; i < SHEET_ROWS.length; i++) {
    const y =
      layout.innerMinY +
      ((layout.innerMaxY - layout.innerMinY) * i) / SHEET_ROWS.length
    children.push(
      createSheetLine({
        id: `${schematicSheet.schematic_sheet_id}_left_row_${i}`,
        x1: layout.minX,
        y1: y,
        x2: layout.innerMinX,
        y2: y,
        transform,
        color: sheetColor,
      }),
      createSheetLine({
        id: `${schematicSheet.schematic_sheet_id}_right_row_${i}`,
        x1: layout.maxX,
        y1: y,
        x2: layout.innerMaxX,
        y2: y,
        transform,
        color: sheetColor,
      }),
    )
  }

  SHEET_COLUMNS.forEach((text, i) => {
    const x =
      layout.innerMinX +
      ((layout.innerMaxX - layout.innerMinX) * (i + 0.5)) / SHEET_COLUMNS.length
    children.push(
      createSheetText({
        text,
        x,
        y: (layout.maxY + layout.innerMaxY) / 2,
        transform,
        color: labelColor,
      }),
      createSheetText({
        text,
        x,
        y: (layout.minY + layout.innerMinY) / 2,
        transform,
        color: labelColor,
      }),
    )
  })

  SHEET_ROWS.forEach((text, i) => {
    const y =
      layout.innerMinY +
      ((layout.innerMaxY - layout.innerMinY) * (SHEET_ROWS.length - i - 0.5)) /
        SHEET_ROWS.length
    children.push(
      createSheetText({
        text,
        x: (layout.minX + layout.innerMinX) / 2,
        y,
        transform,
        color: labelColor,
      }),
      createSheetText({
        text,
        x: (layout.maxX + layout.innerMaxX) / 2,
        y,
        transform,
        color: labelColor,
      }),
    )
  })

  return [
    {
      name: "g",
      type: "element",
      value: "",
      attributes: {
        class: "schematic-sheet",
        "data-circuit-json-type": "schematic_sheet",
        "data-schematic-sheet-id": schematicSheet.schematic_sheet_id,
      },
      children,
    },
  ]
}

function createSheetRect({
  id,
  center,
  width,
  height,
  transform,
  color,
}: {
  id: string
  center: { x: number; y: number }
  width: number
  height: number
  transform: Matrix
  color: string
}): SvgObject {
  const screenCenter = applyToPoint(transform, center)
  const screenWidth = Math.abs(transform.a) * width
  const screenHeight = Math.abs(transform.d) * height

  return {
    name: "rect",
    type: "element",
    value: "",
    attributes: {
      class: "sch-rect",
      x: (screenCenter.x - screenWidth / 2).toString(),
      y: (screenCenter.y - screenHeight / 2).toString(),
      width: screenWidth.toString(),
      height: screenHeight.toString(),
      fill: "none",
      stroke: color,
      "stroke-width": (Math.abs(transform.a) * SHEET_STROKE_WIDTH).toString(),
      "data-schematic-rect-id": id,
    },
    children: [],
  }
}

function createSheetLine({
  id,
  x1,
  y1,
  x2,
  y2,
  transform,
  color,
}: {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  transform: Matrix
  color: string
}): SvgObject {
  const p1 = applyToPoint(transform, { x: x1, y: y1 })
  const p2 = applyToPoint(transform, { x: x2, y: y2 })

  return {
    name: "line",
    type: "element",
    value: "",
    attributes: {
      class: "sch-line",
      x1: p1.x.toString(),
      y1: p1.y.toString(),
      x2: p2.x.toString(),
      y2: p2.y.toString(),
      stroke: color,
      "stroke-width": (Math.abs(transform.a) * SHEET_STROKE_WIDTH).toString(),
      "data-schematic-line-id": id,
    },
    children: [],
  }
}

function createSheetText({
  text,
  x,
  y,
  transform,
  color,
}: {
  text: string
  x: number
  y: number
  transform: Matrix
  color: string
}): SvgObject {
  const center = applyToPoint(transform, { x, y })

  return {
    type: "element",
    name: "text",
    value: "",
    attributes: {
      class: "sch-text",
      x: center.x.toString(),
      y: center.y.toString(),
      fill: color,
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      "font-family": "sans-serif",
      "font-size": `${getSchScreenFontSize(transform, "reference_designator", SHEET_LABEL_FONT_SIZE)}px`,
      transform: `rotate(0, ${center.x}, ${center.y})`,
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
