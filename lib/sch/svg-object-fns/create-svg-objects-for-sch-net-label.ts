import type { AnyCircuitElement, SchematicNetLabel } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { colorMap } from "lib/utils/colors"
import { getSchFontSize } from "lib/utils/get-sch-font-size"
import { getSchStrokeSize } from "lib/utils/get-sch-stroke-size"
import { getUnitVectorFromEdgeToOutside } from "lib/utils/get-unit-vector-from-edge-to-outside"
import { getUnitVectorFromOutsideToEdge } from "lib/utils/get-unit-vector-from-outside-to-edge"
import { applyToPoint, type Matrix } from "transformation-matrix"

export const createSvgObjectsForSchNetLabel = (
  schNetLabel: SchematicNetLabel,
  transform: Matrix,
): SvgObject[] => {
  const svgObjects: SvgObject[] = []

  // Transform the center position to screen coordinates
  const screenPos = applyToPoint(transform, schNetLabel.center)

  // Get font size for text
  const fontSize = getSchFontSize(transform, "net_label")

  // Calculate label dimensions based on text
  const textWidth = (schNetLabel.text?.length || 0) * fontSize * 0.7
  // Increase height to better accommodate text
  const screenLabelHeight = fontSize * 1.2
  const screenArrowPointWidth = fontSize * 0.3
  const screenLabelWidth = textWidth + screenArrowPointWidth

  const screenAnchorPosition = {
    x: screenPos.x,
    y: screenPos.y,
  }

  // Get rotation angle based on anchor_side
  let screenTextRotation = {
    left: 0,
    top: -90,
    bottom: 90,
    right: 0,
  }[schNetLabel.anchor_side]

  const textGrowthVec = getUnitVectorFromOutsideToEdge(schNetLabel.anchor_side)
  textGrowthVec.y *= -1 // Invert y direction because anchor_side is pre-transform

  switch (schNetLabel.anchor_side) {
    case "left":
      screenTextRotation = 0
      break
    case "top":
      screenTextRotation = -90
      break
    case "bottom":
      screenTextRotation = 90
      break
    default:
      screenTextRotation = 0
  }

  // Create transform string for rotation
  const transformString = `rotate(${screenTextRotation} ${screenAnchorPosition.x} ${screenAnchorPosition.y})`

  // Calculate the points for the path
  // const screenPoints = [
  //   // Left edge
  //   { x: screenAnchorPosition.x, y: screenAnchorPosition.y },
  //   // Top edge
  //   {
  //     x: screenAnchorPosition.x + screenLabelWidth - screenArrowPoint,
  //     y: screenAnchorPosition.y,
  //   },
  //   // Arrow point
  //   {
  //     x: screenAnchorPosition.x + screenLabelWidth,
  //     y: screenAnchorPosition.y + screenLabelHeight / 2,
  //   },
  //   // Bottom after arrow
  //   {
  //     x: screenAnchorPosition.x + screenLabelWidth - screenArrowPoint,
  //     y: screenAnchorPosition.y + screenLabelHeight,
  //   },
  //   // Bottom left corner
  //   {
  //     x: screenAnchorPosition.x,
  //     y: screenAnchorPosition.y + screenLabelHeight,
  //   },
  // ]
  const screenPoints = [
    // Arrow point
    { x: screenAnchorPosition.x, y: screenAnchorPosition.y },
    // top left corner
    {
      x: screenAnchorPosition.x + textGrowthVec.x * screenArrowPointWidth,
      y:
        screenAnchorPosition.y -
        textGrowthVec.y * screenArrowPointWidth -
        screenLabelHeight / 2,
    },
    // top right corner
    {
      x:
        screenAnchorPosition.x +
        textGrowthVec.x * screenArrowPointWidth +
        screenLabelWidth * textGrowthVec.x,
      y:
        screenAnchorPosition.y -
        textGrowthVec.y * screenArrowPointWidth -
        screenLabelHeight / 2,
    },
    // bottom right corner
    {
      x:
        screenAnchorPosition.x +
        textGrowthVec.x * screenArrowPointWidth +
        screenLabelWidth * textGrowthVec.x,
      y:
        screenAnchorPosition.y +
        textGrowthVec.y * screenArrowPointWidth +
        screenLabelHeight / 2,
    },
    // bottom left corner
    {
      x: screenAnchorPosition.x + textGrowthVec.x * screenArrowPointWidth,
      y:
        screenAnchorPosition.y +
        textGrowthVec.y * screenArrowPointWidth +
        screenLabelHeight / 2,
    },
  ]

  // Create the label path
  const pathD = `
    M ${screenPoints[0]?.x},${screenPoints[0]?.y}
    L ${screenPoints[1]?.x},${screenPoints[1]?.y}
    L ${screenPoints[2]?.x},${screenPoints[2]?.y}
    L ${screenPoints[3]?.x},${screenPoints[3]?.y}
    L ${screenPoints[4]?.x},${screenPoints[4]?.y}
    Z
  `

  // Add the label container path
  svgObjects.push({
    name: "path",
    type: "element",
    attributes: {
      class: "net-label",
      d: pathD,
      fill: "white",
      stroke: colorMap.schematic.label_global,
      "stroke-width": `${getSchStrokeSize(transform)}px`,
    },
    value: "",
    children: [],
  })

  // Calculate text position (centered in label, accounting for arrow)
  const screenTextX = screenAnchorPosition.x + textGrowthVec.x * fontSize * 0.5
  // Adjust text Y position for better vertical centering
  const screenTextY = screenAnchorPosition.y + textGrowthVec.y * fontSize * 0.5

  const textAnchor = {
    left: "start",
    top: "middle",
    bottom: "middle",
    right: "end",
  }[schNetLabel.anchor_side]

  // Add the label text
  svgObjects.push({
    name: "text",
    type: "element",
    attributes: {
      class: "net-label-text",
      x: screenTextX.toString(),
      y: screenTextY.toString(),
      fill: colorMap.schematic.label_global,
      "text-anchor": textAnchor,
      "dominant-baseline": "central",
      "font-family": "sans-serif",
      "font-size": `${fontSize}px`,
      // transform: transformString,
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
