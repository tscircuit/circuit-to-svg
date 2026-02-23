import type { AnyCircuitElement, PcbBoard, PcbGroup, Point } from "circuit-json"
import { debugPcb } from "lib/utils/debug"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { createAnchorOffsetIndicators } from "../../utils/create-pcb-component-anchor-offset-indicators"
import { getPointFromElm } from "../../utils/get-point-from-elm"

const GROUP_COLOR_PALETTE = [
  "rgba(100, 200, 255, 0.6)", // light blue
  "rgba(255, 150, 100, 0.6)", // orange
  "rgba(100, 255, 150, 0.6)", // green
  "rgba(200, 100, 255, 0.6)", // purple
  "rgba(255, 220, 100, 0.6)", // yellow
  "rgba(255, 100, 200, 0.6)", // pink
  "rgba(100, 255, 255, 0.6)", // cyan
  "rgba(180, 255, 100, 0.6)", // lime
]
const DEFAULT_STROKE_WIDTH = 0.1 // 0.1mm default stroke width

export function createSvgObjectsFromPcbGroup(
  pcbGroup: PcbGroup,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, circuitJson } = ctx
  const { center, width, height } = pcbGroup

  const svgObjects: SvgObject[] = []

  // Add anchor offset indicators if this group is positioned relative to another group/board
  if (
    ctx.showAnchorOffsets &&
    pcbGroup.position_mode === "relative_to_group_anchor" &&
    circuitJson
  ) {
    const parentAnchorPosition = getParentAnchorPosition(pcbGroup, circuitJson)

    if (parentAnchorPosition) {
      svgObjects.push(
        ...createAnchorOffsetIndicators({
          groupAnchorPosition: parentAnchorPosition,
          componentPosition: pcbGroup.anchor_position ?? pcbGroup.center,
          transform,
          componentWidth: pcbGroup.width,
          componentHeight: pcbGroup.height,
          displayXOffset: pcbGroup.display_offset_x,
          displayYOffset: pcbGroup.display_offset_y,
        }),
      )
    }
  }

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
    stroke: getGroupColor(pcbGroup.pcb_group_id),
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

    svgObjects.push({
      name: "path",
      type: "element",
      value: "",
      children: [],
      attributes: {
        ...baseAttributes,
        d: `${path} Z`,
      },
    })
    return svgObjects
  }

  if (
    !center ||
    typeof center.x !== "number" ||
    typeof center.y !== "number" ||
    typeof width !== "number" ||
    typeof height !== "number"
  ) {
    debugPcb(
      `[pcb_group] Invalid data for "${pcbGroup.pcb_group_id}"${pcbGroup.name ? ` (name: "${pcbGroup.name}")` : ""}: expected center {x: number, y: number}, width: number, height: number, got center=${JSON.stringify(center)}, width=${JSON.stringify(width)}, height=${JSON.stringify(height)}`,
    )
    return svgObjects
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

  svgObjects.push(svgObject)
  return svgObjects
}

function getGroupColor(pcbGroupId: string): string {
  const match = pcbGroupId.match(/(\d+)$/)
  const index = match ? Number.parseInt(match[1]!, 10) : 0
  return GROUP_COLOR_PALETTE[index % GROUP_COLOR_PALETTE.length]!
}

function getParentAnchorPosition(
  group: PcbGroup,
  circuitJson: AnyCircuitElement[],
): { x: number; y: number } | undefined {
  if (group.positioned_relative_to_pcb_group_id) {
    const pcbGroup = circuitJson.find(
      (elm) =>
        elm.type === "pcb_group" &&
        elm.pcb_group_id === group.positioned_relative_to_pcb_group_id,
    ) as PcbGroup | undefined

    const point = getPointFromElm(pcbGroup)
    if (point) return point
  }

  if (group.positioned_relative_to_pcb_board_id) {
    const pcbBoard = circuitJson.find(
      (elm) =>
        elm.type === "pcb_board" &&
        elm.pcb_board_id === group.positioned_relative_to_pcb_board_id,
    ) as PcbBoard | undefined

    const point = getPointFromElm(pcbBoard)
    if (point) return point
  }

  return undefined
}
