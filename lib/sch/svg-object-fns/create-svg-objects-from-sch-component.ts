import { su } from "@tscircuit/soup-util"
import type { AnyCircuitElement, SchematicComponent } from "circuit-json"
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
  const { center, size, rotation, symbol_name: symbolName } = component
  const portLabels = component.port_labels
  const sourceComponentId = component.source_component_id
  const schematicComponentId = component.schematic_component_id

  // Transform the center point for the main component position
  const [transformedX, transformedY] = applyToPoint(transform, [
    center.x,
    center.y,
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
        width: size.width,
        height: size.height,
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
        center.x,
        center.y - size.height / 2 - 0.2,
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
        x: (-size.width / 2).toString(),
        y: (-size.height / 2).toString(),
        width: size.width.toString(),
        height: size.height.toString(),
        "stroke-width": "0.02",
      },
      children: [],
    })

    // Add manufacturer number and component name text
    if (manufacturerNumber) {
      // Calculate position for top center of component
      const [textX, textY] = applyToPoint(transform, [
        center.x, // Center X position
        center.y - size.height / 2 - 0.5, // Above the component top edge
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
    })
    const portLength = 0.2
    const circleRadius = 0.05

    for (const schPort of schematicPorts) {
      const { x: portX, y: portY } = schPort.center
      const srcPort = su(circuitJson as any).source_port.get(
        schPort.source_port_id,
      )
      const pinNumber = srcPort?.pin_number
      const relX = portX - center.x
      const relY = portY - center.y

      let endX = relX
      let endY = relY

      // @ts-expect-error TODO remove when schematic_port has "side" defined
      const portSide = schPort.side ?? schPort.center.side

      switch (portSide) {
        case "left":
          endX = relX + portLength
          break
        case "right":
          endX = relX - portLength
          break
        case "top":
          endY = relY + portLength
          break
        case "bottom":
          endY = relY - portLength
          break
      }

      // Add port line
      componentChildren.push({
        name: "line",
        type: "element",
        attributes: {
          class: "component-pin",
          x1: relX.toString(),
          y1: relY.toString(),
          x2: endX.toString(),
          y2: endY.toString(),
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
          cx: relX.toString(),
          cy: relY.toString(),
          r: circleRadius.toString(),
          "stroke-width": "0.02",
        },
        value: "",
        children: [],
      })

      // Transform port position for texts
      const [portEndX, portEndY] = applyToPoint(transform, [
        center.x + endX,
        center.y + endY,
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

        switch (portSide) {
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

      // Add pin number
      const pinNumberOffset = 0.2
      let pinX = endX
      let pinY = endY
      let dominantBaseline = "auto"

      switch (portSide) {
        case "top":
          // For top ports, stay at the same X but offset Y upward
          pinY = portY - pinNumberOffset // Move above the circle
          pinX = portX // Stay aligned with port
          dominantBaseline = "auto"
          break
        case "bottom":
          // For bottom ports, stay at the same X but offset Y downward
          pinY = portY + pinNumberOffset
          pinX = portX
          dominantBaseline = "hanging"
          break
        case "left":
          // For left ports, stay at the same Y but offset X
          pinX = portX - pinNumberOffset
          pinY = portY + pinNumberOffset / 4
          dominantBaseline = "auto"
          break
        case "right":
          // For right ports, stay at the same Y but offset X
          pinX = portX + pinNumberOffset
          pinY = portY + pinNumberOffset / 4
          dominantBaseline = "auto"
          break
      }

      // Transform the pin position from local to global coordinates
      const [transformedPinX, transformedPinY] = applyToPoint(transform, [
        pinX,
        pinY,
      ])

      textChildren.push({
        name: "text",
        type: "element",
        attributes: {
          class: "pin-number",
          x: transformedPinX.toString(),
          y: transformedPinY.toString(),
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
