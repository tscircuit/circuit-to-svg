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
  let localPinNumberTextX = schPort.center.x
  let localPinNumberTextY = schPort.center.y
  let dominantBaseline = "auto"
  let textAnchor = "middle"

  switch (schPort.side_of_component) {
    case "top":
      // For top ports, stay at the same X but offset Y upward
      localPinNumberTextY = schPort.center.y - pinNumberOffset // Move above the circle
      localPinNumberTextX = schPort.center.x // Stay aligned with port
      dominantBaseline = "middle"
      break
    case "bottom":
      // For bottom ports, stay at the same X but offset Y downward
      localPinNumberTextY = schPort.center.y + pinNumberOffset
      localPinNumberTextX = schPort.center.x
      dominantBaseline = "middle"
      textAnchor = "left"
      break
    case "left":
      // For left ports, stay at the same Y but offset X
      localPinNumberTextX = schPort.center.x - pinNumberOffset
      localPinNumberTextY = schPort.center.y + pinNumberOffset / 4
      dominantBaseline = "auto"
      break
    case "right":
      // For right ports, stay at the same Y but offset X
      localPinNumberTextX = schPort.center.x + pinNumberOffset
      localPinNumberTextY = schPort.center.y + pinNumberOffset / 4
      dominantBaseline = "auto"
      break
  }

  const realPinNumberPos = {
    x: schPort.center.x,
    y: schPort.center.y,
  }

  if (!schPort.side_of_component) return []
  const vecToEdge = getUnitVectorFromOutsideToEdge(schPort.side_of_component)
  console.log(schPort.pin_number, schPort.side_of_component, vecToEdge)

  const realPinEdgeDistance = 0.2

  // Move the pin number halfway to the edge of the box component so it sits
  // between the edge and the port, exactly in the middle
  realPinNumberPos.x += (vecToEdge.x * realPinEdgeDistance) / 2
  realPinNumberPos.y += (vecToEdge.y * realPinEdgeDistance) / 2

  // Transform the pin position from local to global coordinates
  const screenPinNumberTextPos = applyToPoint(transform, realPinNumberPos)
  // Move the pin number text up a bit so it doesn't hit the port line
  screenPinNumberTextPos.y -= 4 //px

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
      "dominant-baseline": dominantBaseline,
      "font-size": "11px",
      transform:
        schPort.side_of_component === "top" ||
        schPort.side_of_component === "bottom"
          ? `rotate(90deg, ${screenPinNumberTextPos.x}, ${screenPinNumberTextPos.y})`
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
