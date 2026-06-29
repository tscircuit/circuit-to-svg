import type { AnyCircuitElement, SchematicSheet } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { colorMap as defaultColorMap } from "lib/utils/colors"
import {
  ensureElementNode,
  formatNumber,
  translateNestedSvg,
} from "lib/utils/svg-object-utils"
import { parseSync, stringify } from "svgson"
import { applyToPoint, fromString } from "transformation-matrix"
import { convertCircuitJsonToSchematicSvg } from "./convert-circuit-json-to-schematic-svg"
import {
  DEFAULT_SCHEMATIC_SHEET_HEIGHT,
  DEFAULT_SCHEMATIC_SHEET_WIDTH,
  getSchematicSheetLayout,
} from "./schematic-sheet-utils"

type SchematicSvgOptions = NonNullable<
  Parameters<typeof convertCircuitJsonToSchematicSvg>[1]
>

export interface StackedSchematicSheetsSvgOptions extends SchematicSvgOptions {
  /** Height in px of the label band drawn above each sheet. Default 28. */
  sheetLabelHeight?: number
  /** Vertical gap in px between stacked sheets. Default 16. */
  sheetGap?: number
}

const DEFAULT_SHEET_WIDTH = 1000
// Match the A4 sheet aspect ratio so panels don't get letterboxed with
// horizontal/vertical padding.
const SHEET_ASPECT_RATIO =
  DEFAULT_SCHEMATIC_SHEET_WIDTH / DEFAULT_SCHEMATIC_SHEET_HEIGHT
const DEFAULT_LABEL_HEIGHT = 28
const DEFAULT_GAP = 16

/**
 * Render every schematic sheet in the circuit JSON stacked vertically into a
 * single SVG, one panel per sheet with the sheet's display name on top. This is
 * primarily a debugging aid - `convertCircuitJsonToSchematicSvg` only renders a
 * single sheet at a time, so this makes it easy to eyeball every sheet at once.
 *
 * Each panel is the regular single-sheet render of that sheet (sheet border
 * included), so the panels look exactly like the normal schematic view. When
 * fewer than two sheets are present this falls back to the single-sheet
 * renderer.
 */
export function convertCircuitJsonToStackedSchematicSheetsSvg(
  circuitJson: AnyCircuitElement[],
  options?: StackedSchematicSheetsSvgOptions,
): string {
  const sheets = circuitJson
    .filter((elm): elm is SchematicSheet => elm.type === "schematic_sheet")
    .slice()
    .sort((a, b) => (a.sheet_index ?? 0) - (b.sheet_index ?? 0))

  // Nothing to stack - defer to the normal single-sheet renderer.
  if (sheets.length <= 1) {
    return convertCircuitJsonToSchematicSvg(circuitJson, options)
  }

  const sheetWidth = options?.width ?? DEFAULT_SHEET_WIDTH
  const sheetHeight =
    options?.height ?? Math.round(sheetWidth / SHEET_ASPECT_RATIO)
  const labelHeight = options?.sheetLabelHeight ?? DEFAULT_LABEL_HEIGHT
  const gap = options?.sheetGap ?? DEFAULT_GAP

  const colorMap = {
    ...defaultColorMap,
    schematic: {
      ...defaultColorMap.schematic,
      ...(options?.colorOverrides?.schematic ?? {}),
    },
  }

  const children: SvgObject[] = []
  let yOffset = 0

  sheets.forEach((sheet, index) => {
    const sheetSvg = convertCircuitJsonToSchematicSvg(circuitJson, {
      ...options,
      schematicSheetId: sheet.schematic_sheet_id,
      schematicSheetIndex: undefined,
      width: sheetWidth,
      height: sheetHeight,
    })

    const sheetNode = ensureElementNode(parseSync(sheetSvg))
    const panelTop = yOffset + labelHeight

    const labelText =
      (sheet as { display_name?: string }).display_name ??
      sheet.name ??
      `Sheet ${sheet.sheet_index ?? index + 1}`

    const labelPosition = getSheetLabelPosition({
      sheet,
      transformStr: sheetNode.attributes?.["data-real-to-screen-transform"],
      panelTop,
      labelHeight,
    })

    children.push(
      {
        name: "text",
        type: "element",
        value: "",
        attributes: {
          class: "stacked-sheet-label",
          x: formatNumber(labelPosition.x),
          y: formatNumber(labelPosition.y),
          "font-family": "sans-serif",
          "font-size": `${formatNumber(labelHeight * 0.55)}px`,
          fill: colorMap.schematic.reference,
          "data-schematic-sheet-id": sheet.schematic_sheet_id,
        },
        children: [
          {
            name: "",
            type: "text",
            value: labelText,
            attributes: {},
            children: [],
          },
        ],
      },
      translateNestedSvg(sheetNode, 0, panelTop, sheetWidth, sheetHeight),
    )

    yOffset = panelTop + sheetHeight + gap
  })

  const totalHeight = Math.max(0, yOffset - gap)

  const svgObject: SvgObject = {
    name: "svg",
    type: "element",
    value: "",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      class: "tscircuit-stacked-schematic",
      width: formatNumber(sheetWidth),
      height: formatNumber(totalHeight),
      viewBox: `0 0 ${formatNumber(sheetWidth)} ${formatNumber(totalHeight)}`,
      style: `background-color: ${colorMap.schematic.background}`,
    },
    children: [
      {
        name: "rect",
        type: "element",
        value: "",
        attributes: {
          class: "boundary",
          x: "0",
          y: "0",
          width: formatNumber(sheetWidth),
          height: formatNumber(totalHeight),
          fill: colorMap.schematic.background,
        },
        children: [],
      },
      ...children,
    ],
  }

  return stringify(svgObject)
}

/**
 * Position the sheet label in the reserved band above the panel, horizontally
 * aligned with the left edge of the sheet frame. The label baseline sits inside
 * the band (above `panelTop`) so there is always a gap between it and the frame.
 *
 * The frame is centered within the panel (with aspect-fit padding), so its real
 * left edge is mapped through the panel's real->screen transform to find the
 * label's x. Falls back to the panel's left edge when the transform is
 * unavailable.
 */
function getSheetLabelPosition({
  sheet,
  transformStr,
  panelTop,
  labelHeight,
}: {
  sheet: SchematicSheet
  transformStr: string | undefined
  panelTop: number
  labelHeight: number
}): { x: number; y: number } {
  // Baseline near the bottom of the band, leaving a gap below before the frame.
  const y = panelTop - labelHeight * 0.28

  if (!transformStr) {
    return { x: 4, y }
  }

  const layout = getSchematicSheetLayout(sheet)
  const frameLeft = applyToPoint(fromString(transformStr), {
    x: layout.minX,
    y: layout.maxY,
  })

  return { x: Math.max(2, frameLeft.x), y }
}
