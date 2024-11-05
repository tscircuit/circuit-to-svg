import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint, type Matrix } from "transformation-matrix"
import { su } from "@tscircuit/soup-util"

const PIN_CIRCLE_RADIUS_PX = 3

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
  const screenLineEnd = applyToPoint(transform, schPort.center)
  switch (schPort.side_of_component) {
    case "left":
      screenLineEnd.x += PIN_CIRCLE_RADIUS_PX
      break
    case "right":
      screenLineEnd.x -= PIN_CIRCLE_RADIUS_PX
      break
    case "top":
      screenLineEnd.y += PIN_CIRCLE_RADIUS_PX
      break
    case "bottom":
      screenLineEnd.y -= PIN_CIRCLE_RADIUS_PX
      break
  }

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
      "stroke-width": "2px",
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
      r: PIN_CIRCLE_RADIUS_PX.toString(),
      "stroke-width": "2px",
    },
    value: "",
    children: [],
  })

  return svgObjects
}
