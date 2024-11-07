import type { AnyCircuitElement, SchematicNetLabel } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { colorMap } from "lib/utils/colors"
import { getSchFontSize } from "lib/utils/get-sch-font-size"
import { getSchStrokeSize } from "lib/utils/get-sch-stroke-size"
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
  const padding = fontSize * 0.5
  // Increase height to better accommodate text
  const screenLabelHeight = fontSize * 1.2
  const screenArrowPoint = fontSize * 0.3
  const screenLabelWidth = textWidth + padding * 2 + screenArrowPoint

  // Get rotation angle based on anchor_side
  let rotation = 0
  let baseX = screenPos.x
  let baseY = screenPos.y

  switch (schNetLabel.anchor_side) {
    case "left":
      rotation = 0
      break
    case "right":
      rotation = 180
      baseX -= screenLabelWidth
      break
    case "top":
      rotation = -90
      baseX -= screenLabelHeight / 2
      baseY += screenLabelWidth / 2
      break
    case "bottom":
      rotation = 90
      baseX -= screenLabelHeight / 2
      baseY -= screenLabelWidth / 2
      break
    default:
      rotation = 0
  }

  // Create transform string for rotation
  const transformString = `rotate(${rotation} ${screenPos.x} ${screenPos.y})`

  // Calculate the points for the path
  const points = [
    { x: baseX, y: baseY }, // Left edge
    { x: baseX + screenLabelWidth - screenArrowPoint, y: baseY }, // Top edge
    { x: baseX + screenLabelWidth, y: baseY + screenLabelHeight / 2 }, // Arrow point
    {
      x: baseX + screenLabelWidth - screenArrowPoint,
      y: baseY + screenLabelHeight,
    }, // Bottom after arrow
    { x: baseX, y: baseY + screenLabelHeight }, // Bottom left corner
  ]

  // Create the label path
  const pathD = `
    M ${points[0]?.x},${points[0]?.y}
    L ${points[1]?.x},${points[1]?.y}
    L ${points[2]?.x},${points[2]?.y}
    L ${points[3]?.x},${points[3]?.y}
    L ${points[4]?.x},${points[4]?.y}
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
      transform: transformString,
    },
    value: "",
    children: [],
  })

  // Calculate text position (centered in label, accounting for arrow)
  const screenTextX = baseX + (screenLabelWidth - screenArrowPoint) / 2
  // Adjust text Y position for better vertical centering
  const screenTextY = baseY + screenLabelHeight / 2 + fontSize * 0.05

  // Add the label text
  svgObjects.push({
    name: "text",
    type: "element",
    attributes: {
      class: "net-label-text",
      x: screenTextX.toString(),
      y: screenTextY.toString(),
      fill: colorMap.schematic.label_global,
      "text-anchor": "middle",
      "dominant-baseline": "central", // Changed to central for better vertical alignment
      "font-family": "sans-serif",
      "font-size": `${fontSize}px`,
      transform: transformString,
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
