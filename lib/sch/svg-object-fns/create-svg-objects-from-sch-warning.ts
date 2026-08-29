import type {
  AnyCircuitElement,
  SchematicComponentOverlapWarning,
  SchematicComponentStylingWarning,
  SchematicElementOutsideSheetWarning,
  SchematicManualEditConflictWarning,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"
import { type Matrix, applyToPoint } from "transformation-matrix"

export type SchematicWarning =
  | SchematicComponentOverlapWarning
  | SchematicComponentStylingWarning
  | SchematicElementOutsideSheetWarning
  | SchematicManualEditConflictWarning

interface ScreenBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

interface CalloutPlacement extends ScreenBounds {
  side: "top" | "bottom" | "left" | "right"
}

const TARGET_PADDING = 6
const CALLOUT_GAP = 12
const VIEWPORT_PADDING = 12
const CALLOUT_PADDING = 10
const LINE_HEIGHT = 17
const MESSAGE_FONT_SIZE = 13
const MAX_CALLOUT_WIDTH = 400
const MIN_CALLOUT_WIDTH = 220

export const isSchematicWarning = (
  element: AnyCircuitElement,
): element is SchematicWarning =>
  element.type === "schematic_component_overlap_warning" ||
  element.type === "schematic_component_styling_warning" ||
  element.type === "schematic_element_outside_sheet_warning" ||
  element.type === "schematic_manual_edit_conflict_warning"

export function createSvgObjectsFromSchematicWarnings({
  circuitJson,
  transform,
  svgWidth,
  svgHeight,
  colorMap,
}: {
  circuitJson: AnyCircuitElement[]
  transform: Matrix
  svgWidth: number
  svgHeight: number
  colorMap: ColorMap
}): SvgObject[] {
  const warningColor = colorMap.schematic.erc_warning
  const occupiedCalloutBounds: ScreenBounds[] = []

  return circuitJson.filter(isSchematicWarning).flatMap((warning) => {
    const targetBounds = getWarningTargetBounds(warning, circuitJson, transform)
    if (!targetBounds) return []

    const availableCalloutWidth = Math.max(1, svgWidth - VIEWPORT_PADDING * 2)
    const messageLines = wrapText(
      warning.message,
      Math.max(
        12,
        Math.floor(
          (Math.min(MAX_CALLOUT_WIDTH, availableCalloutWidth) -
            CALLOUT_PADDING * 2) /
            (MESSAGE_FONT_SIZE * 0.56),
        ),
      ),
    )
    const longestLineLength = Math.max(
      ...messageLines.map((line) => line.length),
    )
    const calloutWidth = Math.min(
      MAX_CALLOUT_WIDTH,
      availableCalloutWidth,
      Math.max(
        Math.min(MIN_CALLOUT_WIDTH, availableCalloutWidth),
        longestLineLength * MESSAGE_FONT_SIZE * 0.56 + CALLOUT_PADDING * 2,
      ),
    )
    const calloutHeight =
      CALLOUT_PADDING * 2 + messageLines.length * LINE_HEIGHT
    const placement = placeCallout({
      targetBounds,
      calloutWidth,
      calloutHeight,
      svgWidth,
      svgHeight,
      occupiedCalloutBounds,
    })
    occupiedCalloutBounds.push(placement)
    const warningId = getWarningId(warning)
    const targetOutline = expandBounds(targetBounds, TARGET_PADDING)
    const leader = getLeaderEndpoints(placement, targetOutline)

    const warningGroup: SvgObject = {
      name: "g",
      type: "element",
      value: "",
      attributes: {
        class: "schematic-warning",
        "data-type": warning.type,
        "data-warning-id": warningId,
        role: "note",
        "aria-label": warning.message,
      },
      children: [
        {
          name: "rect",
          type: "element",
          value: "",
          attributes: {
            x: targetOutline.minX.toString(),
            y: targetOutline.minY.toString(),
            width: (targetOutline.maxX - targetOutline.minX).toString(),
            height: (targetOutline.maxY - targetOutline.minY).toString(),
            rx: "6",
            fill: "none",
            stroke: warningColor,
            "stroke-width": "3",
            "stroke-dasharray": "8,5",
            "data-warning-reference": "target",
          },
          children: [],
        },
        {
          name: "line",
          type: "element",
          value: "",
          attributes: {
            x1: leader.from.x.toString(),
            y1: leader.from.y.toString(),
            x2: leader.to.x.toString(),
            y2: leader.to.y.toString(),
            stroke: warningColor,
            "stroke-width": "2",
            "data-warning-reference": "leader",
          },
          children: [],
        },
        {
          name: "rect",
          type: "element",
          value: "",
          attributes: {
            x: placement.minX.toString(),
            y: placement.minY.toString(),
            width: calloutWidth.toString(),
            height: calloutHeight.toString(),
            rx: "8",
            fill: "rgba(255, 250, 235, 0.97)",
            stroke: warningColor,
            "stroke-width": "2",
            "data-warning-reference": "callout",
          },
          children: [],
        },
        {
          name: "text",
          type: "element",
          value: "",
          attributes: {
            x: (placement.minX + CALLOUT_PADDING).toString(),
            y: (
              placement.minY +
              CALLOUT_PADDING +
              MESSAGE_FONT_SIZE
            ).toString(),
            fill: "#5c4300",
            "font-family": "sans-serif",
            "font-size": MESSAGE_FONT_SIZE.toString(),
          },
          children: messageLines.map((line, index) => ({
            name: "tspan",
            type: "element" as const,
            value: "",
            attributes: {
              x: (placement.minX + CALLOUT_PADDING).toString(),
              dy: index === 0 ? "0" : LINE_HEIGHT.toString(),
            },
            children: [createTextNode(line)],
          })),
        },
      ],
    }

    return [warningGroup]
  })
}

function getWarningTargetBounds(
  warning: SchematicWarning,
  circuitJson: AnyCircuitElement[],
  transform: Matrix,
): ScreenBounds | null {
  const targetIds = getWarningTargetIds(warning)
  const targetBounds = targetIds
    .map((targetId) => getSchematicElementById(circuitJson, targetId))
    .filter((element): element is AnyCircuitElement => Boolean(element))
    .map((element) => getElementScreenBounds(element, transform))
    .filter((bounds): bounds is ScreenBounds => Boolean(bounds))

  if (targetBounds.length === 0) return null

  return targetBounds.reduce(unionBounds)
}

function getWarningTargetIds(warning: SchematicWarning): string[] {
  switch (warning.type) {
    case "schematic_component_overlap_warning":
      return warning.schematic_component_ids
    case "schematic_component_styling_warning":
      return [
        warning.schematic_component_id,
        ...(warning.schematic_port_ids ?? []),
      ]
    case "schematic_manual_edit_conflict_warning":
      return [warning.schematic_component_id]
    case "schematic_element_outside_sheet_warning":
      return [warning.schematic_element_id]
  }
}

function getSchematicElementById(
  circuitJson: AnyCircuitElement[],
  targetId: string,
): AnyCircuitElement | undefined {
  return circuitJson.find((element) => {
    if (!element.type.startsWith("schematic_")) return false
    const idKey = `${element.type}_id`
    return (element as unknown as Record<string, unknown>)[idKey] === targetId
  })
}

function getElementScreenBounds(
  element: AnyCircuitElement,
  transform: Matrix,
): ScreenBounds | null {
  if (element.type === "schematic_component") {
    const topLeft = applyToPoint(transform, {
      x: element.center.x - element.size.width / 2,
      y: element.center.y + element.size.height / 2,
    })
    const bottomRight = applyToPoint(transform, {
      x: element.center.x + element.size.width / 2,
      y: element.center.y - element.size.height / 2,
    })
    return boundsFromPoints([topLeft, bottomRight])
  }

  if (element.type === "schematic_port") {
    const center = applyToPoint(transform, element.center)
    return expandBounds(boundsFromPoints([center]), 4)
  }

  if (element.type === "schematic_net_label") {
    const center = applyToPoint(
      transform,
      element.anchor_position ?? element.center,
    )
    const estimatedWidth = Math.max(28, element.text.length * 8)
    return {
      minX: center.x - estimatedWidth / 2,
      minY: center.y - 10,
      maxX: center.x + estimatedWidth / 2,
      maxY: center.y + 10,
    }
  }

  if (element.type === "schematic_trace") {
    const points = element.edges.flatMap((edge) => [
      applyToPoint(transform, edge.from),
      applyToPoint(transform, edge.to),
    ])
    if (points.length === 0) return null
    return expandBounds(boundsFromPoints(points), 4)
  }

  return null
}

function placeCallout({
  targetBounds,
  calloutWidth,
  calloutHeight,
  svgWidth,
  svgHeight,
  occupiedCalloutBounds,
}: {
  targetBounds: ScreenBounds
  calloutWidth: number
  calloutHeight: number
  svgWidth: number
  svgHeight: number
  occupiedCalloutBounds: ScreenBounds[]
}): CalloutPlacement {
  const targetCenterX = (targetBounds.minX + targetBounds.maxX) / 2
  const targetCenterY = (targetBounds.minY + targetBounds.maxY) / 2
  const topY = targetBounds.minY - TARGET_PADDING - CALLOUT_GAP - calloutHeight
  const bottomY = targetBounds.maxY + TARGET_PADDING + CALLOUT_GAP
  const leftX = targetBounds.minX - TARGET_PADDING - CALLOUT_GAP - calloutWidth
  const rightX = targetBounds.maxX + TARGET_PADDING + CALLOUT_GAP

  const candidates: CalloutPlacement[] = []

  if (topY >= VIEWPORT_PADDING) {
    candidates.push(
      makePlacement({
        x: clamp(
          targetCenterX - calloutWidth / 2,
          VIEWPORT_PADDING,
          svgWidth - VIEWPORT_PADDING - calloutWidth,
        ),
        y: topY,
        width: calloutWidth,
        height: calloutHeight,
        side: "top",
      }),
    )
  }

  if (bottomY + calloutHeight <= svgHeight - VIEWPORT_PADDING) {
    candidates.push(
      makePlacement({
        x: clamp(
          targetCenterX - calloutWidth / 2,
          VIEWPORT_PADDING,
          svgWidth - VIEWPORT_PADDING - calloutWidth,
        ),
        y: bottomY,
        width: calloutWidth,
        height: calloutHeight,
        side: "bottom",
      }),
    )
  }

  if (rightX + calloutWidth <= svgWidth - VIEWPORT_PADDING) {
    candidates.push(
      makePlacement({
        x: rightX,
        y: clamp(
          targetCenterY - calloutHeight / 2,
          VIEWPORT_PADDING,
          svgHeight - VIEWPORT_PADDING - calloutHeight,
        ),
        width: calloutWidth,
        height: calloutHeight,
        side: "right",
      }),
    )
  }

  if (leftX >= VIEWPORT_PADDING) {
    candidates.push(
      makePlacement({
        x: leftX,
        y: clamp(
          targetCenterY - calloutHeight / 2,
          VIEWPORT_PADDING,
          svgHeight - VIEWPORT_PADDING - calloutHeight,
        ),
        width: calloutWidth,
        height: calloutHeight,
        side: "left",
      }),
    )
  }

  const nonOverlappingCandidate = candidates.find((candidate) =>
    occupiedCalloutBounds.every(
      (occupiedBounds) =>
        !boundsOverlap(expandBounds(candidate, 4), occupiedBounds),
    ),
  )

  if (nonOverlappingCandidate) return nonOverlappingCandidate
  if (candidates[0]) return candidates[0]

  return makePlacement({
    x: clamp(
      targetCenterX - calloutWidth / 2,
      VIEWPORT_PADDING,
      svgWidth - VIEWPORT_PADDING - calloutWidth,
    ),
    y: clamp(
      topY,
      VIEWPORT_PADDING,
      svgHeight - VIEWPORT_PADDING - calloutHeight,
    ),
    width: calloutWidth,
    height: calloutHeight,
    side: "top",
  })
}

function getLeaderEndpoints(
  placement: CalloutPlacement,
  targetBounds: ScreenBounds,
): {
  from: { x: number; y: number }
  to: { x: number; y: number }
} {
  const targetCenterX = (targetBounds.minX + targetBounds.maxX) / 2
  const targetCenterY = (targetBounds.minY + targetBounds.maxY) / 2
  const calloutCenterX = (placement.minX + placement.maxX) / 2
  const calloutCenterY = (placement.minY + placement.maxY) / 2

  switch (placement.side) {
    case "top":
      return {
        from: { x: calloutCenterX, y: placement.maxY },
        to: { x: targetCenterX, y: targetBounds.minY },
      }
    case "bottom":
      return {
        from: { x: calloutCenterX, y: placement.minY },
        to: { x: targetCenterX, y: targetBounds.maxY },
      }
    case "left":
      return {
        from: { x: placement.maxX, y: calloutCenterY },
        to: { x: targetBounds.minX, y: targetCenterY },
      }
    case "right":
      return {
        from: { x: placement.minX, y: calloutCenterY },
        to: { x: targetBounds.maxX, y: targetCenterY },
      }
  }
}

function getWarningId(warning: SchematicWarning): string {
  switch (warning.type) {
    case "schematic_component_overlap_warning":
      return warning.schematic_component_overlap_warning_id
    case "schematic_component_styling_warning":
      return warning.schematic_component_styling_warning_id
    case "schematic_element_outside_sheet_warning":
      return warning.schematic_element_outside_sheet_warning_id
    case "schematic_manual_edit_conflict_warning":
      return warning.schematic_manual_edit_conflict_warning_id
  }
}

function wrapText(message: string, maxCharacters: number): string[] {
  const words = message.trim().split(/\s+/)
  const lines: string[] = []
  let currentLine = ""

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word
    if (nextLine.length <= maxCharacters || currentLine.length === 0) {
      currentLine = nextLine
      continue
    }

    lines.push(currentLine)
    currentLine = word
  }

  if (currentLine) lines.push(currentLine)
  return lines.length > 0 ? lines : ["Warning"]
}

