import type { AnyCircuitElement } from "circuit-json";
import { colorMap } from "lib/utils/colors";
import { getSvg, symbols } from "schematic-symbols";
import { parseSync } from "svgson";

export function createSchematicComponent(
    center: { x: number; y: number },
    size: { width: number; height: number },
    rotation: number,
    symbolName?: string,
    portArrangement?: any,
    portLabels?: any,
    sourceComponentId?: string,
    circuitJson?: AnyCircuitElement[],
  ): any {
    const transform = `translate(${center.x}, ${center.y}) rotate(${(rotation * 180) / Math.PI})`

    let children: any[] = []

    // Find the source component and get its name
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

      children = svg.children
        .filter(
          (child: any) =>
            child.name === "path" && child.attributes.fill !== "green",
        )
        .map((path: any) => {
          const currentStrokeWidth = Number.parseFloat(
            path.attributes["stroke-width"] || "0.02",
          )
          const newStrokeWidth = (currentStrokeWidth * 1.5).toString()

          return {
            ...path,
            attributes: {
              ...path.attributes,
              stroke:
                path.attributes.stroke === "black"
                  ? `${colorMap.schematic.component_outline}`
                  : path.attributes.stroke,
              "stroke-width": newStrokeWidth,
            },
          }
        })
    } else {
      children.push({
        name: "rect",
        type: "element",
        attributes: {
          class: "component chip",
          x: -size.width / 2,
          y: -size.height / 2,
          width: size.width,
          height: size.height,
        },
      })
    }

    if (manufacturerNumber) {
      children.push({
        name: "text",
        type: "element",
        attributes: {
          class: "component-name",
          x: 1.2,
          y: -size.height / 2 - 0.4, // Position above the component
          "text-anchor": "right",
          "dominant-baseline": "auto",
        },
        children: [{ type: "text", value: manufacturerNumber }],
      })

      // Add component name on top
      children.push({
        name: "text",
        type: "element",
        attributes: {
          class: "component-name",
          x: 1.2,
          y: -size.height / 2 - 0.7, // Position above the component
          "text-anchor": "right",
          "dominant-baseline": "auto",
        },
        children: [{ type: "text", value: componentName }],
      })
    }

    if (resistance || capacitance) {
      children.push({
        name: "text",
        type: "element",
        attributes: {
          class: "component-name",
          x: 0,
          y: -size.height / 2 - 0.2, // Position above the component
          "text-anchor": "middle",
          "dominant-baseline": "auto",
        },
        children: [{ type: "text", value: resistance || capacitance }],
      })

      // Add component name on top
      children.push({
        name: "text",
        type: "element",
        attributes: {
          class: "component-name",
          x: 0,
          y: -size.height / 2 - 0.5, // Position above the component
          "text-anchor": "middle",
          "dominant-baseline": "auto",
        },
        children: [{ type: "text", value: componentName }],
      })
    }

    // Add ports if portArrangement is provided
    if (portArrangement) {
      const portLength = 0.2 // Length of the port line
      const circleRadius = 0.05 // Radius of the port circle
      const labelOffset = 0.1 // Offset for label positioning

      // console.log(portArrangement)

      for (const [side, arrangement] of Object.entries(portArrangement)) {
        if (!arrangement) continue

        const pins = (arrangement as any).pins
        const direction = (arrangement as any).direction

        let getX: (index: number, total: number) => number
        let getY: (index: number, total: number) => number
        let getEndX: (x: number) => number
        let getEndY: (y: number) => number
        let getLabelX: (x: number) => number
        let getLabelY: (y: number) => number
        let labelAnchor: string
        let isVertical = false

        switch (side) {
          case "left_side":
            getX = () => -size.width / 2
            getY = (index, total) =>
              -size.height / 2 + (size.height * (index + 1)) / (total + 1)
            getEndX = (x) => x - portLength
            getEndY = (y) => y
            getLabelX = (x) => x + labelOffset
            getLabelY = (y) => y
            labelAnchor = "start"
            break
          case "right_side":
            getX = () => size.width / 2
            getY = (index, total) =>
              -size.height / 2 + (size.height * (index + 1)) / (total + 1)
            getEndX = (x) => x + portLength
            getEndY = (y) => y
            getLabelX = (x) => x - labelOffset
            getLabelY = (y) => y
            labelAnchor = "end"
            break
          case "top_side":
            getX = (index, total) =>
              -size.width / 2 + (size.width * (index + 1)) / (total + 1)
            getY = () => -size.height / 2
            getEndX = (x) => x
            getEndY = (y) => y - portLength
            getLabelX = (x) => x
            getLabelY = (y) => y + labelOffset + 0.15
            labelAnchor = "middle"
            isVertical = true
            break
          case "bottom_side":
            getX = (index, total) =>
              -size.width / 2 + (size.width * (index + 1)) / (total + 1)
            getY = () => size.height / 2
            getEndX = (x) => x
            getEndY = (y) => y + portLength
            getLabelX = (x) => x
            getLabelY = (y) => y - labelOffset - 0.15
            labelAnchor = "middle"
            isVertical = true
            break
          default:
            continue // Skip unknown sides
        }

        const totalPins = pins.length

        pins.forEach((pin: number, index: number) => {
          let x = getX(index, totalPins)
          let y = getY(index, totalPins)

          if (direction === "bottom-to-top" || direction === "right-to-left") {
            ;[x, y] = [
              getX(totalPins - 1 - index, totalPins),
              getY(totalPins - 1 - index, totalPins),
            ]
          }

          const endX = getEndX(x)
          const endY = getEndY(y)

          children.push({
            name: "line",
            type: "element",
            attributes: {
              class: "component-pin",
              x1: x,
              y1: y,
              x2: endX,
              y2: endY,
            },
          })

          children.push({
            name: "circle",
            type: "element",
            attributes: {
              class: "component-pin",
              cx: endX,
              cy: endY,
              r: circleRadius,
            },
          })

          // Add label if it exists in portLabels
          const labelKey = `pin${pin}`
          if (portLabels && labelKey in portLabels) {
            let labelTransform = ""
            if (isVertical) {
              labelTransform = `rotate(${side === "top_side" ? -90 : 270}, ${getLabelX(x)}, ${getLabelY(y)})`
            }
            children.push({
              name: "text",
              type: "element",
              attributes: {
                class: "port-label",
                x: getLabelX(x),
                y: getLabelY(y),
                "text-anchor": labelAnchor,
                "dominant-baseline": "middle",
                "font-size": "0.2",
                transform: labelTransform,
              },
              children: [{ type: "text", value: portLabels[labelKey] }],
            })
          }
          // Add pin number
          children.push({
            name: "text",
            type: "element",
            attributes: {
              class: "pin-number",
              x: endX,
              y: endY + (side === "bottom_side" ? 0.15 : -0.15),
              "text-anchor": "middle",
              "dominant-baseline": "middle",
              "font-size": "0.15",
            },
            children: [{ type: "text", value: pin.toString() }],
          })
        })
      }
    }

    return {
      name: "g",
      type: "element",
      attributes: { transform },
      children,
    }
  }