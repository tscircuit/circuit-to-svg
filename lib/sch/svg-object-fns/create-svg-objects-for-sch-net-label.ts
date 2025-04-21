import type { AnyCircuitElement, SchematicNetLabel } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { colorMap } from "lib/utils/colors"
import {
  getSchMmFontSize,
  getSchScreenFontSize,
} from "lib/utils/get-sch-font-size"
import { getSchStrokeSize } from "lib/utils/get-sch-stroke-size"
import { getUnitVectorFromOutsideToEdge } from "lib/utils/get-unit-vector-from-outside-to-edge"
import {
  applyToPoint,
  compose,
  rotate,
  scale,
  translate,
  type Matrix,
} from "transformation-matrix"
import { estimateTextWidth } from "../estimate-text-width"
import { createSvgObjectsForSchNetLabelWithSymbol } from "./create-svg-objects-for-sch-net-label-with-symbol"
import {
  ARROW_POINT_WIDTH_FSR,
  END_PADDING_FSR,
  END_PADDING_EXTRA_PER_CHARACTER_FSR,
} from "../../utils/net-label-utils"

export const createSvgObjectsForSchNetLabel = (
  schNetLabel: SchematicNetLabel,
  realToScreenTransform: Matrix,
): SvgObject[] => {
  if (!schNetLabel.text) return []

  // If symbol_name is provided, use the symbol renderer

  if (schNetLabel.symbol_name) {
    return createSvgObjectsForSchNetLabelWithSymbol(
      schNetLabel,
      realToScreenTransform,
    )
  }

  const svgObjects: SvgObject[] = []

  const fontSizePx = getSchScreenFontSize(realToScreenTransform, "net_label")
  const fontSizeMm = getSchMmFontSize("net_label")
  const textWidthFSR = estimateTextWidth(schNetLabel.text || "")

  // Transform the center position to screen coordinates
  const screenCenter = applyToPoint(realToScreenTransform, schNetLabel.center)

  const realTextGrowthVec = getUnitVectorFromOutsideToEdge(
    schNetLabel.anchor_side,
  )

  const screenTextGrowthVec = { ...realTextGrowthVec }
  screenTextGrowthVec.y *= -1 // Invert y direction because anchor_side is pre-transform

  const fullWidthFsr =
    textWidthFSR +
    ARROW_POINT_WIDTH_FSR * 2 +
    END_PADDING_EXTRA_PER_CHARACTER_FSR * schNetLabel.text.length +
    END_PADDING_FSR
  const screenAnchorPosition = schNetLabel.anchor_position
    ? applyToPoint(realToScreenTransform, schNetLabel.anchor_position)
    : {
        x:
          screenCenter.x -
          (screenTextGrowthVec.x * fullWidthFsr * fontSizePx) / 2,
        y:
          screenCenter.y -
          (screenTextGrowthVec.y * fullWidthFsr * fontSizePx) / 2,
      }
  const realAnchorPosition = schNetLabel.anchor_position ?? {
    x:
      schNetLabel.center.x -
      (realTextGrowthVec.x * fullWidthFsr * fontSizeMm) / 2,
    y:
      schNetLabel.center.y -
      (realTextGrowthVec.y * fullWidthFsr * fontSizeMm) / 2,
  }

  // Get rotation angle based on anchor_side
  const pathRotation = {
    left: 0,
    top: -90,
    bottom: 90,
    right: 180,
  }[schNetLabel.anchor_side]

  // Calculate the points for the outline
  const screenOutlinePoints: Array<{ x: number; y: number }> = [
    // Arrow point in font-relative coordinates
    {
      x: 0,
      y: 0,
    },
    // Top left corner in font-relative coordinates
    {
      x: ARROW_POINT_WIDTH_FSR,
      y: 0.6,
    },
    // Top right corner in font-relative coordinates
    {
      x:
        ARROW_POINT_WIDTH_FSR * 2 +
        END_PADDING_FSR +
        END_PADDING_EXTRA_PER_CHARACTER_FSR * schNetLabel.text.length +
        textWidthFSR,
      y: 0.6,
    },
    // Bottom right corner in font-relative coordinates
    {
      x:
        ARROW_POINT_WIDTH_FSR * 2 +
        END_PADDING_FSR +
        END_PADDING_EXTRA_PER_CHARACTER_FSR * schNetLabel.text.length +
        textWidthFSR,
      y: -0.6,
    },
    // Bottom left corner in font-relative coordinates
    {
      x: ARROW_POINT_WIDTH_FSR,
      y: -0.6,
    },
  ].map((fontRelativePoint) =>
    applyToPoint(
      compose(
        realToScreenTransform,
        translate(realAnchorPosition.x, realAnchorPosition.y),
        scale(fontSizeMm),
        rotate((pathRotation / 180) * Math.PI),
      ),
      fontRelativePoint,
    ),
  )

  // Create the label path
  const pathD = `
    M ${screenOutlinePoints[0]!.x},${screenOutlinePoints[0]!.y}
    L ${screenOutlinePoints[1]!.x},${screenOutlinePoints[1]!.y}
    L ${screenOutlinePoints[2]!.x},${screenOutlinePoints[2]!.y}
    L ${screenOutlinePoints[3]!.x},${screenOutlinePoints[3]!.y}
    L ${screenOutlinePoints[4]!.x},${screenOutlinePoints[4]!.y}
    Z
  `

  // Add the label container path
  svgObjects.push({
    name: "path",
    type: "element",
    attributes: {
      class: "net-label",
      d: pathD,
      fill: colorMap.schematic.label_background,
      stroke: colorMap.schematic.label_global,
      "stroke-width": `${getSchStrokeSize(realToScreenTransform)}px`,
    },
    value: "",
    children: [],
  })

  const screenTextPos = {
    x: screenAnchorPosition.x + screenTextGrowthVec.x * fontSizePx * 0.5,
    y: screenAnchorPosition.y + screenTextGrowthVec.y * fontSizePx * 0.5,
  }

  const textAnchor = {
    left: "start",
    top: "start",
    bottom: "start",
    right: "end",
  }[schNetLabel.anchor_side]

  const textTransformString = {
    left: "",
    right: "",
    top: `rotate(90 ${screenTextPos.x} ${screenTextPos.y})`,
    bottom: `rotate(-90 ${screenTextPos.x} ${screenTextPos.y})`,
  }[schNetLabel.anchor_side]

  // Add the label text
  svgObjects.push({
    name: "text",
    type: "element",
    attributes: {
      class: "net-label-text",
      x: screenTextPos.x.toString(),
      y: screenTextPos.y.toString(),
      fill: colorMap.schematic.label_global,
      "text-anchor": textAnchor,
      "dominant-baseline": "central",
      "font-family": "sans-serif",
      "font-variant-numeric": "tabular-nums",
      "font-size": `${fontSizePx}px`,
      transform: textTransformString,
    },
    children: [
      {
        type: "text",
        value: schNetLabel.text || "",
        name: "",
        attributes: {},
        children: [],
      },
    ],
    value: "",
  })

  return svgObjects
}
