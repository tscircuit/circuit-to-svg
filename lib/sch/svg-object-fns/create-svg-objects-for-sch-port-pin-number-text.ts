import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { colorMap } from "lib/utils/colors"
import { getUnitVectorFromOutsideToEdge } from "lib/utils/get-unit-vector-from-outside-to-edge"
import { applyToPoint, type Matrix } from "transformation-matrix"

export const createSvgObjectsForSchPortPinNumberText = (params: {
  schPort: SchematicPort
  schComponent: SchematicComponent
  transform: Matrix
  circuitJson: AnyCircuitElement[]
}): SvgObject[] => {
  const svgObjects: SvgObject[] = []
  const { schPort, schComponent, transform, circuitJson } = params

  const pinNumberOffset = 0.2

  const realPinNumberPos = {
    x: schPort.center.x,
    y: schPort.center.y,
  }

  if (!schPort.side_of_component) return []
  const vecToEdge = getUnitVectorFromOutsideToEdge(schPort.side_of_component)

  const realPinEdgeDistance = schPort.distance_from_component_edge ?? 0.4

  // Move the pin number halfway to the edge of the box component so it sits
  // between the edge and the port, exactly in the middle
  realPinNumberPos.x += (vecToEdge.x * realPinEdgeDistance) / 2
  realPinNumberPos.y += (vecToEdge.y * realPinEdgeDistance) / 2

  // Transform the pin position from local to global coordinates
  const screenPinNumberTextPos = applyToPoint(transform, realPinNumberPos)

  if (
    schPort.side_of_component === "top" ||
    schPort.side_of_component === "bottom"
  ) {
    // Move the pin number text to the left a bit so it doesn't hit the port line
    screenPinNumberTextPos.x -= 2 //px
  } else {
    // Move the pin number text up a bit so it doesn't hit the port line
    screenPinNumberTextPos.y -= 2 //px
  }

  svgObjects.push({
    name: "text",
    type: "element",
    attributes: {
      class: "pin-number",
      x: screenPinNumberTextPos.x.toString(),
      y: screenPinNumberTextPos.y.toString(),
      style: "font-family: sans-serif;",
      fill: colorMap.schematic.pin_number,
      "text-anchor": "middle",
      "dominant-baseline": "auto",
      "font-size": "11px",
      transform:
        schPort.side_of_component === "top" ||
        schPort.side_of_component === "bottom"
          ? `rotate(-90 ${screenPinNumberTextPos.x} ${screenPinNumberTextPos.y})`
          : "",
    },
    children: [
      {
        type: "text",
        value: schPort.pin_number?.toString() || "",
        name: "",
        attributes: {},
        children: [],
      },
    ],
    value: "",
  })

  return svgObjects
}
