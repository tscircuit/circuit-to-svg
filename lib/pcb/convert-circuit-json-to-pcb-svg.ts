import type {
  Point,
  AnyCircuitElement,
  pcb_cutout,
  PcbCutout,
} from "circuit-json"
import { type INode as SvgObject, stringify } from "svgson"
import {
  type Matrix,
  applyToPoint,
  compose,
  scale,
  translate,
} from "transformation-matrix"
import { createSvgObjectsFromPcbTraceError } from "./svg-object-fns/create-svg-objects-from-pcb-trace-error"
import { createSvgObjectsFromPcbFabricationNotePath } from "./svg-object-fns/create-svg-objects-from-pcb-fabrication-note-path"
import { createSvgObjectsFromPcbFabricationNoteText } from "./svg-object-fns/create-svg-objects-from-pcb-fabrication-note-text"
import { createSvgObjectsFromPcbPlatedHole } from "./svg-object-fns/create-svg-objects-from-pcb-plated-hole"
import { createSvgObjectsFromPcbSilkscreenPath } from "./svg-object-fns/create-svg-objects-from-pcb-silkscreen-path"
import { createSvgObjectsFromPcbSilkscreenText } from "./svg-object-fns/create-svg-objects-from-pcb-silkscreen-text"
import { createSvgObjectsFromPcbSilkscreenRect } from "./svg-object-fns/create-svg-objects-from-pcb-silkscreen-rect"
import { createSvgObjectsFromPcbSilkscreenCircle } from "./svg-object-fns/create-svg-objects-from-pcb-silkscreen-circle"
import { createSvgObjectsFromPcbSilkscreenLine } from "./svg-object-fns/create-svg-objects-from-pcb-silkscreen-line"
import { createSvgObjectsFromPcbTrace } from "./svg-object-fns/create-svg-objects-from-pcb-trace"
import { createSvgObjectsFromSmtPad } from "./svg-object-fns/create-svg-objects-from-smt-pads"
import { createSvgObjectsFromPcbBoard } from "./svg-object-fns/create-svg-objects-from-pcb-board"
import { createSvgObjectsFromPcbVia } from "./svg-object-fns/create-svg-objects-from-pcb-via"
import { createSvgObjectsFromPcbHole } from "./svg-object-fns/create-svg-objects-from-pcb-hole"
import { createSvgObjectsForRatsNest } from "./svg-object-fns/create-svg-objects-from-pcb-rats-nests"
import { createSvgObjectsFromPcbCutout } from "./svg-object-fns/create-svg-objects-from-pcb-cutout"

const OBJECT_ORDER: AnyCircuitElement["type"][] = [
  "pcb_trace_error",
  "pcb_plated_hole",
  "pcb_fabrication_note_text",
  "pcb_fabrication_note_path",
  "pcb_silkscreen_text",
  "pcb_silkscreen_path",
  "pcb_via",
  "pcb_cutout",
  "pcb_trace",
  "pcb_smtpad",
  "pcb_component",
  "pcb_board",
]

interface PointObjectNotation {
  x: number
  y: number
}

interface Options {
  width?: number
  height?: number
  shouldDrawErrors?: boolean
  shouldDrawRatsNest?: boolean
  layer?: "top" | "bottom"
}

export interface PcbContext {
  transform: Matrix
  layer?: "top" | "bottom"
  shouldDrawErrors?: boolean
}

