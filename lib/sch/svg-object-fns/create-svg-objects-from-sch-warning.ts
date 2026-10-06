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
import {
  getSchematicDiagnosticCalloutLayout,
  type ScreenBounds,
} from "./schematic-diagnostic-callout-layout"

export type SchematicWarning =
  | SchematicComponentOverlapWarning
  | SchematicComponentStylingWarning
  | SchematicElementOutsideSheetWarning
  | SchematicManualEditConflictWarning

const CALLOUT_PADDING = 6
const LINE_HEIGHT = 14
const MESSAGE_FONT_SIZE = 11

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

    const {
      messageLines,
      calloutWidth,
      calloutHeight,
      placement,
      targetOutline,
      leader,
    } = getSchematicDiagnosticCalloutLayout({
      message: warning.message,
      targetBounds,
      svgWidth,
      svgHeight,
      occupiedCalloutBounds,
    })
    const warningId = getWarningId(warning)

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
            "stroke-width": "1",
            "stroke-dasharray": "4,3",
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
            "stroke-width": "1",
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
            fill: "rgba(255, 250, 235, 0.97)",
            stroke: warningColor,
            "stroke-width": "1",
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

function createTextNode(value: string): SvgObject {
  return {
    name: "",
    type: "text",
    value,
    attributes: {},
    children: [],
  }
}