function boundsFromPoints(
  points: Array<{ x: number; y: number }>,
): ScreenBounds {
  return {
    minX: Math.min(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxY: Math.max(...points.map((point) => point.y)),
  }
}

function unionBounds(a: ScreenBounds, b: ScreenBounds): ScreenBounds {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  }
}

function expandBounds(bounds: ScreenBounds, amount: number): ScreenBounds {
  return {
    minX: bounds.minX - amount,
    minY: bounds.minY - amount,
    maxX: bounds.maxX + amount,
    maxY: bounds.maxY + amount,
  }
}

function boundsOverlap(a: ScreenBounds, b: ScreenBounds): boolean {
  return !(
    a.maxX <= b.minX ||
    a.minX >= b.maxX ||
    a.maxY <= b.minY ||
    a.minY >= b.maxY
  )
}

function makePlacement({
  x,
  y,
  width,
  height,
  side,
}: {
  x: number
  y: number
  width: number
  height: number
  side: CalloutPlacement["side"]
}): CalloutPlacement {
  return {
    minX: x,
    minY: y,
    maxX: x + width,
    maxY: y + height,
    side,
  }
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return (min + max) / 2
  return Math.min(Math.max(value, min), max)
}

function createTextNode(value: string): SvgObject {
  return {
    name: "",
    type: "text",
    value,
    attributes: {},
    children: [],
  }
}
