import { su } from "@tscircuit/soup-util"
import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
  SourceSimpleChip,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { colorMap } from "lib/utils/colors"
import { getSvg, symbols } from "schematic-symbols"
import { parseSync } from "svgson"
import { applyToPoint, type Matrix } from "transformation-matrix"
import { createSvgObjectsFromSchematicComponentWithSymbol } from "./create-svg-objects-from-sch-component-with-symbol"

export const createSvgObjectsFromSchematicComponentWithBox = ({
  component: schComponent,
  transform,
  circuitJson,
}: {
  component: SchematicComponent
  transform: Matrix
  circuitJson: AnyCircuitElement[]
}): SvgObject[] => {
  const srcComponent = su(circuitJson as any).source_component.get(
    schComponent.source_component_id,
  )
  const svgObjects: SvgObject[] = []

  const componentScreenCenter = applyToPoint(transform, schComponent.center)
  const componentScreenSize = applyToPoint(transform, {
    x: schComponent.size.width,
    y: schComponent.size.height,
  })

  // Add basic rectangle for component body
  svgObjects.push({
    name: "rect",
    type: "element",
    value: "",
    attributes: {
      class: "component chip",
      x: (componentScreenCenter.x - componentScreenSize.x / 2).toString(),
      y: (componentScreenCenter.y - componentScreenSize.y / 2).toString(),
      width: componentScreenSize.x.toString(),
      height: componentScreenSize.y.toString(),
      "stroke-width": "0.02",
    },
    children: [],
  })

  console.log(schComponent.center)
  console.log(schComponent.size)
  console.log(svgObjects[0])

  // // Add manufacturer number and component name text
  // if (manufacturerNumber) {
  //   // Calculate position for top center of component
  //   const [textX, textY] = applyToPoint(transform, [
  //     schComponent.center.x, // Center X position
  //     schComponent.center.y - schComponent.size.height / 2 - 0.5, // Above the component top edge
  //   ])

  //   const labelOffset = componentScale * 0.4

  //   textChildren.push({
  //     name: "text",
  //     type: "element",
  //     attributes: {
  //       class: "component-name",
  //       x: textX.toString(),
  //       y: textY.toString(),
  //       "text-anchor": "right", // Center align text
  //       "dominant-baseline": "auto",
  //       "font-size": "0.2",
  //     },
  //     children: [
  //       {
  //         type: "text",
  //         value: manufacturerNumber,
  //         name: "",
  //         attributes: {},
  //         children: [],
  //       },
  //     ],
  //     value: "",
  //   })

  //   // Component name below manufacturer number
  //   textChildren.push({
  //     name: "text",
  //     type: "element",
  //     attributes: {
  //       class: "component-name",
  //       x: textX.toString(),
  //       y: (textY - labelOffset).toString(),
  //       "text-anchor": "right", // Center align text
  //       "dominant-baseline": "auto",
  //       "font-size": "0.2",
  //     },
  //     children: [
  //       {
  //         type: "text",
  //         value: componentName || "",
  //         name: "",
  //         attributes: {},
  //         children: [],
  //       },
  //     ],
  //     value: "",
  //   })
  // }

  // // Process ports
  const schematicPorts = su(circuitJson as any).schematic_port.list({
    schematic_component_id: schComponent.schematic_component_id,
  }) as SchematicPort[]
  const pinLineLength = 0.2
  const pinCircleRadius = 0.05

  for (const schPort of schematicPorts) {
    const { x: portX, y: portY } = schPort.center
    const srcPort = su(circuitJson as any).source_port.get(
      schPort.source_port_id,
    )
    const pinNumber = srcPort?.pin_number
    const pinLineStartX = portX - schComponent.center.x
    const pinLineStartY = portY - schComponent.center.y

    let pinLineEndX = pinLineStartX
    let pinLineEndY = pinLineStartY

    switch (schPort.side_of_component) {
      case "left":
        pinLineEndX = pinLineStartX + pinLineLength
        break
      case "right":
        pinLineEndX = pinLineStartX - pinLineLength
        break
      case "top":
        pinLineEndY = pinLineStartY + pinLineLength
        break
      case "bottom":
        pinLineEndY = pinLineStartY - pinLineLength
        break
    }

    // Add port line
    svgObjects.push({
      name: "line",
      type: "element",
      attributes: {
        class: "component-pin",
        x1: pinLineStartX.toString(),
        y1: pinLineStartY.toString(),
        x2: pinLineEndX.toString(),
        y2: pinLineEndY.toString(),
        "stroke-width": "0.02",
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
        cx: pinLineStartX.toString(),
        cy: pinLineStartY.toString(),
        r: pinCircleRadius.toString(),
        "stroke-width": "0.02",
      },
      value: "",
      children: [],
    })

    // Transform port position for texts
    const [portEndX, portEndY] = applyToPoint(transform, [
      schComponent.center.x + pinLineEndX,
      schComponent.center.y + pinLineEndY,
    ])

    // Add port label
    if (
      schComponent.port_labels &&
      `pin${pinNumber}` in schComponent.port_labels
    ) {
      const labelText = schComponent.port_labels[`pin${pinNumber}`]!
      let labelX = portEndX
      let labelY = portEndY
      let textAnchor = "middle"
      let rotation = 0
      const labelOffset = 0.1 // * componentScale

      switch (schPort.side_of_component) {
        case "left":
          labelX += labelOffset
          textAnchor = "start"
          break
        case "right":
          labelX -= labelOffset
          textAnchor = "end"
          break
        case "top":
          // For top ports, rotate text 90 degrees clockwise
          labelY += labelOffset * 6 // Move label down inside the chip
          textAnchor = "start"
          rotation = -90 // Rotate clockwise
          break
        case "bottom":
          // For bottom ports, rotate text 90 degrees counterclockwise
          labelY -= labelOffset * 6 // Move label up inside the chip
          textAnchor = "end"
          rotation = -90 // Rotate counterclockwise
          break
      }

      svgObjects.push({
        name: "text",
        type: "element",
        attributes: {
          class: "port-label",
          x: labelX.toString(),
          y: labelY.toString(),
          "text-anchor": textAnchor,
          "dominant-baseline": "middle",
          "font-size": "14px", // (0.2 * componentScale).toString(),
          transform: rotation
            ? `rotate(${rotation}, ${labelX}, ${labelY})`
            : "",
        },
        children: [
          {
            type: "text",
            value: labelText,
            name: "",
            attributes: {},
            children: [],
          },
        ],
        value: "",
      })
    }

    // Add pin number text
    const pinNumberOffset = 0.2
    let localPinNumberTextX = portX
    let localPinNumberTextY = portY
    let dominantBaseline = "auto"

    switch (schPort.side_of_component) {
      case "top":
        // For top ports, stay at the same X but offset Y upward
        localPinNumberTextY = portY - pinNumberOffset // Move above the circle
        localPinNumberTextX = portX // Stay aligned with port
        dominantBaseline = "auto"
        break
      case "bottom":
        // For bottom ports, stay at the same X but offset Y downward
        localPinNumberTextY = portY + pinNumberOffset
        localPinNumberTextX = portX
        dominantBaseline = "hanging"
        break
      case "left":
        // For left ports, stay at the same Y but offset X
        localPinNumberTextX = portX - pinNumberOffset
        localPinNumberTextY = portY + pinNumberOffset / 4
        dominantBaseline = "auto"
        break
      case "right":
        // For right ports, stay at the same Y but offset X
        localPinNumberTextX = portX + pinNumberOffset
        localPinNumberTextY = portY + pinNumberOffset / 4
        dominantBaseline = "auto"
        break
    }

    // Transform the pin position from local to global coordinates
    const [screenPinNumberTextX, screenPinNumberTextY] = applyToPoint(
      transform,
      [localPinNumberTextX, localPinNumberTextY],
    )

    svgObjects.push({
      name: "text",
      type: "element",
      attributes: {
        class: "pin-number",
        x: screenPinNumberTextX.toString(),
        y: screenPinNumberTextY.toString(),
        "text-anchor": "middle",
        "dominant-baseline": dominantBaseline,
        "font-size": "14px",
      },
      children: [
        {
          type: "text",
          value: pinNumber?.toString() || "",
          name: "",
          attributes: {},
          children: [],
        },
      ],
      value: "",
    })
  }

  // // Create component group with scaling
  // const componentGroup: SvgObject = {
  //   name: "g",
  //   value: "",
  //   type: "element",
  //   attributes: {},
  //   children: svgObjects,
  // }

  // // Create text group without scaling
  // const textGroup: SvgObject = {
  //   name: "g",
  //   value: "",
  //   type: "element",
  //   attributes: {},
  //   children: textChildren,
  // }

  // return [componentGroup, textGroup]
  return svgObjects
}
