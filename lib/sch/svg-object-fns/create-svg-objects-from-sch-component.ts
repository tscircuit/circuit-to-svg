import type { AnyCircuitElement } from "circuit-json"
import { colorMap } from "lib/utils/colors"
import { getSvg, symbols } from "schematic-symbols"
import { parseSync } from "svgson"

export function createSchematicComponent(
  center: { x: number; y: number },
  size: { width: number; height: number },
  rotation: number,
  symbolName?: string,
  portLabels?: any,
  sourceComponentId?: string,
  schematicComopnentId?: string,
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

    if (manufacturerNumber) {
      children.push({
        name: "text",
        type: "element",
        attributes: {
          class: "component-name",
          x: 1.2,
          y: -size.height / 2 - 0.4,
          "text-anchor": "right",
          "dominant-baseline": "auto",
        },
        children: [{ type: "text", value: manufacturerNumber }],
      })

      children.push({
        name: "text",
        type: "element",
        attributes: {
          class: "component-name",
          x: 1.2,
          y: -size.height / 2 - 0.7,
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
          y: -size.height / 2 - 0.2,
          "text-anchor": "middle",
          "dominant-baseline": "auto",
        },
        children: [{ type: "text", value: resistance || capacitance }],
      })

      children.push({
        name: "text",
        type: "element",
        attributes: {
          class: "component-name",
          x: 0,
          y: -size.height / 2 - 0.5,
          "text-anchor": "middle",
          "dominant-baseline": "auto",
        },
        children: [{ type: "text", value: componentName }],
      })
    }

    // Find and process schematic_port objects
    const schematicPorts =
      circuitJson?.filter(
        (item) =>
          item.type === "schematic_port" &&
          item.schematic_component_id === schematicComopnentId,
      ) || []

    const portLength = 0.2
    const circleRadius = 0.05

    for (const port of schematicPorts) {
      console.log(port)
      const { x, y, pinNumber } = port.center
      const endX = x + (port.center.side === "left" ? -portLength : portLength)
      const endY = y

      // Add port line
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

      // Add port circle
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

      // Add port label if it exists
      const labelKey = `pin${pinNumber}`
      if (portLabels && labelKey in portLabels) {
        const labelX = x + (port.center.side === "left" ? 0.5 : -0.5)
        children.push({
          name: "text",
          type: "element",
          attributes: {
            class: "port-label",
            x: labelX,
            y: y,
            "text-anchor": port.center.side === "left" ? "end" : "start",
            "dominant-baseline": "middle",
            "font-size": "0.2",
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
          y: endY - 0.15,
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          "font-size": "0.15",
        },
        children: [{ type: "text", value: pinNumber }],
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
