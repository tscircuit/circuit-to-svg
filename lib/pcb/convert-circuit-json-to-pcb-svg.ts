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
  type CopperColorMap,
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

/**
 * Render filter for multi-pass rendering
 * - copper: Renders copper layers in order (bottom → inner → top)
 * - silkscreen: Renders silkscreen elements
 * - holes: Renders pcb_hole and pcb_plated_hole
 * - cutouts: Renders pcb_cutout elements
 * - vias: Renders pcb_via elements
 */
type RenderFilter =
  | {
      type: "copper"
      layer: string
      isFirstLayer: boolean
      overrideColorMap?: PcbColorMap
    }
  | { type: "silkscreen" | "holes" | "cutouts" | "vias" }

// ============================================================================
// Shared Helper Functions
// ============================================================================

/**
 * Extract layer information from a route segment
 */
function getLayerFromRouteSegment(seg: any): string | undefined {
  return (
    ("layer" in seg && seg.layer) ||
    ("from_layer" in seg && seg.from_layer) ||
    ("to_layer" in seg && seg.to_layer) ||
    undefined
  )
}

/**
 * Get the layer of an element (for copper elements only)
 * Returns "top" as default for pcb_smtpad, undefined otherwise
 */
function getElementLayer(
  elm: AnyCircuitElement,
): "top" | "bottom" | undefined {
  if (elm.type === "pcb_smtpad") {
    return elm.layer === "top" || elm.layer === "bottom" ? elm.layer : "top"
  }
  if (elm.type === "pcb_trace") {
    for (const seg of elm.route ?? []) {
      const candidate = getLayerFromRouteSegment(seg)
      if (candidate === "top" || candidate === "bottom") return candidate
    }
  }
  return undefined
}

/**
 * Check if an element is a copper element
 */
function isElementCopper(elm: AnyCircuitElement): boolean {
  return elm.type === "pcb_trace" || elm.type === "pcb_smtpad"
}

/**
 * Discover all layers present in the circuit JSON
 */
function discoverLayers(circuitJson: AnyCircuitElement[]): Set<string> {
  const layers = new Set<string>()
  for (const elm of circuitJson) {
    if (elm.type === "pcb_smtpad") {
      layers.add(elm.layer || "top")
    } else if (elm.type === "pcb_trace" && elm.route) {
      for (const seg of elm.route) {
        const segLayer = getLayerFromRouteSegment(seg)
        if (segLayer) layers.add(segLayer)
      }
    } else if (elm.type === "pcb_copper_pour") {
      const pourLayer = (elm as any).layer
      const pourLayers = (elm as any).layers
      if (pourLayer) layers.add(pourLayer)
      if (Array.isArray(pourLayers)) pourLayers.forEach((l) => layers.add(l))
    }
  }
  return layers
}

/**
 * Determine the order of layers for rendering (bottom to top)
 */
function getLayerOrder(
  discoveredLayers: Set<string>,
  filterLayer?: string,
): string[] {
  const layers: string[] = []
  if (discoveredLayers.has("bottom")) layers.push("bottom")

  const innerLayers = Array.from(discoveredLayers)
    .filter((l) => l.startsWith("inner"))
    .sort((a, b) => {
      const numB = parseInt(b.replace("inner", "")) || 0
      const numA = parseInt(a.replace("inner", "")) || 0
      return numB - numA
    })
  layers.push(...innerLayers)

  if (discoveredLayers.has("top")) layers.push("top")
  if (layers.length === 0) layers.push("top")

  return filterLayer ? layers.filter((l) => l === filterLayer) : layers
}

/**
 * Create a color map with white copper (for non-padded board rendering)
 */
function getWhiteCopperColorMap(colorMap: PcbColorMap): PcbColorMap {
  const whiteCopper = Object.fromEntries(
    Object.keys(colorMap.copper).map((k) => [k, "#ffffff"]),
  )
  return { ...colorMap, copper: { ...colorMap.copper, ...whiteCopper } }
}

/**
 * Sort function for copper layers (ensures proper z-ordering)
 * Bottom layers render first, then top layers
 */
