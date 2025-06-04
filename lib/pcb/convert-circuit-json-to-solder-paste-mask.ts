import type { Point, AnyCircuitElement } from "circuit-json"
import { type INode as SvgObject, stringify } from "svgson"
import {
  applyToPoint,
  compose,
  scale,
  translate,
  type Matrix,
} from "transformation-matrix"
import { createSvgObjectsFromPcbBoard } from "./svg-object-fns/create-svg-objects-from-pcb-board"
import { createSvgObjectsFromSolderPaste } from "./svg-object-fns/convert-circuit-json-to-solder-paste-mask"
import type { PcbContext } from "./convert-circuit-json-to-pcb-svg"
import { DEFAULT_PCB_COLOR_MAP } from "./colors"

const OBJECT_ORDER: AnyCircuitElement["type"][] = [
  "pcb_board",
  "pcb_solder_paste",
]

interface Options {
  layer: "top" | "bottom"
  width?: number
  height?: number
}

export function convertCircuitJsonToSolderPasteMask(
  circuitJson: AnyCircuitElement[],
  options: Options,
): string {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  // Filter to include only pcb_board and pcb_solder_paste elements for the specified layer
  const filteredCircuitJson = circuitJson.filter(
    (elm) =>
      elm.type === "pcb_board" ||
      (elm.type === "pcb_solder_paste" && elm.layer === options.layer),
  )

  // Process filtered elements to determine bounds
  for (const item of filteredCircuitJson) {
    if (item.type === "pcb_board") {
      if (
        item.outline &&
        Array.isArray(item.outline) &&
        item.outline.length >= 3
      ) {
        updateBoundsToIncludeOutline(item.outline)
      } else if ("center" in item && "width" in item && "height" in item) {
        updateBounds(item.center, item.width, item.height)
      }
    } else if (item.type === "pcb_solder_paste" && "x" in item && "y" in item) {
      updateBounds({ x: item.x, y: item.y }, 0, 0)
    }
  }

  const padding = 1 // Consistent with reference code
  const circuitWidth = maxX - minX + 2 * padding
  const circuitHeight = maxY - minY + 2 * padding

  const svgWidth = options.width ?? 800
  const svgHeight = options.height ?? 600

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
    layer: options.layer,
    colorMap: DEFAULT_PCB_COLOR_MAP,
  }

  // Sort elements by OBJECT_ORDER and convert to SVG objects
  const svgObjects = filteredCircuitJson
    .sort(
      (a, b) =>
        (OBJECT_ORDER.indexOf(b.type) ?? 9999) -
        (OBJECT_ORDER.indexOf(a.type) ?? 9999),
    )
    .flatMap((item) => createSvgObjects({ elm: item, ctx }))

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
    return stringify(svgObject)
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
}

interface CreateSvgObjectsParams {
  elm: AnyCircuitElement
  ctx: PcbContext
}

function createSvgObjects({ elm, ctx }: CreateSvgObjectsParams): SvgObject[] {
  const { transform } = ctx
  switch (elm.type) {
    case "pcb_board":
      return createSvgObjectsFromPcbBoard(elm, ctx)
    case "pcb_solder_paste":
      return createSvgObjectsFromSolderPaste(elm, ctx)
    default:
      return []
  }
}

function createSvgObjectFromPcbBoundary(
  transform: Matrix,
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
