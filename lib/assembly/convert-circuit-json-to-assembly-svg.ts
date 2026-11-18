import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, Point } from "circuit-json"
import { stringifySvg } from "lib/utils/stringify-svg"
import type { INode as SvgObject } from "svgson"
import {
  type Matrix,
  applyToPoint,
  compose,
  scale,
  translate,
} from "transformation-matrix"
import { CIRCUIT_TO_SVG_VERSION } from "../package-version"
import { createErrorTextOverlay } from "../utils/create-error-text-overlay"
import { getSoftwareUsedString } from "../utils/get-software-used-string"
import { createSvgObjectsFromAssemblyBoard } from "./svg-object-fns/create-svg-objects-from-assembly-board"
import { createSvgObjectsFromAssemblyComponent } from "./svg-object-fns/create-svg-objects-from-assembly-component"
import { createSvgObjectsFromAssemblyHole } from "./svg-object-fns/create-svg-objects-from-assembly-hole"
import { createSvgObjectsFromAssemblyPlatedHole } from "./svg-object-fns/create-svg-objects-from-assembly-plated-hole"
import { createSvgObjectsFromAssemblySmtPad } from "./svg-object-fns/create-svg-objects-from-assembly-smt-pad"

const OBJECT_ORDER: AnyCircuitElement["type"][] = [
  "pcb_component",
  "pcb_smtpad",
  "pcb_hole",
  "pcb_plated_hole",
  "pcb_board",
]

interface Options {
  width?: number
  height?: number
  includeVersion?: boolean
  showErrorsInTextOverlay?: boolean
}

export interface AssemblySvgContext {
  transform: Matrix
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

  const ctx: AssemblySvgContext = { transform }

  const svgObjects = soup
    .sort(
      (a, b) =>
        (OBJECT_ORDER.indexOf(b.type) ?? 9999) -
        (OBJECT_ORDER.indexOf(a.type) ?? 9999),
    )
    .flatMap((item) => createSvgObjects(item, ctx, soup))

  const softwareUsedString = getSoftwareUsedString(soup)
  const version = CIRCUIT_TO_SVG_VERSION

  const children: SvgObject[] = [
    {
      name: "style",
      type: "element",
      children: [
        {
          type: "text",
          value: `
              .assembly-component { 
                fill: none; 
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
  ].filter((child): child is SvgObject => child !== null)

  if (options?.showErrorsInTextOverlay) {
    const errorOverlay = createErrorTextOverlay(soup)
    if (errorOverlay) {
      children.push(errorOverlay)
    }
  }

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
    children,
  }

  return stringifySvg(svgObject)
}

const PIN1_PORT_HINTS = new Set(["1", "pin1", "pin_1", "a1"])

function hasPin1Hint(hints?: readonly (string | number)[] | null): boolean {
  if (!hints) return false
  return hints.some((hint) =>
    PIN1_PORT_HINTS.has(String(hint).trim().toLowerCase()),
  )
}

function findPin1Port(
  ports: Array<{
    pcb_port_id: string
    source_port_id?: string
    x: number
    y: number
    port_hints?: string[]
  }>,
  soup: AnyCircuitElement[],
) {
  if (ports.length <= 1) return ports[0]

  const sourcePortsById = new Map(
    su(soup)
      .source_port.list()
      .map((sp) => [sp.source_port_id, sp]),
  )

  const byPinNumber = ports.find(
    (port) =>
      port.source_port_id !== undefined &&
      sourcePortsById.get(port.source_port_id)?.pin_number === 1,
  )
  if (byPinNumber) return byPinNumber

  const bySourceHint = ports.find((port) => {
    if (!port.source_port_id) return false
    const sp = sourcePortsById.get(port.source_port_id)
    if (!sp) return false
    return hasPin1Hint(sp.port_hints) || hasPin1Hint(sp.name ? [sp.name] : null)
  })
  if (bySourceHint) return bySourceHint

  const byPcbHint = ports.find((port) => {
    if (hasPin1Hint(port.port_hints)) return true
    for (const item of soup) {
      if (
        (item.type === "pcb_smtpad" || item.type === "pcb_plated_hole") &&
        item.pcb_port_id === port.pcb_port_id &&
        hasPin1Hint(item.port_hints)
      ) {
        return true
      }
    }
    return false
  })
  if (byPcbHint) return byPcbHint

  return ports[0]
}

function createSvgObjects(
  elm: AnyCircuitElement,
  ctx: AssemblySvgContext,
  soup: AnyCircuitElement[],
): SvgObject[] {
  const sourceComponents = su(soup).source_component.list()

  switch (elm.type) {
    case "pcb_board":
      return createSvgObjectsFromAssemblyBoard(elm, ctx.transform)

    case "pcb_component": {
      const sourceComponent = sourceComponents.find(
        (item) => item.source_component_id === elm.source_component_id,
      )
      const ports = su(soup)
        .pcb_port.list()
        .filter((port) => port.pcb_component_id === elm.pcb_component_id)
      const pin1Port = findPin1Port(ports, soup)

      // Proceed only if both sourceComponent and pin1Port are found
      if (sourceComponent && pin1Port) {
        const arePinsInterchangeable = sourceComponent.are_pins_interchangeable
        const obj = createSvgObjectsFromAssemblyComponent(
          {
            elm,
            portPosition: { x: pin1Port.x, y: pin1Port.y },
            name: sourceComponent.name,
            arePinsInterchangeable,
          },
          ctx,
        )
        return obj ? [obj] : []
      }

      return []
    }
    case "pcb_smtpad":
      return createSvgObjectsFromAssemblySmtPad(elm, ctx)
    case "pcb_hole":
      return createSvgObjectsFromAssemblyHole(elm, ctx)
    case "pcb_plated_hole":
      return createSvgObjectsFromAssemblyPlatedHole(elm, ctx)

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
