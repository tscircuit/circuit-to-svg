import type { AnyCircuitElement } from "circuit-json"
import { colorMap } from "lib/utils/colors"
import { getSvg, symbols } from "schematic-symbols"
import { parseSync, stringify } from "svgson"

interface Options {
  width?: number
  height?: number
}

export function convertCircuitJsonToSchematicSvg(
  soup: AnyCircuitElement[],
  options?: Options,
): string {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  const portSize = 0.2
  const portPositions = new Map()

  // First pass: find the bounds and collect port positions
  for (const item of soup) {
    if (item.type === "schematic_component") {
      updateBounds(item.center, item.size, item.rotation || 0)
    } else if (item.type === "schematic_port") {
      updateBounds(item.center, { width: portSize, height: portSize }, 0)
      portPositions.set(item.schematic_port_id, item.center)
    }
  }

  const height = maxY - minY
  const flipY = (y: number) => height - (y - minY) + minY

  const svgChildren: any[] = []

  // Process components
  const componentMap = new Map()
  for (const component of soup.filter(
    (item) => item.type === "schematic_component",
  )) {
    const flippedCenter = {
      x: component.center.x,
      y: flipY(component.center.y),
    }
    const svg = createSchematicComponent(
      flippedCenter,
      component.size,
      component.rotation || 0,
      (component as any).symbol_name,
      (component as any).port_arrangement,
      (component as any).port_labels,
      (component as any).source_component_id,
      soup,
    )
    svgChildren.push(svg)
    componentMap.set(component.schematic_component_id, component)
  }

  // Process schematic traces
  for (const trace of soup.filter((item) => item.type === "schematic_trace")) {
    const svg = createSchematicTrace(trace, flipY, portPositions)
    if (svg) svgChildren.push(svg)
  }

  const padding = 1
  const width = maxX - minX + 2 * padding
  const viewBox = `${minX - padding} ${minY - padding} ${width} ${height + 2 * padding}`

  const svgObject = {
    name: "svg",
    type: "element",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox,
      width: options?.width ?? "1200",
      height: options?.height ?? "600",
      style: `background-color: ${colorMap.schematic.background}`,
    },
    children: [
      {
        name: "style",
        type: "element",
        children: [
          {
            type: "text",
            value: `
              .component { fill: none; stroke: ${colorMap.schematic.component_outline}; stroke-width: 0.03; }
              .chip { fill: ${colorMap.schematic.component_body}; stroke: ${colorMap.schematic.component_outline}; stroke-width: 0.03; }
              .component-pin { fill: none; stroke: ${colorMap.schematic.component_outline}; stroke-width: 0.02; }
              .trace { stroke: ${colorMap.schematic.wire}; stroke-width: 0.02; fill: none; }
              .text { font-family: Arial, sans-serif; font-size: 0.2px; fill: ${colorMap.schematic.wire}; }
              .pin-number { font-size: 0.15px; fill: ${colorMap.schematic.pin_number}; }
              .port-label { fill: ${colorMap.schematic.reference}; }
              .component-name { font-size: 0.25px; fill: ${colorMap.schematic.reference}; }
            `,
          },
        ],
      },
      ...svgChildren,
    ],
  }

  return stringify({ value: "", ...svgObject })

  function createSchematicComponent(
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
    const componentName = sourceComponent ? sourceComponent.name : ""
    const manufacturerNumber = sourceComponent?.manufacturer_part_number
    const resistance = sourceComponent?.resistance
    const capacitance = sourceComponent?.capacitance

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
          y: (-size.height / 2) - 0.2, // Position above the component
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
          y: (-size.height / 2) - 0.5, // Position above the component
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
        if(arrangement === undefined) continue
        
        const pins = arrangement.pins
        const direction = arrangement.direction

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

  function createSchematicTrace(
    trace: any,
    flipY: (y: number) => number,
    portPositions: Map<string, { x: number; y: number }>,
  ): any {
    const edges = trace.edges
    if (edges.length === 0) return null

    let path = ""

    // Process all edges
    edges.forEach((edge: any, index: number) => {
      const fromPoint =
        edge.from.ti !== undefined ? portPositions.get(edge.from.ti) : edge.from
      const toPoint =
        edge.to.ti !== undefined ? portPositions.get(edge.to.ti) : edge.to

      if (!fromPoint || !toPoint) {
        return
      }

      const fromCoord = `${fromPoint.x - 0.15} ${flipY(fromPoint.y)}`
      const toCoord = `${toPoint.x + 0.15} ${flipY(toPoint.y)}`

      if (index === 0) {
        path += `M ${fromCoord} L ${toCoord}`
      } else {
        path += ` L ${toCoord}`
      }
    })

    // Handle connection to final port if needed
    if (trace.to_schematic_port_id) {
      const finalPort = portPositions.get(trace.to_schematic_port_id)
      if (finalPort) {
        const lastFromPoint = path.split("M")[1]?.split("L")[0]
        const lastEdge = edges[edges.length - 1]
        const lastPoint =
          lastEdge.to.ti !== undefined
            ? portPositions.get(lastEdge.to.ti)
            : lastEdge.to
        if (lastPoint.x !== finalPort.x || lastPoint.y !== finalPort.y) {
          const finalCoord = `${finalPort.x} ${flipY(finalPort.y)}`
          path += ` M ${lastFromPoint} L ${finalCoord}`
        }
      }
    }

    return path
      ? {
          name: "path",
          type: "element",
          attributes: {
            class: "trace",
            d: path,
          },
        }
      : null
  }

  function updateBounds(center: any, size: any, rotation: number) {
    const corners = [
      { x: -size.width / 2, y: -size.height / 2 },
      { x: size.width / 2, y: -size.height / 2 },
      { x: size.width / 2, y: size.height / 2 },
      { x: -size.width / 2, y: size.height / 2 },
    ]

    for (const corner of corners) {
      const rotatedX =
        corner.x * Math.cos(rotation) - corner.y * Math.sin(rotation) + center.x
      const rotatedY =
        corner.x * Math.sin(rotation) + corner.y * Math.cos(rotation) + center.y
      minX = Math.min(minX, rotatedX)
      minY = Math.min(minY, rotatedY)
      maxX = Math.max(maxX, rotatedX)
      maxY = Math.max(maxY, rotatedY)
    }
  }
}

/**
 * @deprecated use `convertCircuitJsonToSchematicSvg` instead
 */
export const circuitJsonToSchematicSvg = convertCircuitJsonToSchematicSvg
