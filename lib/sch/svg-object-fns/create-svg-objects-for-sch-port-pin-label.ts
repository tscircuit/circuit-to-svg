import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { colorMap } from "lib/utils/colors"
import { getSchScreenFontSize } from "lib/utils/get-sch-font-size"
import { getUnitVectorFromOutsideToEdge } from "lib/utils/get-unit-vector-from-outside-to-edge"
import { applyToPoint, type Matrix } from "transformation-matrix"

const LABEL_DIST_FROM_EDGE_MM = 0.1

export const createSvgObjectsForSchPortPinLabel = (params: {
  schPort: SchematicPort
  schComponent: SchematicComponent
  transform: Matrix
  circuitJson: AnyCircuitElement[]
}): SvgObject[] => {
  const svgObjects: SvgObject[] = []
  const { schPort, schComponent, transform, circuitJson } = params

  const realPinNumberPos = {
    x: schPort.center.x,
    y: schPort.center.y,
  }

  if (!schPort.side_of_component) return []
  const vecToEdge = getUnitVectorFromOutsideToEdge(schPort.side_of_component)

  const realPinEdgeDistance = schPort.distance_from_component_edge ?? 0.4

  // Move the pin number halfway to the edge of the box component so it sits
  // between the edge and the port, exactly in the middle
  realPinNumberPos.x +=
    vecToEdge.x * (realPinEdgeDistance + LABEL_DIST_FROM_EDGE_MM)
  realPinNumberPos.y +=
    vecToEdge.y * (realPinEdgeDistance + LABEL_DIST_FROM_EDGE_MM)

  // Transform the pin position from local to global coordinates
  const screenPinNumberTextPos = applyToPoint(transform, realPinNumberPos)

  const label =
    schPort.display_pin_label ??
    schComponent.port_labels?.[`${schPort.pin_number}`]

  if (!label) return []

  const isNegated = label.startsWith("N_")
  const displayLabel = isNegated ? label.slice(2) : label

  svgObjects.push({
    name: "text",
    type: "element",
    attributes: {
      class: "pin-number",
      x: screenPinNumberTextPos.x.toString(),
      y: screenPinNumberTextPos.y.toString(),
      style: `font-family: sans-serif;${isNegated ? " text-decoration: overline;" : ""}`,
      fill: colorMap.schematic.pin_number,
      "text-anchor":
        schPort.side_of_component === "left" ||
        schPort.side_of_component === "bottom"
          ? "start"
          : "end",
      "dominant-baseline": "middle",
      "font-size": `${getSchScreenFontSize(transform, "pin_number")}px`,
      transform:
        schPort.side_of_component === "top" ||
        schPort.side_of_component === "bottom"
          ? `rotate(-90 ${screenPinNumberTextPos.x} ${screenPinNumberTextPos.y})`
          : "",
    },
    children: [
      {
        type: "text",
        value: displayLabel || "",
        name: "",
        attributes: {},
        children: [],
      },
    ],
    value: "",
  })

  return svgObjects
}