function copperLayerSort(a: AnyCircuitElement, b: AnyCircuitElement): number {
  const layerA = getElementLayer(a)
  const layerB = getElementLayer(b)

  if (isElementCopper(a) && isElementCopper(b) && layerA !== layerB) {
    if (layerA === "top") return 1
    if (layerB === "top") return -1
    if (layerA === "bottom") return -1
    if (layerB === "bottom") return 1
  }

  return (
    (OBJECT_ORDER.indexOf(b.type) ?? 9999) -
    (OBJECT_ORDER.indexOf(a.type) ?? 9999)
  )
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
        updateBoundsFromOutline(circuitJsonElm.outline, true)
      } else if (
        "center" in circuitJsonElm &&
        "width" in circuitJsonElm &&
        "height" in circuitJsonElm
      ) {
        updateBounds(
          circuitJsonElm.center,
          circuitJsonElm.width,
          circuitJsonElm.height,
          true,
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

  const discoveredLayers = discoverLayers(circuitJson)
  const layerOrder = getLayerOrder(discoveredLayers, layer)

  const baseCtx: PcbContext = {
    transform,
    layer: undefined,
    shouldDrawErrors: options?.shouldDrawErrors,
    drawPaddingOutsideBoard,
    colorMap,
    renderSolderMask: options?.renderSolderMask,
  }

  // Create a fresh cache for this render to prevent duplicates
  const renderedCache = {
    vias: new Set<string>(),
    holes: new Set<string>(),
  }

  const renderPass = (filter: RenderFilter) =>
    circuitJson
      .sort(copperLayerSort)
      .flatMap((elm) =>
        createSvgObjects({ elm, circuitJson, ctx: baseCtx, filter, renderedCache }),
      )

  let svgObjects = layerOrder.flatMap((currentLayer, i) =>
    renderPass({
      type: "copper",
      layer: currentLayer,
      isFirstLayer: i === 0,
      overrideColorMap: !drawPaddingOutsideBoard
        ? getWhiteCopperColorMap(colorMap)
        : undefined,
    }),
  )

  svgObjects.push(
    ...renderPass({ type: "silkscreen" }),
    ...renderPass({ type: "holes" }),
    ...renderPass({ type: "cutouts" }),
    ...renderPass({ type: "vias" }),
  )

  let strokeWidth = String(0.05 * scaleFactor)

  for (const element of circuitJson) {
    if ("stroke_width" in element) {
      strokeWidth = String(scaleFactor * element.stroke_width!)
      break
    }
  }

  if (options?.shouldDrawRatsNest) {
    const ratsNestObjects = createSvgObjectsForRatsNest(circuitJson, baseCtx)
    svgObjects.push(...ratsNestObjects)
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

  // ============================================================================
  // Bounds Calculation Helpers
  // ============================================================================

  /**
   * Update bounds from a center point with width and height
   */
  function updateBounds(
    center: any,
    width: any,
    height: any,
    isBoard = false,
  ) {
    const halfWidth = width / 2
    const halfHeight = height / 2
    const left = center.x - halfWidth
    const top = center.y - halfHeight
    const right = center.x + halfWidth
    const bottom = center.y + halfHeight

    // Update general bounds
    minX = Math.min(minX, left)
    minY = Math.min(minY, top)
    maxX = Math.max(maxX, right)
    maxY = Math.max(maxY, bottom)

    // Update board-specific bounds if this is a board element
    if (isBoard) {
      boardMinX = Math.min(boardMinX, left)
      boardMinY = Math.min(boardMinY, top)
      boardMaxX = Math.max(boardMaxX, right)
      boardMaxY = Math.max(boardMaxY, bottom)
    }
  }

  /**
   * Update bounds from an outline (array of points)
   */
  function updateBoundsFromOutline(outline: Point[], isBoard = false) {
    for (const point of outline) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)

      if (isBoard) {
        boardMinX = Math.min(boardMinX, point.x)
        boardMinY = Math.min(boardMinY, point.y)
        boardMaxX = Math.max(boardMaxX, point.x)
        boardMaxY = Math.max(boardMaxY, point.y)
      }
    }
  }

  /**
   * Update bounds from a route (array of points)
   */
  function updateTraceBounds(route: any[]) {
    updateBoundsFromOutline(route, false)
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
  filter: RenderFilter
  renderedCache: {
    vias: Set<string>
    holes: Set<string>
  }
}

/**
 * Create SVG objects from a circuit element based on the render filter
 * 
 * This function:
 * 1. Filters elements by type (copper/silkscreen/holes/cutouts/vias)
 * 2. Prevents duplicate rendering using renderedCache
 * 3. Updates context with layer-specific information
 * 4. Delegates to specific creator functions based on element type
 */
function createSvgObjects({
  elm,
  circuitJson,
  ctx,
  filter,
  renderedCache,
}: CreateSvgObjectsParams): SvgObject[] {
  const isSilkscreen =
    elm.type.startsWith("pcb_silkscreen") ||
    elm.type.startsWith("pcb_fabrication_note")
  const getElmId = (e: AnyCircuitElement): string =>
    ("pcb_via_id" in e && e.pcb_via_id) ||
    ("pcb_hole_id" in e && e.pcb_hole_id) ||
    ("pcb_plated_hole_id" in e && e.pcb_plated_hole_id) ||
    ("x" in e && "y" in e && `${e.type}_${e.x}_${e.y}`) ||
    ""

  // Filter by render type
  if (filter.type === "silkscreen" && !isSilkscreen) return []
  if (filter.type !== "silkscreen" && isSilkscreen) return []
  if (filter.type === "vias" && elm.type !== "pcb_via") return []
  if (
    filter.type === "holes" &&
    elm.type !== "pcb_hole" &&
    elm.type !== "pcb_plated_hole"
  )
    return []
  if (filter.type === "cutouts" && elm.type !== "pcb_cutout") return []

  // Prevent duplicate rendering
  if (filter.type === "vias") {
    const id = getElmId(elm)
    if (renderedCache.vias.has(id)) return []
    if (id) renderedCache.vias.add(id)
  }
  if (filter.type === "holes") {
    const id = getElmId(elm)
    if (renderedCache.holes.has(id)) return []
    if (id) renderedCache.holes.add(id)
  }

  // Update context for copper layers
  if (filter.type === "copper") {
    ctx = {
      ...ctx,
      layer: filter.layer as any,
      colorMap: filter.overrideColorMap || ctx.colorMap,
    }
  }

  switch (elm.type) {
    case "pcb_via":
      return createSvgObjectsFromPcbVia(elm, ctx)
    case "pcb_plated_hole":
      return createSvgObjectsFromPcbPlatedHole(elm, ctx).filter(Boolean)
    case "pcb_hole":
      return createSvgObjectsFromPcbHole(elm, ctx)
    case "pcb_trace":
      return createSvgObjectsFromPcbTrace(elm, ctx)
    case "pcb_copper_pour":
      return createSvgObjectsFromPcbCopperPour(elm as any, ctx)
    case "pcb_smtpad":
      return createSvgObjectsFromSmtPad(
        { ...elm, layer: elm.layer || "top" } as any,
        ctx,
      )
    case "pcb_board":
      return filter.type === "copper" &&
        filter.isFirstLayer &&
        ctx.drawPaddingOutsideBoard
        ? createSvgObjectsFromPcbBoard(elm, ctx)
        : []
    case "pcb_silkscreen_text":
      return createSvgObjectsFromPcbSilkscreenText(elm, ctx)
    case "pcb_silkscreen_rect":
      return createSvgObjectsFromPcbSilkscreenRect(elm, ctx)
    case "pcb_silkscreen_circle":
      return createSvgObjectsFromPcbSilkscreenCircle(elm, ctx)
    case "pcb_silkscreen_line":
      return createSvgObjectsFromPcbSilkscreenLine(elm, ctx)
    case "pcb_silkscreen_path":
      return createSvgObjectsFromPcbSilkscreenPath(elm, ctx)
    case "pcb_fabrication_note_path":
      return createSvgObjectsFromPcbFabricationNotePath(elm, ctx)
    case "pcb_fabrication_note_text":
      return createSvgObjectsFromPcbFabricationNoteText(elm, ctx)
    case "pcb_trace_error":
      return createSvgObjectsFromPcbTraceError(elm, circuitJson, ctx)
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
