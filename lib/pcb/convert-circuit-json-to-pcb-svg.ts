import type {
  Point,
  AnyCircuitElement,
  PcbCutout,
  PcbPanel,
} from "circuit-json"
import { distance } from "circuit-json"
import { type INode as SvgObject, stringify } from "svgson"
import {
  type Matrix,
  applyToPoint,
  compose,
  scale,
  translate,
} from "transformation-matrix"
import { createSvgObjectsFromPcbTraceError } from "./svg-object-fns/create-svg-objects-from-pcb-trace-error"
import { createSvgObjectsFromPcbFootprintOverlapError } from "./svg-object-fns/create-svg-objects-from-pcb-footprint-overlap-error"
import { createSvgObjectsFromPcbFabricationNotePath } from "./svg-object-fns/create-svg-objects-from-pcb-fabrication-note-path"
import { createSvgObjectsFromPcbFabricationNoteText } from "./svg-object-fns/create-svg-objects-from-pcb-fabrication-note-text"
import { createSvgObjectsFromPcbFabricationNoteRect } from "./svg-object-fns/create-svg-objects-from-pcb-fabrication-note-rect"
import { createSvgObjectsFromPcbFabricationNoteDimension } from "./svg-object-fns/create-svg-objects-from-pcb-fabrication-note-dimension"
import { createSvgObjectsFromPcbNoteDimension } from "./svg-object-fns/create-svg-objects-from-pcb-note-dimension"
import { createSvgObjectsFromPcbNoteText } from "./svg-object-fns/create-svg-objects-from-pcb-note-text"
import { createSvgObjectsFromPcbNoteRect } from "./svg-object-fns/create-svg-objects-from-pcb-note-rect"
import { createSvgObjectsFromPcbNotePath } from "./svg-object-fns/create-svg-objects-from-pcb-note-path"
import { createSvgObjectsFromPcbNoteLine } from "./svg-object-fns/create-svg-objects-from-pcb-note-line"
import { createSvgObjectsFromPcbPlatedHole } from "./svg-object-fns/create-svg-objects-from-pcb-plated-hole"
import { createSvgObjectsFromPcbSilkscreenPath } from "./svg-object-fns/create-svg-objects-from-pcb-silkscreen-path"
import { createSvgObjectsFromPcbSilkscreenText } from "./svg-object-fns/create-svg-objects-from-pcb-silkscreen-text"
import { createSvgObjectsFromPcbSilkscreenRect } from "./svg-object-fns/create-svg-objects-from-pcb-silkscreen-rect"
import { createSvgObjectsFromPcbSilkscreenCircle } from "./svg-object-fns/create-svg-objects-from-pcb-silkscreen-circle"
import { createSvgObjectsFromPcbSilkscreenLine } from "./svg-object-fns/create-svg-objects-from-pcb-silkscreen-line"
import { createSvgObjectsFromPcbCourtyardRect } from "./svg-object-fns/create-svg-objects-from-pcb-courtyard-rect"
import { createSvgObjectsFromPcbTrace } from "./svg-object-fns/create-svg-objects-from-pcb-trace"
import { createSvgObjectsFromSmtPad } from "./svg-object-fns/create-svg-objects-from-smt-pads"
import { createSvgObjectsFromPcbBoard } from "./svg-object-fns/create-svg-objects-from-pcb-board"
import { createSvgObjectsFromPcbPanel } from "./svg-object-fns/create-svg-objects-from-pcb-panel"
import { createSvgObjectsFromPcbVia } from "./svg-object-fns/create-svg-objects-from-pcb-via"
import { createSvgObjectsFromPcbHole } from "./svg-object-fns/create-svg-objects-from-pcb-hole"
import { createSvgObjectsForRatsNest } from "./svg-object-fns/create-svg-objects-from-pcb-rats-nests"
import { createSvgObjectsFromPcbCutout } from "./svg-object-fns/create-svg-objects-from-pcb-cutout"
import { createSvgObjectsFromPcbCopperPour } from "./svg-object-fns/create-svg-objects-from-pcb-copper-pour"
import {
  createSvgObjectsForPcbGrid,
  type PcbGridOptions,
} from "./svg-object-fns/create-svg-objects-for-pcb-grid"
import {
  DEFAULT_PCB_COLOR_MAP,
  type CopperColorMap,
  type PcbColorMap,
  type PcbColorOverrides,
} from "./colors"
import { createSvgObjectsFromPcbComponent } from "./svg-object-fns/create-svg-objects-from-pcb-component"
import { createSvgObjectsFromPcbGroup } from "./svg-object-fns/create-svg-objects-from-pcb-group"
import { getSoftwareUsedString } from "../utils/get-software-used-string"
import { CIRCUIT_TO_SVG_VERSION } from "../package-version"
import { sortSvgObjectsByPcbLayer } from "./sort-svg-objects-by-pcb-layer"
import { createErrorTextOverlay } from "../utils/create-error-text-overlay"

