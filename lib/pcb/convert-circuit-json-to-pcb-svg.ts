import type {
  Point,
  AnyCircuitElement,
  pcb_cutout,
  PcbCutout,
  PcbPanel,
  PCBKeepoutRect,
  PCBKeepoutCircle,
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
import { createSvgObjectsFromPcbCopperText } from "./svg-object-fns/create-svg-objects-from-pcb-copper-text"
import { createSvgObjectsFromPcbSilkscreenCircle } from "./svg-object-fns/create-svg-objects-from-pcb-silkscreen-circle"
import { createSvgObjectsFromPcbSilkscreenLine } from "./svg-object-fns/create-svg-objects-from-pcb-silkscreen-line"
import { createSvgObjectsFromPcbSilkscreenPill } from "./svg-object-fns/create-svg-objects-from-pcb-silkscreen-pill"
import { createSvgObjectsFromPcbSilkscreenOval } from "./svg-object-fns/create-svg-objects-from-pcb-silkscreen-oval"
import { createSvgObjectsFromPcbCourtyardRect } from "./svg-object-fns/create-svg-objects-from-pcb-courtyard-rect"
import { createSvgObjectsFromPcbTrace } from "./svg-object-fns/create-svg-objects-from-pcb-trace"
import { createSvgObjectsFromSmtPad } from "./svg-object-fns/create-svg-objects-from-smt-pads"
import { createSvgObjectsFromPcbBoard } from "./svg-object-fns/create-svg-objects-from-pcb-board"
import { createSvgObjectsFromPcbPanel } from "./svg-object-fns/create-svg-objects-from-pcb-panel"
import { createSvgObjectsFromPcbVia } from "./svg-object-fns/create-svg-objects-from-pcb-via"
import { createSvgObjectsFromPcbHole } from "./svg-object-fns/create-svg-objects-from-pcb-hole"
import { createSvgObjectsForRatsNest } from "./svg-object-fns/create-svg-objects-from-pcb-rats-nests"
import { createSvgObjectsFromPcbCutout } from "./svg-object-fns/create-svg-objects-from-pcb-cutout"
import { createSvgObjectsFromPcbCutoutPath } from "./svg-object-fns/create-svg-objects-from-pcb-cutout-path"
import { createSvgObjectsFromPcbKeepout } from "./svg-object-fns/create-svg-objects-from-pcb-keepout"
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
import { getPcbBoundsFromCircuitJson } from "./get-pcb-bounds-from-circuit-json"

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
  showAnchorOffsets?: boolean
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
  showAnchorOffsets?: boolean
  circuitJson?: AnyCircuitElement[]
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
    soldermaskOverCopper: {
      top:
        colorOverrides?.soldermaskOverCopper?.top ??
        DEFAULT_PCB_COLOR_MAP.soldermaskOverCopper.top,
      bottom:
        colorOverrides?.soldermaskOverCopper?.bottom ??
        DEFAULT_PCB_COLOR_MAP.soldermaskOverCopper.bottom,
    },
    soldermaskWithCopperUnderneath: {
      top:
        colorOverrides?.soldermaskWithCopperUnderneath?.top ??
        DEFAULT_PCB_COLOR_MAP.soldermaskWithCopperUnderneath.top,
      bottom:
        colorOverrides?.soldermaskWithCopperUnderneath?.bottom ??
        DEFAULT_PCB_COLOR_MAP.soldermaskWithCopperUnderneath.bottom,
    },
    substrate: colorOverrides?.substrate ?? DEFAULT_PCB_COLOR_MAP.substrate,
    courtyard: colorOverrides?.courtyard ?? DEFAULT_PCB_COLOR_MAP.courtyard,
    keepout: colorOverrides?.keepout ?? DEFAULT_PCB_COLOR_MAP.keepout,
    debugComponent: {
      fill:
        colorOverrides?.debugComponent?.fill ??
        DEFAULT_PCB_COLOR_MAP.debugComponent.fill,
      stroke:
        colorOverrides?.debugComponent?.stroke ??
        DEFAULT_PCB_COLOR_MAP.debugComponent.stroke,
    },
  }

  const {
    minX,
    minY,
    maxX,
    maxY,
    boardMinX,
    boardMinY,
    boardMaxX,
    boardMaxY,
    hasBoardBounds,
  } = getPcbBoundsFromCircuitJson(circuitJson)

  const padding = drawPaddingOutsideBoard ? 1 : 0
  const boundsMinX =
    drawPaddingOutsideBoard || !hasBoardBounds ? minX : boardMinX
  const boundsMinY =
    drawPaddingOutsideBoard || !hasBoardBounds ? minY : boardMinY
  const boundsMaxX =
    drawPaddingOutsideBoard || !hasBoardBounds ? maxX : boardMaxX
  const boundsMaxY =
    drawPaddingOutsideBoard || !hasBoardBounds ? maxY : boardMaxY

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
    showAnchorOffsets: options?.showAnchorOffsets,
    circuitJson,
  }

  let unsortedSvgObjects = circuitJson.flatMap((elm) =>
    createSvgObjects({ elm, circuitJson, ctx }),
  )

  let strokeWidth = String(0.05 * scaleFactor)

  for (const element of circuitJson) {
    if ("stroke_width" in element) {
      strokeWidth = String(scaleFactor * element.stroke_width!)
      break
    }
  }

  if (options?.shouldDrawRatsNest) {
    const ratsNestObjects = createSvgObjectsForRatsNest(circuitJson, ctx)
    unsortedSvgObjects = [...unsortedSvgObjects, ...ratsNestObjects]
  }

  const svgObjects = sortSvgObjectsByPcbLayer(unsortedSvgObjects)

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
    case "pcb_silkscreen_pill":
      return createSvgObjectsFromPcbSilkscreenPill(elm, ctx)
    case "pcb_silkscreen_oval":
      return createSvgObjectsFromPcbSilkscreenOval(elm, ctx)
    case "pcb_copper_text":
      return createSvgObjectsFromPcbCopperText(elm as any, ctx)
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
      const cutout = elm as PcbCutout
      if (cutout.shape === "path") {
        return createSvgObjectsFromPcbCutoutPath(cutout, ctx)
      }
      return createSvgObjectsFromPcbCutout(elm as any, ctx)
    case "pcb_keepout":
      return createSvgObjectsFromPcbKeepout(
        elm as PCBKeepoutRect | PCBKeepoutCircle,
        ctx,
      )
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
