import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint, type Matrix } from "transformation-matrix"
import { su } from "@tscircuit/soup-util"
import { getSchStrokeSize } from "lib/utils/get-sch-stroke-size"

const PIN_CIRCLE_RADIUS_MM = 0.02

/**
 * The schematic port box line is the line and circle that goes from the edge
 * of the component box to the port.
 */
export const createSvgObjectsForSchPortBoxLine = ({
  schPort,
  schComponent,
  transform,
  circuitJson,
}: {
  schPort: SchematicPort
  schComponent: SchematicComponent
  transform: Matrix
  circuitJson: AnyCircuitElement[]
}): SvgObject[] => {
  const svgObjects: SvgObject[] = []

  const srcPort = su(circuitJson as any).source_port.get(schPort.source_port_id)

  const realEdgePos = {
    x: schPort.center.x,
    y: schPort.center.y,
  }

  // schPort.distance_from_component_edge is currently calculated incorrectly
  // in core
  const realPinLineLength = schPort.distance_from_component_edge ?? 0.4

  switch (schPort.side_of_component) {
    case "left":
      realEdgePos.x += realPinLineLength
      break
    case "right":
      realEdgePos.x -= realPinLineLength
      break
    case "top":
      realEdgePos.y -= realPinLineLength
      break
    case "bottom":
      realEdgePos.y += realPinLineLength
      break
  }

  const screenSchPortPos = applyToPoint(transform, schPort.center)
  const screenRealEdgePos = applyToPoint(transform, realEdgePos)

  // Subtract the pin circle radius from the pin line length to get the end
  const realLineEnd = { ...schPort.center }

  switch (schPort.side_of_component) {
    case "left":
      realLineEnd.x += PIN_CIRCLE_RADIUS_MM
      break
    case "right":
      realLineEnd.x -= PIN_CIRCLE_RADIUS_MM
      break
    case "top":
      realLineEnd.y += PIN_CIRCLE_RADIUS_MM
      break
    case "bottom":
      realLineEnd.y -= PIN_CIRCLE_RADIUS_MM
      break
  }
  const screenLineEnd = applyToPoint(transform, realLineEnd)

  // Add port line
  svgObjects.push({
    name: "line",
    type: "element",
    attributes: {
      class: "component-pin",
      x1: screenLineEnd.x.toString(),
      y1: screenLineEnd.y.toString(),
      x2: screenRealEdgePos.x.toString(),
      y2: screenRealEdgePos.y.toString(),
      "stroke-width": `${getSchStrokeSize(transform)}px`,
    },
    value: "",
    children: [],
  })

  // Add port circle
  svgObjects.push({
    name: "circle",
    type: "element",
    attributes: {
      class: "component-pin",
      cx: screenSchPortPos.x.toString(),
      cy: screenSchPortPos.y.toString(),
      r: (Math.abs(transform.a) * PIN_CIRCLE_RADIUS_MM).toString(),
      "stroke-width": `${getSchStrokeSize(transform)}px`,
    },
    value: "",
    children: [],
  })

  return svgObjects
}
