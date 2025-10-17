import type { PcbGroup, Point } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

const DEFAULT_GROUP_COLOR = "rgba(100, 200, 255, 0.6)"
const DEFAULT_STROKE_WIDTH = 0.1 // 0.1mm default stroke width

export function createSvgObjectsFromPcbGroup(
  pcbGroup: PcbGroup,
  ctx: PcbContext,
): SvgObject[] {
  const { transform } = ctx
  const { center, width, height } = pcbGroup

  const outline = Array.isArray((pcbGroup as { outline?: Point[] }).outline)
    ? (pcbGroup as { outline?: Point[] }).outline
    : undefined

  const transformedStrokeWidth = DEFAULT_STROKE_WIDTH * Math.abs(transform.a)

  // Calculate dash length based on stroke width for consistent appearance
  const dashLength = 0.3 * Math.abs(transform.a) // 0.3mm dash
  const gapLength = 0.15 * Math.abs(transform.a) // 0.15mm gap

  const baseAttributes: Record<string, string> = {
    class: "pcb-group",
    fill: "none",
    stroke: DEFAULT_GROUP_COLOR,
    "stroke-width": transformedStrokeWidth.toString(),
    "stroke-dasharray": `${dashLength} ${gapLength}`,
    "data-type": "pcb_group",
    "data-pcb-group-id": pcbGroup.pcb_group_id,
    "data-pcb-layer": "overlay",
  }

  if (pcbGroup.name) {
    baseAttributes["data-group-name"] = pcbGroup.name
  }

  if (
    outline &&
    outline.length >= 3 &&
    outline.every(
      (point) =>
        point && typeof point.x === "number" && typeof point.y === "number",
    )
  ) {
    const path = outline
      .map((point: Point, index: number) => {
        const [x, y] = applyToPoint(transform, [point.x, point.y])
        return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
      })
      .join(" ")

    return [
      {
        name: "path",
        type: "element",
        value: "",
        children: [],
        attributes: {
          ...baseAttributes,
          d: `${path} Z`,
        },
      },
    ]
  }

  if (
    !center ||
    typeof center.x !== "number" ||
    typeof center.y !== "number" ||
    typeof width !== "number" ||
    typeof height !== "number"
  ) {
    console.error("Invalid pcb_group data", { center, width, height })
    return []
  }

  const halfWidth = width / 2
  const halfHeight = height / 2

  const [topLeftX, topLeftY] = applyToPoint(transform, [
    center.x - halfWidth,
    center.y + halfHeight,
  ])
  const [bottomRightX, bottomRightY] = applyToPoint(transform, [
    center.x + halfWidth,
    center.y - halfHeight,
  ])

  const rectX = Math.min(topLeftX, bottomRightX)
  const rectY = Math.min(topLeftY, bottomRightY)
  const rectWidth = Math.abs(bottomRightX - topLeftX)
  const rectHeight = Math.abs(bottomRightY - topLeftY)

  const svgObject: SvgObject = {
    name: "rect",
    type: "element",
    value: "",
    attributes: {
      ...baseAttributes,
      x: rectX.toString(),
      y: rectY.toString(),
      width: rectWidth.toString(),
      height: rectHeight.toString(),
    },
    children: [],
  }

  return [svgObject]
}
