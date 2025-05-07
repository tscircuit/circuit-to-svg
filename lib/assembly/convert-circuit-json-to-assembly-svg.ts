import type { Point, AnyCircuitElement } from "circuit-json"
import { type INode as SvgObject, stringify } from "svgson"
import { su } from "@tscircuit/soup-util"
import {
  type Matrix,
  applyToPoint,
  compose,
  scale,
  translate,
} from "transformation-matrix"
import { createSvgObjectsFromAssemblyBoard } from "./svg-object-fns/create-svg-objects-from-assembly-board"
import { createSvgObjectsFromAssemblyComponent } from "./svg-object-fns/create-svg-objects-from-assembly-component"

const OBJECT_ORDER: AnyCircuitElement["type"][] = ["pcb_board", "pcb_component"]

interface Options {
  width?: number
  height?: number
}

export function convertCircuitJsonToAssemblySvg(
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
      const center = item.center
      const width = item.width || 0
      const height = item.height || 0
      minX = Math.min(minX, center.x - width / 2)
      minY = Math.min(minY, center.y - height / 2)
      maxX = Math.max(maxX, center.x + width / 2)
      maxY = Math.max(maxY, center.y + height / 2)
    }
  }

  const padding = 1
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
    scale(scaleFactor, -scaleFactor), // Flip in y-direction
  )

  const svgObjects = soup
    .sort(
      (a, b) =>
        (OBJECT_ORDER.indexOf(b.type) ?? 9999) -
        (OBJECT_ORDER.indexOf(a.type) ?? 9999),
    )
    .flatMap((item) => createSvgObjects(item, transform, soup))

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
              .assembly-component { 
                fill: #fff; 
                stroke: #000; 
              }
              .assembly-board { 
                fill: #f2f2f2; 
                stroke: rgb(0,0,0); 
                stroke-opacity: 0.8;
              }
              .assembly-component-label { 
                fill: #000; 
                font-family: Arial, serif;
                font-weight: bold;
                dominant-baseline: middle;
                text-anchor: middle;
              }
              .assembly-boundary { 
                fill: none; 
                stroke: #fff;
                stroke-width: 0.2; 
              }
            `,
            name: "",
            attributes: {},
            children: [],
          },
        ],
        value: "",
        attributes: {},
      },
      {
        name: "rect",
        type: "element",
        attributes: {
          fill: "#fff",
          x: "0",
          y: "0",
          width: svgWidth.toString(),
          height: svgHeight.toString(),
        },
        value: "",
        children: [],
      },
      createSvgObjectFromAssemblyBoundary(transform, minX, minY, maxX, maxY),
      ...svgObjects,
    ].filter((child): child is SvgObject => child !== null),
  }

  return stringify(svgObject)
}

function createSvgObjects(
  elm: AnyCircuitElement,
  transform: Matrix,
  soup: AnyCircuitElement[],
): SvgObject[] {
  const sourceComponents = su(soup).source_component.list()

  switch (elm.type) {
    case "pcb_board":
      return createSvgObjectsFromAssemblyBoard(elm, transform)

    case "pcb_component": {
      const sourceComponent = sourceComponents.find(
        (item) => item.source_component_id === elm.source_component_id,
      )
      const ports = su(soup)
        .pcb_port.list()
        .filter((port) => port.pcb_component_id === elm.pcb_component_id)
      const firstPort = ports[0]

      // Proceed only if both sourceComponent and firstPort are found
      if (sourceComponent && firstPort) {
        const arePinsInterchangeable = sourceComponent.are_pins_interchangeable
        const obj = createSvgObjectsFromAssemblyComponent(
          {
            elm,
            portPosition: { x: firstPort.x, y: firstPort.y },
            name: sourceComponent.name,
            arePinsInterchangeable,
          },
          { transform },
        )
        return obj ? [obj] : []
      }

      return []
    }

    default:
      return []
  }
}

function createSvgObjectFromAssemblyBoundary(
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
      class: "assembly-boundary",
      x: x.toString(),
      y: y.toString(),
      width: width.toString(),
      height: height.toString(),
    },
  }
}

export default convertCircuitJsonToAssemblySvg
