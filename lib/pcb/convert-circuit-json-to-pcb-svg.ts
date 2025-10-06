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

const RATS_NEST_SOURCE_ELEMENT = { type: "rats_nest" } as const

type LayerCategory =
  | "component"
  | "silkscreen"
  | "soldermask"
  | "copper"
  | "drill"
  | "cutout"
  | "board"
  | "fabrication"
  | "error"
  | "rats-nest"
  | "metadata"
  | "background"
  | "unknown"

interface LayerInfo {
  category: LayerCategory
  side?: string
  tag: string
}

interface LayeredEntry {
  object: SvgObject
  layerInfo: LayerInfo
  sourceType: AnyCircuitElement["type"] | typeof RATS_NEST_SOURCE_ELEMENT.type
  elementIndex: number
  objectIndex: number
}

const CATEGORY_PRIORITY: Record<LayerCategory, number> = {
  component: 0,
  silkscreen: 1,
  soldermask: 2,
  copper: 3,
  drill: 4,
  cutout: 5,
  board: 6,
  fabrication: 7,
  error: 8,
  "rats-nest": 9,
  metadata: 10,
  background: 11,
  unknown: 12,
}

const SIDE_PRIORITY: Record<string, number> = {
  top: 0,
  inner1: 1,
  inner2: 2,
  inner3: 3,
  inner4: 4,
  inner5: 5,
  inner6: 6,
  through: 7,
  board: 8,
  bottom: 9,
  overlay: 10,
  unknown: 11,
}

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
    drawPaddingOutsideBoard,
    colorMap,
    renderSolderMask: options?.renderSolderMask,
  }

  const layeredObjects = circuitJson.flatMap((elm, elementIndex) =>
    createSvgObjects({ elm, circuitJson, ctx }).map((object, objectIndex) =>
      createLayeredEntry({
        object,
        sourceElement: elm,
        elementIndex,
        objectIndex,
      }),
    ),
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
    layeredObjects.push(
      ...ratsNestObjects.map((object, objectIndex) =>
        createLayeredEntry({
          object,
          sourceElement: RATS_NEST_SOURCE_ELEMENT,
          elementIndex: circuitJson.length,
          objectIndex,
        }),
      ),
    )
  }

  layeredObjects.sort(compareLayeredEntries)

  const svgObjects = layeredObjects.map(({ object }) => object)

  const children: SvgObject[] = [
    {
      name: "style",
      type: "element",
      value: "",
      attributes: { "data-pcb-layer": "metadata" },
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
        "data-pcb-layer": "background",
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
      "data-pcb-layer": "root",
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

function createLayeredEntry({
  object,
  sourceElement,
  elementIndex,
  objectIndex,
}: {
  object: SvgObject
  sourceElement: AnyCircuitElement | typeof RATS_NEST_SOURCE_ELEMENT
  elementIndex: number
  objectIndex: number
}): LayeredEntry {
  const { object: annotatedObject, layerInfo } = annotateSvgObjectWithLayer({
    object,
    sourceElement,
  })

  return {
    object: annotatedObject,
    layerInfo,
    sourceType: sourceElement.type,
    elementIndex,
    objectIndex,
  }
}

function compareLayeredEntries(a: LayeredEntry, b: LayeredEntry): number {
  const sortKeyA = getLayerSortKey(a.layerInfo)
  const sortKeyB = getLayerSortKey(b.layerInfo)

  if (sortKeyA !== sortKeyB) {
    return sortKeyA - sortKeyB
  }

  const typeOrderA = getElementTypePriority(a.sourceType)
  const typeOrderB = getElementTypePriority(b.sourceType)
  if (typeOrderA !== typeOrderB) {
    return typeOrderA - typeOrderB
  }

  if (a.elementIndex !== b.elementIndex) {
    return a.elementIndex - b.elementIndex
  }

  return a.objectIndex - b.objectIndex
}

function getLayerSortKey(layerInfo: LayerInfo): number {
  const sideName = layerInfo.side ?? "unknown"
  const resolvedSideKey = (SIDE_PRIORITY[sideName] ??
    SIDE_PRIORITY.unknown) as number
  const categoryKey =
    CATEGORY_PRIORITY[layerInfo.category] ?? CATEGORY_PRIORITY.unknown

  return resolvedSideKey * 100 + categoryKey
}

function getElementTypePriority(
  type: AnyCircuitElement["type"] | typeof RATS_NEST_SOURCE_ELEMENT.type,
): number {
  const index = OBJECT_ORDER.indexOf(type as AnyCircuitElement["type"])
  return index === -1 ? OBJECT_ORDER.length : index
}

function annotateSvgObjectWithLayer({
  object,
  sourceElement,
  parentLayer,
}: {
  object: SvgObject
  sourceElement: AnyCircuitElement | typeof RATS_NEST_SOURCE_ELEMENT
  parentLayer?: LayerInfo
}): { object: SvgObject; layerInfo: LayerInfo } {
  if (object.type !== "element") {
    return {
      object,
      layerInfo: parentLayer ?? {
        category: "unknown",
        side: "unknown",
        tag: "unknown:unknown",
      },
    }
  }

  object.attributes ??= {}

  const layerInfo = determineLayerInfo({
    sourceElement,
    object,
    parentLayer,
  })

  object.attributes["data-pcb-layer"] = layerInfo.tag

  if (Array.isArray(object.children) && object.children.length > 0) {
    object.children = object.children.map((child) => {
      if (child.type === "element") {
        return annotateSvgObjectWithLayer({
          object: child,
          sourceElement,
          parentLayer: layerInfo,
        }).object
      }
      return child
    })
  }

  return { object, layerInfo }
}

function determineLayerInfo({
  sourceElement,
  object,
  parentLayer,
}: {
  sourceElement: AnyCircuitElement | typeof RATS_NEST_SOURCE_ELEMENT
  object: SvgObject
  parentLayer?: LayerInfo
}): LayerInfo {
  const attributes = object.attributes ?? {}
  const classAttr = (attributes.class ?? "").toLowerCase()
  const classTokens = classAttr.split(/\s+/).filter(Boolean)
  const hasClassFragment = (fragment: string) =>
    classTokens.some((cls) => cls.includes(fragment))

  const type = sourceElement.type
  const dataLayerValue =
    attributes["data-layer"] ?? attributes["data-layer-name"] ?? undefined
  const explicitLayer = normalizeLayerName(dataLayerValue)
  const layerFromClass = extractLayerFromClass(classTokens)
  const layerFromElement =
    sourceElement !== RATS_NEST_SOURCE_ELEMENT && "layer" in sourceElement
      ? normalizeLayerName((sourceElement as any).layer)
      : undefined

  let side =
    explicitLayer ??
    layerFromClass ??
    layerFromElement ??
    parentLayer?.side ??
    inferSideFromSourceType(sourceElement)

  let category: LayerCategory | undefined

  switch (type) {
    case "pcb_component":
      category = "component"
      break
    case "pcb_silkscreen_text":
    case "pcb_silkscreen_path":
    case "pcb_silkscreen_rect":
    case "pcb_silkscreen_circle":
    case "pcb_silkscreen_line":
      category = "silkscreen"
      break
    case "pcb_trace":
      category = hasClassFragment("soldermask") ? "soldermask" : "copper"
      break
    case "pcb_smtpad":
      category = hasClassFragment("solder-mask")
        ? "soldermask"
        : hasClassFragment("soldermask")
          ? "soldermask"
          : "copper"
      break
    case "pcb_copper_pour":
      category = "copper"
      break
    case "pcb_via":
      category = hasClassFragment("pcb-hole-inner") ? "drill" : "copper"
      if (!side) side = "through"
      break
    case "pcb_plated_hole":
      category = hasClassFragment("pcb-hole-inner") ? "drill" : "copper"
      if (!side) side = "through"
      break
    case "pcb_hole":
      category = "drill"
      if (!side) side = "through"
      break
    case "pcb_board":
      category = "board"
      side = side ?? "board"
      break
    case "pcb_cutout":
      category = "cutout"
      side = side ?? "board"
      break
    case "pcb_fabrication_note_text":
    case "pcb_fabrication_note_path":
      category = "fabrication"
      break
    case "pcb_trace_error":
      category = "error"
      side = side ?? "overlay"
      break
    default:
      if (sourceElement === RATS_NEST_SOURCE_ELEMENT) {
        category = "rats-nest"
        side = side ?? "overlay"
      }
      break
  }

  if (!category) {
    if (hasClassFragment("silkscreen")) {
      category = "silkscreen"
    } else if (
      hasClassFragment("soldermask") ||
      hasClassFragment("solder-mask")
    ) {
      category = "soldermask"
    } else if (
      hasClassFragment("pcb-trace") ||
      hasClassFragment("pcb-pad") ||
      hasClassFragment("copper")
    ) {
      category = "copper"
    } else if (
      hasClassFragment("pcb-hole-inner") ||
      hasClassFragment("pcb-hole")
    ) {
      category = "drill"
    } else if (hasClassFragment("pcb-cutout")) {
      category = "cutout"
    } else if (hasClassFragment("pcb-board")) {
      category = "board"
    }
  }

  const resolvedCategory = category ?? parentLayer?.category ?? "unknown"

  if (!side) {
    side = parentLayer?.side ?? "unknown"
  }

  const tag = side ? `${resolvedCategory}:${side}` : resolvedCategory

  return {
    category: resolvedCategory,
    side,
    tag,
  }
}

function normalizeLayerName(layer: unknown): string | undefined {
  if (typeof layer === "string" && layer.length > 0) {
    return layer.toLowerCase()
  }
  if (layer && typeof layer === "object" && "name" in layer) {
    const name = (layer as { name?: unknown }).name
    if (typeof name === "string") {
      return name.toLowerCase()
    }
  }
  return undefined
}

function extractLayerFromClass(classTokens: string[]): string | undefined {
  for (const token of classTokens) {
    if (/(?:^|-)top(?:$|-)/.test(token)) return "top"
    if (/(?:^|-)bottom(?:$|-)/.test(token)) return "bottom"
    const innerMatch = token.match(/(?:^|-)inner(\d+)(?:$|-)/)
    if (innerMatch) {
      return `inner${innerMatch[1]}`
    }
  }
  return undefined
}

function inferSideFromSourceType(
  sourceElement: AnyCircuitElement | typeof RATS_NEST_SOURCE_ELEMENT,
): string | undefined {
  if (sourceElement === RATS_NEST_SOURCE_ELEMENT) {
    return "overlay"
  }

  switch (sourceElement.type) {
    case "pcb_via":
    case "pcb_plated_hole":
    case "pcb_hole":
      return "through"
    case "pcb_board":
    case "pcb_cutout":
      return "board"
    case "pcb_trace_error":
    case "pcb_fabrication_note_text":
    case "pcb_fabrication_note_path":
      return "overlay"
    default:
      return undefined
  }
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
      return [createSvgObjectsFromPcbVia(elm, ctx)].filter(
        Boolean,
      ) as SvgObject[]
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
      "data-pcb-layer": "board:outline",
    },
  }
}

/**
 * @deprecated use `convertCircuitJsonToPcbSvg` instead
 */
export const circuitJsonToPcbSvg = convertCircuitJsonToPcbSvg