export function convertCircuitJsonToPcbSvg(
  circuitJson: AnyCircuitElement[],
  options?: Options,
): string {
  const layer = options?.layer

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  // Process all elements to determine bounds
  for (const circuitJsonElm of circuitJson) {
    if (circuitJsonElm.type === "pcb_board") {
      if (
        circuitJsonElm.outline &&
        Array.isArray(circuitJsonElm.outline) &&
        circuitJsonElm.outline.length >= 3
      )
        updateBoundsToIncludeOutline(circuitJsonElm.outline)
      else if (
        "center" in circuitJsonElm &&
        "width" in circuitJsonElm &&
        "height" in circuitJsonElm
      )
        updateBounds(
          circuitJsonElm.center,
          circuitJsonElm.width,
          circuitJsonElm.height,
        )
    } else if ("x" in circuitJsonElm && "y" in circuitJsonElm) {
      updateBounds({ x: circuitJsonElm.x, y: circuitJsonElm.y }, 0, 0)
    } else if ("route" in circuitJsonElm) {
      updateTraceBounds(circuitJsonElm.route)
    } else if (
      circuitJsonElm.type === "pcb_silkscreen_text" ||
      circuitJsonElm.type === "pcb_silkscreen_rect" ||
      circuitJsonElm.type === "pcb_silkscreen_circle" ||
      circuitJsonElm.type === "pcb_silkscreen_line"
    ) {
      updateSilkscreenBounds(circuitJsonElm)
    }
  }

  const padding = 1 // Reduced padding for tighter boundary
  const circuitWidth = maxX - minX + 2 * padding
  const circuitHeight = maxY - minY + 2 * padding

  const svgWidth = options?.width ?? 800
  const svgHeight = options?.height ?? 600
  const paths: PointObjectNotation[][] = []
  for (const circuitJsonElm of circuitJson) {
    if ("route" in circuitJsonElm && circuitJsonElm.route !== undefined) {
      paths.push(circuitJsonElm.route as PointObjectNotation[])
    }
  }

  // Calculate scale factor to fit the circuit within the SVG, maintaining aspect ratio
  const scaleX = svgWidth / circuitWidth
  const scaleY = svgHeight / circuitHeight
  const scaleFactor = Math.min(scaleX, scaleY)

  // Calculate centering offsets
  const offsetX = (svgWidth - circuitWidth * scaleFactor) / 2
  const offsetY = (svgHeight - circuitHeight * scaleFactor) / 2

  const transform = compose(
    translate(
      offsetX - minX * scaleFactor + padding * scaleFactor,
      svgHeight - offsetY + minY * scaleFactor - padding * scaleFactor,
    ),
    scale(scaleFactor, -scaleFactor), // Flip in y-direction
  )

  const ctx: PcbContext = {
    transform,
    layer,
    shouldDrawErrors: options?.shouldDrawErrors,
  }

  let svgObjects = circuitJson
    .sort(
      (a, b) =>
        (OBJECT_ORDER.indexOf(b.type) ?? 9999) -
        (OBJECT_ORDER.indexOf(a.type) ?? 9999),
    )
    .flatMap((elm) => createSvgObjects({ elm, circuitJson, ctx }))

  let strokeWidth = String(0.05 * scaleFactor)

  for (const element of circuitJson) {
    if ("stroke_width" in element) {
      strokeWidth = String(scaleFactor * element.stroke_width)
      break
    }
  }

  if (options?.shouldDrawRatsNest) {
    const ratsNestObjects = createSvgObjectsForRatsNest(circuitJson, ctx)
    svgObjects = svgObjects.concat(ratsNestObjects)
  }

  const svgObject: SvgObject = {
    name: "svg",
    type: "element",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      width: svgWidth.toString(),
      height: svgHeight.toString(),
    },
    value: "",
    children: [
      {
        name: "style",
        type: "element",
        children: [
          {
            type: "text",
            value: "",
          },
        ],
      },
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "boundary",
          x: "0",
          y: "0",
          fill: "#000",
          width: svgWidth.toString(),
          height: svgHeight.toString(),
        },
      },
      createSvgObjectFromPcbBoundary(transform, minX, minY, maxX, maxY),
      ...svgObjects,
    ].filter((child): child is SvgObject => child !== null),
  }

  try {
    return stringify(svgObject as SvgObject)
  } catch (error) {
    console.error("Error stringifying SVG object:", error)
    throw error
  }

  function updateBounds(center: any, width: any, height: any) {
    const halfWidth = width / 2
    const halfHeight = height / 2
    minX = Math.min(minX, center.x - halfWidth)
    minY = Math.min(minY, center.y - halfHeight)
    maxX = Math.max(maxX, center.x + halfWidth)
    maxY = Math.max(maxY, center.y + halfHeight)
  }

  function updateBoundsToIncludeOutline(outline: Point[]) {
    for (const point of outline) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }
  }

  function updateTraceBounds(route: any[]) {
    for (const point of route) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }
  }

  function updateSilkscreenBounds(item: AnyCircuitElement) {
    if (item.type === "pcb_silkscreen_text") {
      updateBounds(item.anchor_position, 0, 0)
    } else if (item.type === "pcb_silkscreen_path") {
      updateTraceBounds(item.route)
    } else if (item.type === "pcb_silkscreen_rect") {
      updateBounds(item.center, item.width, item.height)
    } else if (item.type === "pcb_silkscreen_circle") {
      updateBounds(item.center, item.radius * 2, item.radius * 2)
    } else if (item.type === "pcb_silkscreen_line") {
      updateBounds({ x: item.x1, y: item.y1 }, 0, 0)
      updateBounds({ x: item.x2, y: item.y2 }, 0, 0)
    } else if (item.type === "pcb_cutout") {
      const cutout = item as PcbCutout
      if (cutout.shape === "rect") {
        updateBounds(cutout.center, cutout.width, cutout.height)
      } else if (cutout.shape === "circle") {
        updateBounds(cutout.center, cutout.radius * 2, cutout.radius * 2)
      } else if (cutout.shape === "polygon") {
        updateTraceBounds(cutout.points)
      }
    }
  }
}

