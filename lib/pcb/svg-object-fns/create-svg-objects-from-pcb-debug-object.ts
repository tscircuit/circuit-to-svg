import type { PcbDebugObject } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import { type Matrix, applyToPoint } from "transformation-matrix"

const DEBUG_COLOR = "#ff4d4d"

export interface PcbDebugObjectStyle {
  fontSize: number
  strokeWidth: number
  dashLength: number
  labelGap: number
  pointRadius: number
}

type DebugLabelAnchor = "start" | "middle" | "end"
type RectLabelSide = "top" | "right" | "bottom" | "left"

export interface PcbDebugObjectLabelLayout {
  x: number
  y: number
  fontSize: number
  anchor: DebugLabelAnchor
  side?: RectLabelSide
}

interface Bounds {
  left: number
  top: number
  right: number
  bottom: number
}

interface DebugLabel {
  debugObject: PcbDebugObject
  label: string
  layout: PcbDebugObjectLabelLayout
  rectBounds?: Bounds
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
  layout,
}: {
  label?: string
  layout: PcbDebugObjectLabelLayout
}): SvgObject[] =>
  label
    ? [
        {
          name: "text",
          type: "element",
          value: "",
          attributes: {
            x: layout.x.toString(),
            y: layout.y.toString(),
            fill: DEBUG_COLOR,
            "font-family": "monospace",
            "font-size": layout.fontSize.toString(),
            "font-weight": "600",
            "text-anchor": layout.anchor,
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

const getRectBounds = (
  debugObject: Extract<PcbDebugObject, { shape: "rect" }>,
  transform: Matrix,
): Bounds => {
  const firstCorner = applyToPoint(transform, [
    debugObject.center.x - debugObject.size.width / 2,
    debugObject.center.y - debugObject.size.height / 2,
  ])
  const secondCorner = applyToPoint(transform, [
    debugObject.center.x + debugObject.size.width / 2,
    debugObject.center.y + debugObject.size.height / 2,
  ])

  return {
    left: Math.min(firstCorner[0], secondCorner[0]),
    top: Math.min(firstCorner[1], secondCorner[1]),
    right: Math.max(firstCorner[0], secondCorner[0]),
    bottom: Math.max(firstCorner[1], secondCorner[1]),
  }
}

const createRectLabelLayout = ({
  bounds,
  side,
  fontSize,
  labelGap,
}: {
  bounds: Bounds
  side: RectLabelSide
  fontSize: number
  labelGap: number
}): PcbDebugObjectLabelLayout => {
  switch (side) {
    case "right":
      return {
        x: bounds.right + labelGap,
        y: bounds.top + fontSize,
        fontSize,
        anchor: "start",
        side,
      }
    case "bottom":
      return {
        x: bounds.left,
        y: bounds.bottom + labelGap + fontSize,
        fontSize,
        anchor: "start",
        side,
      }
    case "left":
      return {
        x: bounds.left - labelGap,
        y: bounds.top + fontSize,
        fontSize,
        anchor: "end",
        side,
      }
    default:
      return {
        x: bounds.left,
        y: bounds.top - labelGap,
        fontSize,
        anchor: "start",
        side: "top",
      }
  }
}

const getDefaultLabel = ({
  debugObject,
  transform,
  style,
}: {
  debugObject: PcbDebugObject
  transform: Matrix
  style: PcbDebugObjectStyle
}): DebugLabel | null => {
  if (!debugObject.label) return null

  if (debugObject.shape === "rect") {
    const rectBounds = getRectBounds(debugObject, transform)
    return {
      debugObject,
      label: debugObject.label,
      rectBounds,
      layout: createRectLabelLayout({
        bounds: rectBounds,
        side: "top",
        fontSize: style.fontSize,
        labelGap: style.labelGap,
      }),
    }
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

    return {
      debugObject,
      label: debugObject.label,
      layout: {
        x: (startX + endX) / 2,
        y: (startY + endY) / 2 - style.labelGap,
        fontSize: style.fontSize,
        anchor: "middle",
      },
    }
  }

  const [centerX, centerY] = applyToPoint(transform, [
    debugObject.center.x,
    debugObject.center.y,
  ])
  return {
    debugObject,
    label: debugObject.label,
    layout: {
      x: centerX + style.pointRadius + style.labelGap,
      y: centerY - style.pointRadius,
      fontSize: style.fontSize,
      anchor: "start",
    },
  }
}

const getLabelBounds = ({ label, layout }: DebugLabel): Bounds => {
  const width = Array.from(label).length * layout.fontSize * 0.6
  let left = layout.x

  if (layout.anchor === "middle") left -= width / 2
  if (layout.anchor === "end") left -= width

  return {
    left,
    right: left + width,
    top: layout.y - layout.fontSize,
    bottom: layout.y,
  }
}

const boundsOverlap = (a: Bounds, b: Bounds): boolean =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top

const labelsOverlap = (a: DebugLabel, b: DebugLabel): boolean =>
  boundsOverlap(getLabelBounds(a), getLabelBounds(b))

/**
 * Layout all PCB debug labels together so collisions can be resolved before the
 * individual SVG groups are created.
 */
export function getPcbDebugObjectLabelLayouts({
  debugObjects,
  transform,
  style,
}: {
  debugObjects: PcbDebugObject[]
  transform: Matrix
  style: PcbDebugObjectStyle
}): Map<string, PcbDebugObjectLabelLayout> {
  const labels = debugObjects
    .map((debugObject) => getDefaultLabel({ debugObject, transform, style }))
    .filter((label): label is DebugLabel => label !== null)
  const labelsToShrink = new Set<number>()

  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      if (labelsOverlap(labels[i]!, labels[j]!)) {
        labelsToShrink.add(i)
        labelsToShrink.add(j)
      }
    }
  }

  for (const index of labelsToShrink) {
    const label = labels[index]!
    label.layout = {
      ...label.layout,
      fontSize: label.layout.fontSize * 0.5,
    }
  }

  // Preserve earlier labels where possible and move later colliding rectangle
  // labels to the first completely free outside edge.
  const sideOrder: RectLabelSide[] = ["top", "right", "bottom", "left"]
  for (let i = labels.length - 1; i >= 0; i--) {
    const label = labels[i]!
    if (!label.rectBounds) continue

    const overlapsAnotherLabel = labels.some(
      (other, otherIndex) => otherIndex !== i && labelsOverlap(label, other),
    )
    if (!overlapsAnotherLabel) continue

    const currentSide = label.layout.side ?? "top"
    const currentSideIndex = sideOrder.indexOf(currentSide)
    const alternativeSides = [
      ...sideOrder.slice(currentSideIndex + 1),
      ...sideOrder.slice(0, currentSideIndex),
    ]

    for (const side of alternativeSides) {
      const candidateLayout = createRectLabelLayout({
        bounds: label.rectBounds,
        side,
        fontSize: label.layout.fontSize,
        labelGap: style.labelGap,
      })
      const candidate = { ...label, layout: candidateLayout }
      const candidateOverlaps = labels.some(
        (other, otherIndex) =>
          otherIndex !== i && labelsOverlap(candidate, other),
      )

      if (!candidateOverlaps) {
        label.layout = candidateLayout
        break
      }
    }
  }

  return new Map(
    labels.map(({ debugObject, layout }) => [
      debugObject.pcb_debug_object_id,
      layout,
    ]),
  )
}

export function createSvgObjectsFromPcbDebugObject({
  debugObject,
  transform,
  style,
  labelLayout,
}: {
  debugObject: PcbDebugObject
  transform: Matrix
  style: PcbDebugObjectStyle
  labelLayout?: PcbDebugObjectLabelLayout
}): SvgObject[] {
  const commonAttributes = getCommonAttributes(debugObject)
  const strokeAttributes = {
    fill: "none",
    stroke: DEBUG_COLOR,
    "stroke-width": style.strokeWidth.toString(),
    "stroke-dasharray": `${style.dashLength},${style.dashLength}`,
  }

  if (debugObject.shape === "rect") {
    const bounds = getRectBounds(debugObject, transform)
    const width = bounds.right - bounds.left
    const height = bounds.bottom - bounds.top
    const layout =
      labelLayout ??
      createRectLabelLayout({
        bounds,
        side: "top",
        fontSize: style.fontSize,
        labelGap: style.labelGap,
      })

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
              x: bounds.left.toString(),
              y: bounds.top.toString(),
              width: width.toString(),
              height: height.toString(),
              ...strokeAttributes,
            },
            children: [],
          },
          ...createLabel({
            label: debugObject.label,
            layout,
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
    const layout = labelLayout ?? {
      x: (startX + endX) / 2,
      y: (startY + endY) / 2 - style.labelGap,
      fontSize: style.fontSize,
      anchor: "middle" as const,
    }

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
            layout,
          }),
        ],
      },
    ]
  }

  const [centerX, centerY] = applyToPoint(transform, [
    debugObject.center.x,
    debugObject.center.y,
  ])
  const layout = labelLayout ?? {
    x: centerX + style.pointRadius + style.labelGap,
    y: centerY - style.pointRadius,
    fontSize: style.fontSize,
    anchor: "start" as const,
  }

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
          layout,
        }),
      ],
    },
  ]
}
