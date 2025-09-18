import type { AnyCircuitElement, PcbPort } from "circuit-json"
import { type INode as SvgObject, stringify } from "svgson"
import { su } from "@tscircuit/circuit-json-util"
import {
  type Matrix,
  applyToPoint,
  compose,
  scale,
  translate,
} from "transformation-matrix"
import { createSvgObjectsFromPinoutBoard } from "./svg-object-fns/create-svg-objects-from-pinout-board"
import { createSvgObjectsFromPinoutComponent } from "./svg-object-fns/create-svg-objects-from-pinout-component"
import { createSvgObjectsFromPinoutHole } from "./svg-object-fns/create-svg-objects-from-pinout-hole"
import { createSvgObjectsFromPinoutPlatedHole } from "./svg-object-fns/create-svg-objects-from-pinout-plated-hole"
import { createSvgObjectsFromPinoutSmtPad } from "./svg-object-fns/create-svg-objects-from-pinout-smt-pad"
import { createSvgObjectsFromPinoutPort } from "./svg-object-fns/create-svg-objects-from-pinout-port"
import { getSoftwareUsedString } from "../utils/get-software-used-string"
import { CIRCUIT_TO_SVG_VERSION } from "../package-version"
import {
  calculateLabelPositions,
  type LabelPosition,
} from "./calculate-label-positions"
import { getClosestEdge } from "./pinout-utils"

const OBJECT_ORDER: AnyCircuitElement["type"][] = [
  "pcb_board",
  "pcb_smtpad",
  "pcb_hole",
  "pcb_plated_hole",
  "pcb_component",
  "pcb_port",
]

interface Options {
  width?: number
  height?: number
  includeVersion?: boolean
}

export interface PinoutSvgContext {
  transform: Matrix
  soup: AnyCircuitElement[]
  board_bounds: { minX: number; minY: number; maxX: number; maxY: number }
  label_positions: Map<string, LabelPosition>
}

export function convertCircuitJsonToPinoutSvg(
  soup: AnyCircuitElement[],
  options?: Options,
): string {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  // Process all elements to determine bounds
  for (const item of soup) {
    if (item.type === "pcb_board") {
      if (
        "outline" in item &&
        item.outline &&
        Array.isArray(item.outline) &&
        item.outline.length > 0
      ) {
        for (const point of item.outline) {
          minX = Math.min(minX, point.x)
          minY = Math.min(minY, point.y)
          maxX = Math.max(maxX, point.x)
          maxY = Math.max(maxY, point.y)
        }
      } else {
        const center = item.center
        const width = item.width || 0
        const height = item.height || 0
        minX = Math.min(minX, center.x - width / 2)
        minY = Math.min(minY, center.y - height / 2)
        maxX = Math.max(maxX, center.x + width / 2)
        maxY = Math.max(maxY, center.y + height / 2)
      }
    }
  }

  const padding = 20
  const circuitWidth = maxX - minX + 2 * padding
  const circuitHeight = maxY - minY + 2 * padding

  const svgWidth = options?.width ?? 800
  const svgHeight = options?.height ?? 600

  const scaleX = svgWidth / circuitWidth
  const scaleY = svgHeight / circuitHeight
  const scaleFactor = Math.min(scaleX, scaleY)

  const offsetX = (svgWidth - circuitWidth * scaleFactor) / 2
  const offsetY = (svgHeight - circuitHeight * scaleFactor) / 2

  const transform = compose(
    translate(
      offsetX - minX * scaleFactor + padding * scaleFactor,
      svgHeight - offsetY + minY * scaleFactor - padding * scaleFactor,
    ),
    scale(scaleFactor, -scaleFactor),
  )

  const board_bounds = { minX, minY, maxX, maxY }
  const pinout_ports = soup.filter(
    (elm): elm is PcbPort =>
      elm.type === "pcb_port" && (elm as any).is_board_pinout,
  )

  const ports_by_edge: Record<"left" | "right" | "top" | "bottom", PcbPort[]> =
    {
      left: [],
      right: [],
      top: [],
      bottom: [],
    }

  for (const port of pinout_ports) {
    const edge = getClosestEdge({ x: port.x, y: port.y }, board_bounds)
    ports_by_edge[edge].push(port)
  }

  const label_positions = calculateLabelPositions({
    ports_by_edge,
    transform,
    soup,
    board_bounds,
    svgWidth,
    svgHeight,
  })

  const ctx: PinoutSvgContext = {
    transform,
    soup,
    board_bounds,
    label_positions,
  }

  const svgObjects = soup
    .sort(
      (a, b) =>
        (OBJECT_ORDER.indexOf(a.type) ?? 9999) -
        (OBJECT_ORDER.indexOf(b.type) ?? 9999),
    )
    .flatMap((item) => createSvgObjects(item, ctx, soup))

  const softwareUsedString = getSoftwareUsedString(soup)
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
    children: [
      {
        name: "rect",
        type: "element",
        attributes: {
          fill: "rgb(255, 255, 255)",
          x: "0",
          y: "0",
          width: svgWidth.toString(),
          height: svgHeight.toString(),
        },
        value: "",
        children: [],
      },
      ...svgObjects,
    ].filter((child): child is SvgObject => child !== null),
  }

  return stringify(svgObject)
}

function createSvgObjects(
  elm: AnyCircuitElement,
  ctx: PinoutSvgContext,
  soup: AnyCircuitElement[],
): SvgObject[] {
  switch (elm.type) {
    case "pcb_board":
      return createSvgObjectsFromPinoutBoard(elm, ctx)

    case "pcb_component":
      return createSvgObjectsFromPinoutComponent(elm, ctx)
    case "pcb_smtpad":
      return createSvgObjectsFromPinoutSmtPad(elm, ctx)
    case "pcb_hole":
      return createSvgObjectsFromPinoutHole(elm, ctx)
    case "pcb_plated_hole":
      return createSvgObjectsFromPinoutPlatedHole(elm, ctx)
    case "pcb_port":
      if ((elm as any).is_board_pinout) {
        return createSvgObjectsFromPinoutPort(elm, ctx)
      }
      return []
    default:
      return []
  }
}

export default convertCircuitJsonToPinoutSvg