interface CreateSvgObjectsParams {
  elm: AnyCircuitElement
  circuitJson: AnyCircuitElement[]
  ctx: PcbContext
}

function createSvgObjects({
  elm,
  circuitJson,
  ctx,
}: CreateSvgObjectsParams): SvgObject[] {
  const { transform, layer: layerFilter, shouldDrawErrors } = ctx
  switch (elm.type) {
    case "pcb_trace_error":
      return createSvgObjectsFromPcbTraceError(elm, circuitJson, ctx).filter(
        Boolean,
      )
    case "pcb_component":
      return [createSvgObjectsFromPcbComponent(elm, ctx)].filter(Boolean)
    case "pcb_trace":
      return createSvgObjectsFromPcbTrace(elm, ctx)
    case "pcb_plated_hole":
      return createSvgObjectsFromPcbPlatedHole(elm, ctx).filter(Boolean)
    case "pcb_hole":
      return createSvgObjectsFromPcbHole(elm, ctx)
    case "pcb_smtpad":
      return createSvgObjectsFromSmtPad(elm, ctx)
    case "pcb_silkscreen_text":
      return createSvgObjectsFromPcbSilkscreenText(elm, ctx)
    case "pcb_silkscreen_rect":
      return createSvgObjectsFromPcbSilkscreenRect(elm, ctx)
    case "pcb_silkscreen_circle":
      return createSvgObjectsFromPcbSilkscreenCircle(elm, ctx)
    case "pcb_silkscreen_line":
      return createSvgObjectsFromPcbSilkscreenLine(elm, ctx)

    case "pcb_fabrication_note_path":
      return createSvgObjectsFromPcbFabricationNotePath(elm, ctx)
    case "pcb_fabrication_note_text":
      return createSvgObjectsFromPcbFabricationNoteText(elm, ctx)
    case "pcb_silkscreen_path":
      return createSvgObjectsFromPcbSilkscreenPath(elm, ctx)
    case "pcb_board":
      return createSvgObjectsFromPcbBoard(elm, ctx)
    case "pcb_via":
      return createSvgObjectsFromPcbVia(elm, ctx)
    case "pcb_cutout":
      return createSvgObjectsFromPcbCutout(elm as any, ctx)
    default:
      return []
  }
}

function createSvgObjectsFromPcbComponent(
  component: any,
  ctx: PcbContext,
): any {
  const { transform } = ctx
  const { center, width, height, rotation = 0 } = component
  const [x, y] = applyToPoint(transform, [center.x, center.y])
  const scaledWidth = width * Math.abs(transform.a)
  const scaledHeight = height * Math.abs(transform.d)
  const transformStr = `translate(${x}, ${y}) rotate(${-rotation}) scale(1, -1)`

  return {
    name: "g",
    type: "element",
    attributes: { transform: transformStr },
    children: [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-component",
          x: (-scaledWidth / 2).toString(),
          y: (-scaledHeight / 2).toString(),
          width: scaledWidth.toString(),
          height: scaledHeight.toString(),
        },
      },
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-component-outline",
          x: (-scaledWidth / 2).toString(),
          y: (-scaledHeight / 2).toString(),
          width: scaledWidth.toString(),
          height: scaledHeight.toString(),
        },
      },
    ],
  }
}

function createSvgObjectFromPcbBoundary(
  transform: any,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): SvgObject {
  const [x1, y1] = applyToPoint(transform, [minX, minY])
  const [x2, y2] = applyToPoint(transform, [maxX, maxY])
  const width = Math.abs(x2 - x1)
  const height = Math.abs(y2 - y1)
  const x = Math.min(x1, x2)
  const y = Math.min(y1, y2)
  return {
    name: "rect",
    type: "element",
    value: "",
    children: [],
    attributes: {
      class: "pcb-boundary",
      fill: "none",
      stroke: "#fff",
      "stroke-width": "0.3",
      x: x.toString(),
      y: y.toString(),
      width: width.toString(),
      height: height.toString(),
    },
  }
}

/**
 * @deprecated use `convertCircuitJsonToPcbSvg` instead
 */
export const circuitJsonToPcbSvg = convertCircuitJsonToPcbSvg
