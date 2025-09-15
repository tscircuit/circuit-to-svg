import type {
  Point,
  AnyCircuitElement,
  pcb_cutout,
  PcbCutout,
  VisibleLayer,
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
import { createSvgObjectsFromPcbCopperPour } from "./svg-object-fns/create-svg-objects-from-pcb-copper-pour"
import {
  DEFAULT_PCB_COLOR_MAP,
  type PcbColorMap,
  type PcbColorOverrides,
} from "./colors"
import { createSvgObjectsFromPcbComponent } from "./svg-object-fns/create-svg-objects-from-pcb-component"
import { getSoftwareUsedString } from "../utils/get-software-used-string"
import { CIRCUIT_TO_SVG_VERSION } from "../package-version"

const OBJECT_ORDER: AnyCircuitElement["type"][] = [
  "pcb_trace_error",
  "pcb_plated_hole",
  "pcb_fabrication_note_text",
  "pcb_fabrication_note_path",
  "pcb_silkscreen_text",
  "pcb_silkscreen_path",
  "pcb_via",
  "pcb_cutout",
  "pcb_copper_pour",
  // Draw traces before SMT pads so pads appear on top
  "pcb_smtpad",
  "pcb_trace",
  "pcb_component",
  "pcb_board",
]

interface PointObjectNotation {
  x: number
  y: number
}

interface Options {
  colorOverrides?: PcbColorOverrides
  width?: number
  height?: number
  shouldDrawErrors?: boolean
  shouldDrawRatsNest?: boolean
  layer?: "top" | "bottom"
  matchBoardAspectRatio?: boolean
  backgroundColor?: string
  drawPaddingOutsideBoard?: boolean
  includeVersion?: boolean
  renderSolderMask?: boolean
}

export interface PcbContext {
  transform: Matrix
  layer?: "top" | "bottom"
  shouldDrawErrors?: boolean
  drawPaddingOutsideBoard?: boolean
  colorMap: PcbColorMap
  renderSolderMask?: boolean
}

export function convertCircuitJsonToPcbSvg(
  circuitJson: AnyCircuitElement[],
  options?: Options,
): string {
  const drawPaddingOutsideBoard = options?.drawPaddingOutsideBoard ?? true
  const layer = options?.layer
  const colorOverrides = options?.colorOverrides

  const colorMap: PcbColorMap = {
    copper: {
      top: colorOverrides?.copper?.top ?? DEFAULT_PCB_COLOR_MAP.copper.top,
      bottom:
        colorOverrides?.copper?.bottom ?? DEFAULT_PCB_COLOR_MAP.copper.bottom,
    },
    drill: colorOverrides?.drill ?? DEFAULT_PCB_COLOR_MAP.drill,
    silkscreen: {
      top:
        colorOverrides?.silkscreen?.top ?? DEFAULT_PCB_COLOR_MAP.silkscreen.top,
      bottom:
        colorOverrides?.silkscreen?.bottom ??
        DEFAULT_PCB_COLOR_MAP.silkscreen.bottom,
    },
    boardOutline:
      colorOverrides?.boardOutline ?? DEFAULT_PCB_COLOR_MAP.boardOutline,
    soldermask: {
      top:
        colorOverrides?.soldermask?.top ?? DEFAULT_PCB_COLOR_MAP.soldermask.top,
      bottom:
        colorOverrides?.soldermask?.bottom ??
        DEFAULT_PCB_COLOR_MAP.soldermask.bottom,
    },
    debugComponent: {
      fill:
        colorOverrides?.debugComponent?.fill ??
        DEFAULT_PCB_COLOR_MAP.debugComponent.fill,
      stroke:
        colorOverrides?.debugComponent?.stroke ??
        DEFAULT_PCB_COLOR_MAP.debugComponent.stroke,
    },
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  // Track bounds for pcb_board specifically
  let boardMinX = Number.POSITIVE_INFINITY
  let boardMinY = Number.POSITIVE_INFINITY
  let boardMaxX = Number.NEGATIVE_INFINITY
  let boardMaxY = Number.NEGATIVE_INFINITY

  // Process all elements to determine bounds
  for (const circuitJsonElm of circuitJson) {
    if (circuitJsonElm.type === "pcb_board") {
      if (
        circuitJsonElm.outline &&
        Array.isArray(circuitJsonElm.outline) &&
        circuitJsonElm.outline.length >= 3
      ) {
        updateBoundsToIncludeOutline(circuitJsonElm.outline)
        updateBoardBoundsToIncludeOutline(circuitJsonElm.outline)
      } else if (
        "center" in circuitJsonElm &&
        "width" in circuitJsonElm &&
        "height" in circuitJsonElm
      ) {
        updateBounds(
          circuitJsonElm.center,
          circuitJsonElm.width,
          circuitJsonElm.height,
        )
        updateBoardBounds(
          circuitJsonElm.center,
          circuitJsonElm.width,
          circuitJsonElm.height,
        )
      }
    } else if ("x" in circuitJsonElm && "y" in circuitJsonElm) {
      updateBounds({ x: circuitJsonElm.x, y: circuitJsonElm.y }, 0, 0)
    } else if (circuitJsonElm.type === "pcb_smtpad") {
      const pad = circuitJsonElm as any
      if (
        pad.shape === "rect" ||
        pad.shape === "rotated_rect" ||
        pad.shape === "pill"
      ) {
        updateBounds({ x: pad.x, y: pad.y }, pad.width, pad.height)
      } else if (pad.shape === "circle") {
        updateBounds({ x: pad.x, y: pad.y }, pad.radius * 2, pad.radius * 2)
      } else if (pad.shape === "polygon") {
        updateTraceBounds(pad.points)
      }
    } else if ("route" in circuitJsonElm) {
      updateTraceBounds(circuitJsonElm.route)
    } else if (
      circuitJsonElm.type === "pcb_silkscreen_text" ||
      circuitJsonElm.type === "pcb_silkscreen_rect" ||
      circuitJsonElm.type === "pcb_silkscreen_circle" ||
      circuitJsonElm.type === "pcb_silkscreen_line"
    ) {
      updateSilkscreenBounds(circuitJsonElm)
    } else if (circuitJsonElm.type === "pcb_copper_pour") {
      if (circuitJsonElm.shape === "rect") {
        updateBounds(
          circuitJsonElm.center,
          circuitJsonElm.width,
          circuitJsonElm.height,
        )
      } else if (circuitJsonElm.shape === "polygon") {
        updateTraceBounds(circuitJsonElm.points)
      }
    }
  }

  const padding = drawPaddingOutsideBoard ? 1 : 0
  const boundsMinX =
    drawPaddingOutsideBoard || !isFinite(boardMinX) ? minX : boardMinX
  const boundsMinY =
    drawPaddingOutsideBoard || !isFinite(boardMinY) ? minY : boardMinY
  const boundsMaxX =
    drawPaddingOutsideBoard || !isFinite(boardMaxX) ? maxX : boardMaxX
  const boundsMaxY =
    drawPaddingOutsideBoard || !isFinite(boardMaxY) ? maxY : boardMaxY

  const circuitWidth = boundsMaxX - boundsMinX + 2 * padding
  const circuitHeight = boundsMaxY - boundsMinY + 2 * padding

  let svgWidth = options?.width ?? 800
  let svgHeight = options?.height ?? 600

  if (options?.matchBoardAspectRatio) {
    const boardWidth = boardMaxX - boardMinX
    const boardHeight = boardMaxY - boardMinY
    if (boardWidth > 0 && boardHeight > 0) {
      const aspect = boardWidth / boardHeight
      if (options?.width && !options?.height) {
        svgHeight = options.width / aspect
      } else if (options?.height && !options?.width) {
        svgWidth = options.height * aspect
      } else {
        svgHeight = svgWidth / aspect
      }
    }
  }
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
      offsetX - boundsMinX * scaleFactor + padding * scaleFactor,
      svgHeight - offsetY + boundsMinY * scaleFactor - padding * scaleFactor,
    ),
    scale(scaleFactor, -scaleFactor), // Flip in y-direction
  )

  const ctx: PcbContext = {
    transform,
    layer,
    shouldDrawErrors: options?.shouldDrawErrors,
    drawPaddingOutsideBoard,
    colorMap,
    renderSolderMask: options?.renderSolderMask,
  }

  function getLayer(elm: AnyCircuitElement): VisibleLayer | undefined {
    if (elm.type === "pcb_smtpad") {
      return elm.layer === "top" || elm.layer === "bottom"
        ? elm.layer
        : undefined
    }
    if (elm.type === "pcb_trace") {
      for (const seg of elm.route ?? []) {
        const candidate =
          ("layer" in seg && seg.layer) ||
          ("from_layer" in seg && seg.from_layer) ||
          ("to_layer" in seg && seg.to_layer) ||
          undefined

        if (candidate === "top" || candidate === "bottom") {
          return candidate
        }
      }
    }
    return undefined
  }

  function isCopper(elm: AnyCircuitElement) {
    return elm.type === "pcb_trace" || elm.type === "pcb_smtpad"
  }

  let svgObjects = circuitJson
    .sort((a, b) => {
      const layerA = getLayer(a)
      const layerB = getLayer(b)

      if (isCopper(a) && isCopper(b) && layerA !== layerB) {
        if (layerA === "top") return 1
        if (layerB === "top") return -1
        if (layerA === "bottom") return -1
        if (layerB === "bottom") return 1
      }

      return (
        (OBJECT_ORDER.indexOf(b.type) ?? 9999) -
        (OBJECT_ORDER.indexOf(a.type) ?? 9999)
      )
    })
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

  const children: SvgObject[] = [
    {
      name: "style",
      type: "element",
      value: "",
      attributes: {},
      children: [
        {
          type: "text",
          value: "",
          name: "",
          attributes: {},
          children: [],
        },
      ],
    },
    {
      name: "rect",
      type: "element",
      value: "",
      attributes: {
        class: "boundary",
        x: "0",
        y: "0",
        fill: options?.backgroundColor ?? "#000",
        width: svgWidth.toString(),
        height: svgHeight.toString(),
      },
      children: [],
    },
  ]

  if (drawPaddingOutsideBoard) {
    children.push(
      createSvgObjectFromPcbBoundary(transform, minX, minY, maxX, maxY),
    )
  }

  children.push(...svgObjects)

  const softwareUsedString = getSoftwareUsedString(circuitJson)
  const version = CIRCUIT_TO_SVG_VERSION

  const svgObject: SvgObject = {
    name: "svg",
    type: "element",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      width: svgWidth.toString(),
      height: svgHeight.toString(),
      ...(softwareUsedString && {
        "data-software-used-string": softwareUsedString,
      }),
      ...(options?.includeVersion && {
        "data-circuit-to-svg-version": version,
      }),
    },
    value: "",
    children: children.filter((child): child is SvgObject => child !== null),
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

  function updateBoardBounds(center: any, width: any, height: any) {
    const halfWidth = width / 2
    const halfHeight = height / 2
    boardMinX = Math.min(boardMinX, center.x - halfWidth)
    boardMinY = Math.min(boardMinY, center.y - halfHeight)
    boardMaxX = Math.max(boardMaxX, center.x + halfWidth)
    boardMaxY = Math.max(boardMaxY, center.y + halfHeight)
  }

  function updateBoundsToIncludeOutline(outline: Point[]) {
    for (const point of outline) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }
  }

  function updateBoardBoundsToIncludeOutline(outline: Point[]) {
    for (const point of outline) {
      boardMinX = Math.min(boardMinX, point.x)
      boardMinY = Math.min(boardMinY, point.y)
      boardMaxX = Math.max(boardMaxX, point.x)
      boardMaxY = Math.max(boardMaxY, point.y)
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
  switch (elm.type) {
    case "pcb_trace_error":
      return createSvgObjectsFromPcbTraceError(elm, circuitJson, ctx).filter(
        Boolean,
      )
    case "pcb_component":
      return createSvgObjectsFromPcbComponent(elm, ctx).filter(Boolean)
    case "pcb_trace":
      return createSvgObjectsFromPcbTrace(elm, ctx)
    case "pcb_copper_pour":
      return createSvgObjectsFromPcbCopperPour(elm as any, ctx)
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
      return ctx.drawPaddingOutsideBoard
        ? createSvgObjectsFromPcbBoard(elm, ctx)
        : []
    case "pcb_via":
      return createSvgObjectsFromPcbVia(elm, ctx)
    case "pcb_cutout":
      return createSvgObjectsFromPcbCutout(elm as any, ctx)
    default:
      return []
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
