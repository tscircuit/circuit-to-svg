import type { PcbDebugObject } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import { applyToPoint, type Matrix } from "transformation-matrix"

const DEBUG_COLOR = "#ff4d4d"

export interface PcbDebugObjectStyle {
  fontSize: number
  strokeWidth: number
  dashLength: number
  labelGap: number
  pointRadius: number
}

const textNode = (value: string): SvgObject => ({
  type: "text",
  value,
  name: "",
  attributes: {},
  children: [],
})

const createLabel = ({
  label,
  x,
  y,
  style,
  anchor = "start",
}: {
  label?: string
  x: number
  y: number
  style: PcbDebugObjectStyle
  anchor?: "start" | "middle"
}): SvgObject[] =>
  label
    ? [
        {
          name: "text",
          type: "element",
          value: "",
          attributes: {
            x: x.toString(),
            y: y.toString(),
            fill: DEBUG_COLOR,
            "font-family": "monospace",
            "font-size": style.fontSize.toString(),
            "font-weight": "600",
            "text-anchor": anchor,
          },
          children: [textNode(label)],
        },
      ]
    : []

const getCommonAttributes = (
  debugObject: PcbDebugObject,
): Record<string, string> => ({
  "data-type": "pcb_debug_object",
  "data-pcb-layer": "overlay",
  "data-pcb-debug-object-id": debugObject.pcb_debug_object_id,
  "data-debug-shape": debugObject.shape,
})

export function createSvgObjectsFromPcbDebugObject({
  debugObject,
  transform,
  style,
  labelStackIndex = 0,
}: {
  debugObject: PcbDebugObject
  transform: Matrix
  style: PcbDebugObjectStyle
  labelStackIndex?: number
}): SvgObject[] {
  const commonAttributes = getCommonAttributes(debugObject)
  const strokeAttributes = {
    fill: "none",
    stroke: DEBUG_COLOR,
    "stroke-width": style.strokeWidth.toString(),
    "stroke-dasharray": `${style.dashLength},${style.dashLength}`,
  }

  if (debugObject.shape === "rect") {
    const firstCorner = applyToPoint(transform, [
      debugObject.center.x - debugObject.size.width / 2,
      debugObject.center.y - debugObject.size.height / 2,
    ])
    const secondCorner = applyToPoint(transform, [
      debugObject.center.x + debugObject.size.width / 2,
      debugObject.center.y + debugObject.size.height / 2,
    ])
    const left = Math.min(firstCorner[0], secondCorner[0])
    const top = Math.min(firstCorner[1], secondCorner[1])
    const width = Math.abs(secondCorner[0] - firstCorner[0])
    const height = Math.abs(secondCorner[1] - firstCorner[1])

    return [
      {
        name: "g",
        type: "element",
        value: "",
        attributes: commonAttributes,
        children: [
          {
            name: "rect",
            type: "element",
            value: "",
            attributes: {
              x: left.toString(),
              y: top.toString(),
              width: width.toString(),
              height: height.toString(),
              ...strokeAttributes,
            },
            children: [],
          },
          ...createLabel({
            label: debugObject.label,
            x: left,
            y:
              top -
              style.labelGap -
              labelStackIndex * (style.fontSize + style.labelGap),
            style,
          }),
        ],
      },
    ]
  }

  if (debugObject.shape === "line") {
    const [startX, startY] = applyToPoint(transform, [
      debugObject.start.x,
      debugObject.start.y,
    ])
    const [endX, endY] = applyToPoint(transform, [
      debugObject.end.x,
      debugObject.end.y,
    ])

    return [
      {
        name: "g",
        type: "element",
        value: "",
        attributes: commonAttributes,
        children: [
          {
            name: "line",
            type: "element",
            value: "",
            attributes: {
              x1: startX.toString(),
              y1: startY.toString(),
              x2: endX.toString(),
              y2: endY.toString(),
              ...strokeAttributes,
            },
            children: [],
          },
          ...createLabel({
            label: debugObject.label,
            x: (startX + endX) / 2,
            y: (startY + endY) / 2 - style.labelGap,
            style,
            anchor: "middle",
          }),
        ],
      },
    ]
  }

  const [centerX, centerY] = applyToPoint(transform, [
    debugObject.center.x,
    debugObject.center.y,
  ])

  return [
    {
      name: "g",
      type: "element",
      value: "",
      attributes: commonAttributes,
      children: [
        {
          name: "circle",
          type: "element",
          value: "",
          attributes: {
            cx: centerX.toString(),
            cy: centerY.toString(),
            r: style.pointRadius.toString(),
            ...strokeAttributes,
          },
          children: [],
        },
        ...createLabel({
          label: debugObject.label,
          x: centerX + style.pointRadius + style.labelGap,
          y: centerY - style.pointRadius,
          style,
        }),
      ],
    },
  ]
}
