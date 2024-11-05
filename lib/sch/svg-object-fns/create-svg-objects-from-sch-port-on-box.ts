import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint, type Matrix } from "transformation-matrix"
import { su } from "@tscircuit/soup-util"
import { createSvgObjectsForSchPortBoxLine } from "./create-svg-objects-for-sch-port-box-line"
import { createSvgObjectsForSchPortPinNumberText } from "./create-svg-objects-for-sch-port-pin-number-text"

export const createSvgObjectsFromSchPortOnBox = (params: {
  schPort: SchematicPort
  schComponent: SchematicComponent
  transform: Matrix
  circuitJson: AnyCircuitElement[]
}): SvgObject[] => {
  const svgObjects: SvgObject[] = []
  const { schPort, schComponent, transform, circuitJson } = params

  svgObjects.push(...createSvgObjectsForSchPortBoxLine(params))
  svgObjects.push(...createSvgObjectsForSchPortPinNumberText(params))

  // // Transform port position for texts
  // const [portEndX, portEndY] = applyToPoint(transform, [
  //   schComponent.center.x + pinLineEndX,
  //   schComponent.center.y + pinLineEndY,
  // ])

  // // Add port label
  // if (
  //   schComponent.port_labels &&
  //   `pin${pinNumber}` in schComponent.port_labels
  // ) {
  //   const labelText = schComponent.port_labels[`pin${pinNumber}`]!
  //   let labelX = portEndX
  //   let labelY = portEndY
  //   let textAnchor = "middle"
  //   let rotation = 0
  //   const labelOffset = 0.1 // * componentScale

  //   switch (schPort.side_of_component) {
  //     case "left":
  //       labelX += labelOffset
  //       textAnchor = "start"
  //       break
  //     case "right":
  //       labelX -= labelOffset
  //       textAnchor = "end"
  //       break
  //     case "top":
  //       // For top ports, rotate text 90 degrees clockwise
  //       labelY += labelOffset * 6 // Move label down inside the chip
  //       textAnchor = "start"
  //       rotation = -90 // Rotate clockwise
  //       break
  //     case "bottom":
  //       // For bottom ports, rotate text 90 degrees counterclockwise
  //       labelY -= labelOffset * 6 // Move label up inside the chip
  //       textAnchor = "end"
  //       rotation = -90 // Rotate counterclockwise
  //       break
  //   }

  //   svgObjects.push({
  //     name: "text",
  //     type: "element",
  //     attributes: {
  //       class: "port-label",
  //       x: labelX.toString(),
  //       y: labelY.toString(),
  //       "text-anchor": textAnchor,
  //       "dominant-baseline": "middle",
  //       "font-size": "14px", // (0.2 * componentScale).toString(),
  //       transform: rotation ? `rotate(${rotation}, ${labelX}, ${labelY})` : "",
  //     },
  //     children: [
  //       {
  //         type: "text",
  //         value: labelText,
  //         name: "",
  //         attributes: {},
  //         children: [],
  //       },
  //     ],
  //     value: "",
  //   })
  // }

  // // Add pin number text
  // const pinNumberOffset = 0.2
  // let localPinNumberTextX = schPort.center.x
  // let localPinNumberTextY = schPort.center.y
  // let dominantBaseline = "auto"

  // switch (schPort.side_of_component) {
  //   case "top":
  //     // For top ports, stay at the same X but offset Y upward
  //     localPinNumberTextY = schPort.center.y - pinNumberOffset // Move above the circle
  //     localPinNumberTextX = schPort.center.x // Stay aligned with port
  //     dominantBaseline = "auto"
  //     break
  //   case "bottom":
  //     // For bottom ports, stay at the same X but offset Y downward
  //     localPinNumberTextY = schPort.center.y + pinNumberOffset
  //     localPinNumberTextX = schPort.center.x
  //     dominantBaseline = "hanging"
  //     break
  //   case "left":
  //     // For left ports, stay at the same Y but offset X
  //     localPinNumberTextX = schPort.center.x - pinNumberOffset
  //     localPinNumberTextY = schPort.center.y + pinNumberOffset / 4
  //     dominantBaseline = "auto"
  //     break
  //   case "right":
  //     // For right ports, stay at the same Y but offset X
  //     localPinNumberTextX = schPort.center.x + pinNumberOffset
  //     localPinNumberTextY = schPort.center.y + pinNumberOffset / 4
  //     dominantBaseline = "auto"
  //     break
  // }

  // // Transform the pin position from local to global coordinates
  // const [screenPinNumberTextX, screenPinNumberTextY] = applyToPoint(transform, [
  //   localPinNumberTextX,
  //   localPinNumberTextY,
  // ])

  // svgObjects.push({
  //   name: "text",
  //   type: "element",
  //   attributes: {
  //     class: "pin-number",
  //     x: screenPinNumberTextX.toString(),
  //     y: screenPinNumberTextY.toString(),
  //     "text-anchor": "middle",
  //     "dominant-baseline": dominantBaseline,
  //     "font-size": "14px",
  //   },
  //   children: [
  //     {
  //       type: "text",
  //       value: pinNumber?.toString() || "",
  //       name: "",
  //       attributes: {},
  //       children: [],
  //     },
  //   ],
  //   value: "",
  // })

  return svgObjects
}