interface PointObjectNotation {
  x: number
  y: number
}

interface Options {
  colorOverrides?: PcbColorOverrides
  width?: number
  height?: number
  shouldDrawErrors?: boolean
  showErrorsInTextOverlay?: boolean
  shouldDrawRatsNest?: boolean
  showCourtyards?: boolean
  showPcbGroups?: boolean
  layer?: "top" | "bottom"
  matchBoardAspectRatio?: boolean
  backgroundColor?: string
  drawPaddingOutsideBoard?: boolean
  includeVersion?: boolean
  showSolderMask?: boolean
  grid?: PcbGridOptions
}

export interface PcbContext {
  transform: Matrix
  layer?: "top" | "bottom"
  shouldDrawErrors?: boolean
  showCourtyards?: boolean
  showPcbGroups?: boolean
  drawPaddingOutsideBoard?: boolean
  colorMap: PcbColorMap
  showSolderMask?: boolean
}

export function convertCircuitJsonToPcbSvg(
  circuitJson: AnyCircuitElement[],
  options?: Options,
): string {
  const drawPaddingOutsideBoard = options?.drawPaddingOutsideBoard ?? true
  const layer = options?.layer
  const colorOverrides = options?.colorOverrides

  const copperColors: CopperColorMap = {
    ...DEFAULT_PCB_COLOR_MAP.copper,
  }

  if (colorOverrides?.copper) {
    for (const [layerName, color] of Object.entries(colorOverrides.copper)) {
      if (color !== undefined) {
        copperColors[layerName] = color
      }
    }
  }

  const colorMap: PcbColorMap = {
    copper: copperColors,
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
    courtyard: colorOverrides?.courtyard ?? DEFAULT_PCB_COLOR_MAP.courtyard,
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
  let hasBounds = false

  // Track bounds for pcb_board specifically
  let boardMinX = Number.POSITIVE_INFINITY
  let boardMinY = Number.POSITIVE_INFINITY
  let boardMaxX = Number.NEGATIVE_INFINITY
  let boardMaxY = Number.NEGATIVE_INFINITY
  let hasBoardBounds = false

  // Process all elements to determine bounds
  for (const circuitJsonElm of circuitJson) {
    if (circuitJsonElm.type === "pcb_panel") {
      const panel = circuitJsonElm as PcbPanel
      const width = distance.parse(panel.width)
      const height = distance.parse(panel.height)
      if (width === undefined || height === undefined) {
        continue
      }
      const center = { x: width / 2, y: height / 2 }
      updateBounds(center, width, height)
    } else if (circuitJsonElm.type === "pcb_board") {
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
    } else if (circuitJsonElm.type === "pcb_smtpad") {
      const pad = circuitJsonElm as any
      if (
        pad.shape === "rect" ||
        pad.shape === "rotated_rect" ||
        pad.shape === "pill"
      ) {
        updateBounds({ x: pad.x, y: pad.y }, pad.width, pad.height)
      } else if (pad.shape === "circle") {
        const radius = distance.parse(pad.radius)
        if (radius !== undefined) {
          updateBounds({ x: pad.x, y: pad.y }, radius * 2, radius * 2)
        }
      } else if (pad.shape === "polygon") {
        updateTraceBounds(pad.points)
      }
    } else if ("x" in circuitJsonElm && "y" in circuitJsonElm) {
      updateBounds({ x: circuitJsonElm.x, y: circuitJsonElm.y }, 0, 0)
    } else if ("route" in circuitJsonElm) {
      updateTraceBounds(circuitJsonElm.route)
    } else if (
      circuitJsonElm.type === "pcb_note_rect" ||
      circuitJsonElm.type === "pcb_fabrication_note_rect"
    ) {
      updateBounds(
        (circuitJsonElm as any).center,
        (circuitJsonElm as any).width,
        (circuitJsonElm as any).height,
      )
    } else if (circuitJsonElm.type === "pcb_cutout") {
      const cutout = circuitJsonElm as PcbCutout
      if (cutout.shape === "rect") {
        updateBounds(cutout.center, cutout.width, cutout.height)
      } else if (cutout.shape === "circle") {
        const radius = distance.parse(cutout.radius)
        if (radius !== undefined) {
          updateBounds(cutout.center, radius * 2, radius * 2)
        }
      } else if (cutout.shape === "polygon") {
        updateTraceBounds(cutout.points)
      }
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
    drawPaddingOutsideBoard || !Number.isFinite(boardMinX) ? minX : boardMinX
  const boundsMinY =
    drawPaddingOutsideBoard || !Number.isFinite(boardMinY) ? minY : boardMinY
  const boundsMaxX =
    drawPaddingOutsideBoard || !Number.isFinite(boardMaxX) ? maxX : boardMaxX
  const boundsMaxY =
    drawPaddingOutsideBoard || !Number.isFinite(boardMaxY) ? maxY : boardMaxY

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
    showCourtyards: options?.showCourtyards,
    showPcbGroups: options?.showPcbGroups,
    drawPaddingOutsideBoard,
    colorMap,
    showSolderMask: options?.showSolderMask,
  }

  const unsortedSvgObjects = circuitJson.flatMap((elm) =>
    createSvgObjects({ elm, circuitJson, ctx }),
  )

  let svgObjects = sortSvgObjectsByPcbLayer(unsortedSvgObjects)

  let strokeWidth = String(0.05 * scaleFactor)

  for (const element of circuitJson) {
    if ("stroke_width" in element) {
      strokeWidth = String(scaleFactor * element.stroke_width!)
      break
    }
  }

  if (options?.shouldDrawRatsNest) {
    const ratsNestObjects = createSvgObjectsForRatsNest(circuitJson, ctx)
    svgObjects = sortSvgObjectsByPcbLayer([...svgObjects, ...ratsNestObjects])
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
  ]

  const gridObjects = createSvgObjectsForPcbGrid({
    grid: options?.grid,
    svgWidth,
    svgHeight,
  })

  if (gridObjects.defs) {
    children.push(gridObjects.defs)
  }

  children.push({
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
      "data-type": "pcb_background",
      "data-pcb-layer": "global",
    },
    children: [],
  })

  if (drawPaddingOutsideBoard) {
    children.push(
      createSvgObjectFromPcbBoundary(transform, minX, minY, maxX, maxY),
    )
  }

  children.push(...svgObjects)

  if (gridObjects.rect) {
    children.push(gridObjects.rect)
  }

  if (options?.showErrorsInTextOverlay) {
    const errorOverlay = createErrorTextOverlay(
      circuitJson,
      "pcb_error_text_overlay",
    )
    if (errorOverlay) {
      children.push(errorOverlay)
    }
  }

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
    if (!center) return
    const centerX = distance.parse(center.x)
    const centerY = distance.parse(center.y)
    if (centerX === undefined || centerY === undefined) return
    const numericWidth = distance.parse(width) ?? 0
    const numericHeight = distance.parse(height) ?? 0
    const halfWidth = numericWidth / 2
    const halfHeight = numericHeight / 2
    minX = Math.min(minX, centerX - halfWidth)
    minY = Math.min(minY, centerY - halfHeight)
    maxX = Math.max(maxX, centerX + halfWidth)
    maxY = Math.max(maxY, centerY + halfHeight)
    hasBounds = true
  }

  function updateBoardBounds(center: any, width: any, height: any) {
    if (!center) return
    const centerX = distance.parse(center.x)
    const centerY = distance.parse(center.y)
    if (centerX === undefined || centerY === undefined) return
    const numericWidth = distance.parse(width) ?? 0
    const numericHeight = distance.parse(height) ?? 0
    const halfWidth = numericWidth / 2
    const halfHeight = numericHeight / 2
    boardMinX = Math.min(boardMinX, centerX - halfWidth)
    boardMinY = Math.min(boardMinY, centerY - halfHeight)
    boardMaxX = Math.max(boardMaxX, centerX + halfWidth)
    boardMaxY = Math.max(boardMaxY, centerY + halfHeight)
    hasBounds = true
    hasBoardBounds = true
  }

  function updateBoundsToIncludeOutline(outline: Point[]) {
    let updated = false
    for (const point of outline) {
      const x = distance.parse(point.x)
      const y = distance.parse(point.y)
      if (x === undefined || y === undefined) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
      updated = true
    }
    if (updated) {
      hasBounds = true
    }
  }

  function updateBoardBoundsToIncludeOutline(outline: Point[]) {
    let updated = false
    for (const point of outline) {
      const x = distance.parse(point.x)
      const y = distance.parse(point.y)
      if (x === undefined || y === undefined) continue
      boardMinX = Math.min(boardMinX, x)
      boardMinY = Math.min(boardMinY, y)
      boardMaxX = Math.max(boardMaxX, x)
      boardMaxY = Math.max(boardMaxY, y)
      updated = true
    }
    if (updated) {
      hasBounds = true
      hasBoardBounds = true
    }
  }

  function updateTraceBounds(route: any[]) {
    let updated = false
    for (const point of route) {
      const x = distance.parse(point?.x)
      const y = distance.parse(point?.y)
      if (x === undefined || y === undefined) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
      updated = true
    }
    if (updated) {
      hasBounds = true
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
      const radius = distance.parse(item.radius)
      if (radius !== undefined) {
        updateBounds(item.center, radius * 2, radius * 2)
      }
    } else if (item.type === "pcb_silkscreen_line") {
      updateBounds({ x: item.x1, y: item.y1 }, 0, 0)
      updateBounds({ x: item.x2, y: item.y2 }, 0, 0)
    } else if (item.type === "pcb_cutout") {
      const cutout = item as PcbCutout
      if (cutout.shape === "rect") {
        updateBounds(cutout.center, cutout.width, cutout.height)
      } else if (cutout.shape === "circle") {
        const radius = distance.parse(cutout.radius)
        if (radius !== undefined) {
          updateBounds(cutout.center, radius * 2, radius * 2)
        }
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
    case "pcb_footprint_overlap_error":
      return createSvgObjectsFromPcbFootprintOverlapError(
        elm as any,
        circuitJson,
        ctx,
      ).filter(Boolean)
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
    case "pcb_courtyard_rect":
      if (!ctx.showCourtyards) return []
      return createSvgObjectsFromPcbCourtyardRect(elm, ctx)

    case "pcb_fabrication_note_path":
      return createSvgObjectsFromPcbFabricationNotePath(elm, ctx)
    case "pcb_fabrication_note_text":
      return createSvgObjectsFromPcbFabricationNoteText(elm, ctx)
    case "pcb_fabrication_note_rect":
      return createSvgObjectsFromPcbFabricationNoteRect(elm, ctx)
    case "pcb_fabrication_note_dimension":
      return createSvgObjectsFromPcbFabricationNoteDimension(elm, ctx)
    case "pcb_note_dimension":
      return createSvgObjectsFromPcbNoteDimension(elm, ctx)
    case "pcb_note_text":
      return createSvgObjectsFromPcbNoteText(elm, ctx)
    case "pcb_note_rect":
      return createSvgObjectsFromPcbNoteRect(elm, ctx)
    case "pcb_note_path":
      return createSvgObjectsFromPcbNotePath(elm, ctx)
    case "pcb_note_line":
      return createSvgObjectsFromPcbNoteLine(elm, ctx)
    case "pcb_silkscreen_path":
      return createSvgObjectsFromPcbSilkscreenPath(elm, ctx)
    case "pcb_panel":
      return ctx.drawPaddingOutsideBoard
        ? createSvgObjectsFromPcbPanel(elm as PcbPanel, ctx)
        : []
    case "pcb_board":
      return ctx.drawPaddingOutsideBoard
        ? createSvgObjectsFromPcbBoard(elm, ctx)
        : []
    case "pcb_via":
      return createSvgObjectsFromPcbVia(elm, ctx)
    case "pcb_cutout":
      return createSvgObjectsFromPcbCutout(elm as any, ctx)
    case "pcb_group":
      return ctx.showPcbGroups
        ? createSvgObjectsFromPcbGroup(elm as any, ctx)
        : []
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
      "data-type": "pcb_boundary",
      "data-pcb-layer": "global",
    },
  }
}

/**
 * @deprecated use `convertCircuitJsonToPcbSvg` instead
 */
export const circuitJsonToPcbSvg = convertCircuitJsonToPcbSvg
