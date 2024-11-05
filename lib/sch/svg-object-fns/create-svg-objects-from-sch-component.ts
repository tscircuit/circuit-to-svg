import { su } from "@tscircuit/soup-util"
import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { colorMap } from "lib/utils/colors"
import { getSvg, symbols } from "schematic-symbols"
import { parseSync } from "svgson"
import { applyToPoint, type Matrix } from "transformation-matrix"

export function createSchematicComponent({
  component,
  transform,
  circuitJson,
}: {
  component: SchematicComponent
  transform: Matrix
  circuitJson: AnyCircuitElement[]
}): SvgObject[] {
  const { rotation, symbol_name: symbolName } = component
  const portLabels = component.port_labels
  const sourceComponentId = component.source_component_id
  const schematicComponentId = component.schematic_component_id

  // Transform the center point for the main component position
  const [transformedX, transformedY] = applyToPoint(transform, [
    component.center.x,
    component.center.y,
  ])

  const componentScale = Math.abs(transform.a)
  let componentChildren: SvgObject[] = []
  const textChildren: SvgObject[] = []

  // Find source component and get its properties
  const sourceComponent = circuitJson?.find(
    (item) =>
      item.type === "source_component" &&
      item.source_component_id === sourceComponentId,
  )
  const componentName =
    sourceComponent && "name" in sourceComponent ? sourceComponent.name : ""
  const manufacturerNumber =
    sourceComponent && "manufacturer_part_number" in sourceComponent
      ? sourceComponent.manufacturer_part_number
      : ""
  const resistance =
    sourceComponent && "resistance" in sourceComponent
      ? sourceComponent.resistance
      : ""
  const capacitance =
    sourceComponent && "capacitance" in sourceComponent
      ? sourceComponent.capacitance
      : ""

  if (symbolName) {
    const symbol = (symbols as any)[symbolName]
    const paths = symbol.primitives.filter((p: any) => p.type === "path")
    const updatedSymbol = {
      ...symbol,
      primitives: paths,
    }
    const svg = parseSync(
      getSvg(updatedSymbol, {
        width: component.size.width,
        height: component.size.height,
      }),
    )

    componentChildren = svg.children
      .filter(
        (child: any) =>
          child.name === "path" && child.attributes.fill !== "green",
      )
      .map((path: any) => {
        const currentStrokeWidth = Number.parseFloat(
          path.attributes["stroke-width"] || "0.02",
        )
        return {
          ...path,
          attributes: {
            ...path.attributes,
            stroke:
              path.attributes.stroke === "black"
                ? `${colorMap.schematic.component_outline}`
                : path.attributes.stroke,
            "stroke-width": currentStrokeWidth.toString(),
          },
        }
      })

    // Add resistance/capacitance text
    if (resistance || capacitance) {
      const [textX, textY] = applyToPoint(transform, [
        component.center.x,
        component.center.y - component.size.height / 2 - 0.2,
      ])

      const labelOffset = componentScale * 0.4
      textChildren.push({
        name: "text",
        type: "element",
        attributes: {
          class: "component-name",
          x: textX.toString(),
          y: textY.toString(),
          "text-anchor": "middle",
          "dominant-baseline": "auto",
          "font-size": "0.2",
        },
        children: [
          {
            type: "text",
            value: (resistance || capacitance || "").toString(),
            name: "",
            attributes: {},
            children: [],
          },
        ],
        value: "",
      })

      textChildren.push({
        name: "text",
        type: "element",
        attributes: {
          class: "component-name",
          x: textX.toString(),
          y: (textY - labelOffset).toString(),
          "text-anchor": "middle",
          "dominant-baseline": "auto",
          "font-size": "0.2",
        },
        children: [
          {
            type: "text",
            value: componentName || "",
            name: "",
            attributes: {},
            children: [],
          },
        ],
        value: "",
      })
    }
  } else {
    // Add basic rectangle for component body
    componentChildren.push({
      name: "rect",
      type: "element",
      value: "",
      attributes: {
        class: "component chip",
        x: (-component.size.width / 2).toString(),
        y: (-component.size.height / 2).toString(),
        width: component.size.width.toString(),
        height: component.size.height.toString(),
        "stroke-width": "0.02",
      },
      children: [],
    })

    // Add manufacturer number and component name text
    if (manufacturerNumber) {
      // Calculate position for top center of component
      const [textX, textY] = applyToPoint(transform, [
        component.center.x, // Center X position
        component.center.y - component.size.height / 2 - 0.5, // Above the component top edge
      ])

      const labelOffset = componentScale * 0.4

      textChildren.push({
        name: "text",
        type: "element",
        attributes: {
          class: "component-name",
          x: textX.toString(),
          y: textY.toString(),
          "text-anchor": "right", // Center align text
          "dominant-baseline": "auto",
          "font-size": "0.2",
        },
        children: [
          {
            type: "text",
            value: manufacturerNumber,
            name: "",
            attributes: {},
            children: [],
          },
        ],
        value: "",
      })

      // Component name below manufacturer number
      textChildren.push({
        name: "text",
        type: "element",
        attributes: {
          class: "component-name",
          x: textX.toString(),
          y: (textY - labelOffset).toString(),
          "text-anchor": "right", // Center align text
          "dominant-baseline": "auto",
          "font-size": "0.2",
        },
        children: [
          {
            type: "text",
            value: componentName || "",
            name: "",
            attributes: {},
            children: [],
          },
        ],
        value: "",
      })
    }

    // Process ports
    const schematicPorts = su(circuitJson as any).schematic_port.list({
      schematic_component_id: schematicComponentId,
    }) as SchematicPort[]
    const pinLineLength = 0.2
    const pinCircleRadius = 0.05

    for (const schPort of schematicPorts) {
      const { x: portX, y: portY } = schPort.center
      const srcPort = su(circuitJson as any).source_port.get(
        schPort.source_port_id,
      )
      const pinNumber = srcPort?.pin_number
      const pinLineStartX = portX - component.center.x
      const pinLineStartY = portY - component.center.y

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
      componentChildren.push({
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
      componentChildren.push({
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
        component.center.x + pinLineEndX,
        component.center.y + pinLineEndY,
      ])

      // Add port label
      const labelKey = `pin${pinNumber}`
      if (portLabels && labelKey in portLabels) {
        const labelText = portLabels[labelKey]!
        let labelX = portEndX
        let labelY = portEndY
        let textAnchor = "middle"
        let rotation = 0
        const labelOffset = 0.1 * componentScale

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

        textChildren.push({
          name: "text",
          type: "element",
          attributes: {
            class: "port-label",
            x: labelX.toString(),
            y: labelY.toString(),
            "text-anchor": textAnchor,
            "dominant-baseline": "middle",
            "font-size": (0.2 * componentScale).toString(),
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

      textChildren.push({
        name: "text",
        type: "element",
        attributes: {
          class: "pin-number",
          x: screenPinNumberTextX.toString(),
          y: screenPinNumberTextY.toString(),
          "text-anchor": "middle",
          "dominant-baseline": dominantBaseline,
          "font-size": (0.15 * componentScale).toString(),
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
  }

  // Create component group with scaling
  const componentGroup: SvgObject = {
    name: "g",
    value: "",
    type: "element",
    attributes: {
      // DEPRECATE: Never ever use relative coordinates! This should be removed!
      transform: `translate(${transformedX}, ${transformedY}) rotate(${
        (rotation * 180) / Math.PI
      }) scale(${componentScale})`,
    },
    children: componentChildren,
  }

  // Create text group without scaling
  const textGroup: SvgObject = {
    name: "g",
    value: "",
    type: "element",
    attributes: {},
    children: textChildren,
  }

  return [componentGroup, textGroup]
}
