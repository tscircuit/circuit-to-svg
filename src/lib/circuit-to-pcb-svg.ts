import type { AnySoupElement } from "@tscircuit/soup"
import { type INode as SvgObject, stringify } from "svgson"
import {
  type Matrix,
  applyToPoint,
  compose,
  scale,
  translate,
} from "transformation-matrix"
import { createSvgObjectsFromPcbFabricationNotePath } from "./svg-object-fns/create-svg-objects-from-pcb-fabrication-note-path"
import { createSvgObjectsFromPcbFabricationNoteText } from "./svg-object-fns/create-svg-objects-from-pcb-fabrication-note-text"
import { createSvgObjectsFromPcbSilkscreenPath } from "./svg-object-fns/create-svg-objects-from-pcb-silkscreen-path"
import { createSvgObjectsFromPcbSilkscreenText } from "./svg-object-fns/create-svg-objects-from-pcb-silkscreen-text"
import { createSvgObjectsFromPcbTrace } from "./svg-object-fns/create-svg-objects-from-pcb-trace"
import { createSvgObjectsFromSmtPad } from "./svg-object-fns/create-svg-objects-from-smt-pads"
import { createSvgObjectsFromPcbHole } from "./svg-object-fns/create-svg-objects-from-pcb-plated-hole"

const OBJECT_ORDER: AnySoupElement["type"][] = [
  "pcb_plated_hole",
  "pcb_fabrication_note_text",
  "pcb_fabrication_note_path",
  "pcb_silkscreen_text",
  "pcb_silkscreen_path",
  "pcb_trace",
  "pcb_smtpad",
  "pcb_component",
]

interface PointObjectNotation {
  x: number
  y: number
}

function circuitJsonToPcbSvg(soup: AnySoupElement[]): string {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  // Process all elements to determine bounds
  for (const item of soup) {
    if ("center" in item && "width" in item && "height" in item) {
      updateBounds(item.center, item.width, item.height)
    } else if ("x" in item && "y" in item) {
      updateBounds({ x: item.x, y: item.y }, 0, 0)
    } else if ("route" in item) {
      updateTraceBounds(item.route)
    }
  }

  const padding = 1 // Reduced padding for tighter boundary
  const circuitWidth = maxX - minX + 2 * padding
  const circuitHeight = maxY - minY + 2 * padding

  const svgWidth = 800
  const svgHeight = 600
  const paths: PointObjectNotation[][] = []
  for (const item of soup) {
    if ("route" in item && item.route !== undefined) {
      paths.push(item.route as PointObjectNotation[])
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

  const svgObjects = soup
    .sort(
      (a, b) =>
        (OBJECT_ORDER.indexOf(b.type) ?? 9999) -
        (OBJECT_ORDER.indexOf(a.type) ?? 9999),
    )
    .flatMap((item) => createSvgObjects(item, transform))

  let strokeWidth = String(0.05 * scaleFactor)

  for (const element of soup) {
    if ("stroke_width" in element) {
      strokeWidth = String(scaleFactor * element.stroke_width)
      break
    }
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
            value: `
              .pcb-board { fill: #000; }
              .pcb-trace { fill: none; }
              .pcb-hole-outer { fill: rgb(200, 52, 52); }
              .pcb-hole-inner { fill: rgb(255, 38, 226); }
              .pcb-pad { }
              .pcb-boundary { fill: none; stroke: #fff; stroke-width: 0.3; }
              .pcb-silkscreen { fill: none; }
              .pcb-silkscreen-top { stroke: #f2eda1; }
              .pcb-silkscreen-bottom { stroke: #f2eda1; }
              .pcb-silkscreen-text { fill: #f2eda1; }
            `,
          },
        ],
      },
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-board",
          x: "0",
          y: "0",
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

  function updateTraceBounds(route: any[]) {
    for (const point of route) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }
  }
}

function createSvgObjects(elm: AnySoupElement, transform: Matrix): SvgObject[] {
  switch (elm.type) {
    case "pcb_component":
      return [createSvgObjectsFromPcbComponent(elm, transform)].filter(Boolean)
    case "pcb_trace":
      return createSvgObjectsFromPcbTrace(elm, transform)
    case "pcb_plated_hole":
      return [createSvgObjectsFromPcbHole(elm, transform)].filter(Boolean)
    case "pcb_smtpad":
      return createSvgObjectsFromSmtPad(elm, transform)
    case "pcb_silkscreen_text":
      return createSvgObjectsFromPcbSilkscreenText(elm, transform)
    case "pcb_fabrication_note_path":
      return createSvgObjectsFromPcbFabricationNotePath(elm, transform)
    case "pcb_fabrication_note_text":
      return createSvgObjectsFromPcbFabricationNoteText(elm, transform)
    case "pcb_silkscreen_path":
      return createSvgObjectsFromPcbSilkscreenPath(elm, transform)
    default:
      return []
  }
}

function createSvgObjectsFromPcbComponent(component: any, transform: any): any {
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
      x: x.toString(),
      y: y.toString(),
      width: width.toString(),
      height: height.toString(),
    },
  }
}

export { circuitJsonToPcbSvg }
