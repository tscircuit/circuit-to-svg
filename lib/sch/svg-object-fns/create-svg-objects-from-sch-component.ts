import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { colorMap } from "lib/utils/colors"
import { getSvg, symbols } from "schematic-symbols"
import { parseSync } from "svgson"
import type { Matrix } from "transformation-matrix"

interface PortArrangementCenter {
  x: number
  y: number
  trueIndex: number
  pinNumber: number
  side: "left" | "right" | "top" | "bottom"
  distanceFromEdge: number
}

interface PortArrangement extends SchematicPort {
  center: PortArrangementCenter
}

export function createSchematicComponent({
  component,
  circuitJson,
}: {
  component: SchematicComponent
  transform: Matrix
  circuitJson: AnyCircuitElement[]
}): SvgObject[] {
  const center = component.center
  const size = component.size
  const rotation = component.rotation
  const symbolName = component.symbol_name
  const portLabels = component.port_labels
  const sourceComponentId = component.source_component_id
  const schematicComponentId = component.schematic_component_id

  const transformString = `translate(${center.x}, ${center.y}) rotate(${(rotation * 180) / Math.PI})`

  let children: SvgObject[] = []

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
      value: "",
      attributes: {
        class: "component chip",
        x: (-size.width / 2).toString(),
        y: (-size.height / 2).toString(),
        width: size.width.toString(),
        height: size.height.toString(),
      },
      children: [],
    })

    if (manufacturerNumber) {
      children.push({
        name: "text",
        type: "element",
        attributes: {
          class: "component-name",
          x: (1.2).toString(),
          y: (-size.height / 2 - 0.5).toString(),
          "text-anchor": "right",
          "dominant-baseline": "auto",
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

      children.push({
        name: "text",
        type: "element",
        attributes: {
          class: "component-name",
          x: (1.2).toString(),
          y: (-size.height / 2 - 0.7).toString(),
          "text-anchor": "right",
          "dominant-baseline": "auto",
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

    // Find and process schematic_port objects
    const schematicPorts =
      circuitJson?.filter(
        (item) =>
          item.type === "schematic_port" &&
          item.schematic_component_id === schematicComponentId,
      ) || []

    const portLength = 0.2
    const circleRadius = 0.05

    for (const port of schematicPorts as PortArrangement[]) {
      const { x: portX, y: portY, pinNumber } = port.center
      const x = portX - center.x
      const y = portY - center.y
      let endX = x
      let endY = y
      let labelX = x
      let labelY = y
      let textAnchor = "middle"
      let dominantBaseline = "middle"

      switch (port.center.side) {
        case "left":
          endX = x - portLength
          labelX = x + 0.2
          textAnchor = "start"
          break
        case "right":
          endX = x + portLength
          labelX = x - 0.2
          textAnchor = "end"
          break
        case "top":
          endY = y - portLength
          labelY = y - 0.2
          dominantBaseline = "hanging"
          break
        case "bottom":
          endY = y + portLength
          labelY = y + 0.2
          dominantBaseline = "auto"
          break
      }

      // Add port line
      children.push({
        name: "line",
        type: "element",
        attributes: {
          class: "component-pin",
          x1: x.toString(),
          y1: y.toString(),
          x2: endX.toString(),
          y2: endY.toString(),
        },
        value: "",
        children: [],
      })

      // Add port circle
      children.push({
        name: "circle",
        type: "element",
        attributes: {
          class: "component-pin",
          cx: endX.toString(),
          cy: endY.toString(),
          r: circleRadius.toString(),
        },
        value: "",
        children: [],
      })

      // Add port label if it exists
      const labelKey = `pin${pinNumber}`
      if (portLabels && labelKey in portLabels) {
        children.push({
          name: "text",
          type: "element",
          attributes: {
            class: "port-label",
            x: labelX.toString(),
            y: labelY.toString(),
            "text-anchor": textAnchor,
            "dominant-baseline": dominantBaseline,
            "font-size": "0.2",
          },
          children: [
            {
              type: "text",
              value: portLabels[labelKey]!,
              name: "",
              attributes: {},
              children: [],
            },
          ],
          value: "",
        })
      }

      // Add pin number
      const pinNumberX = endX
      let pinNumberY = endY
      const pinNumberAnchor = "middle"
      let pinNumberBaseline = "middle"

      switch (port.center.side) {
        case "left":
        case "right":
          pinNumberY -= 0.15
          break
        case "top":
          pinNumberY -= 0.15
          pinNumberBaseline = "auto"
          break
        case "bottom":
          pinNumberY += 0.15
          pinNumberBaseline = "hanging"
          break
      }

      children.push({
        name: "text",
        type: "element",
        attributes: {
          class: "pin-number",
          x: pinNumberX.toString(),
          y: pinNumberY.toString(),
          "text-anchor": pinNumberAnchor,
          "dominant-baseline": pinNumberBaseline,
          "font-size": "0.15",
        },
        value: "",
        children: [
          {
            type: "text",
            value: pinNumber.toString(),
            name: "",
            attributes: {},
            children: [],
          },
        ],
      })
    }
  }

  if (resistance || capacitance) {
    children.push({
      name: "text",
      type: "element",
      attributes: {
        class: "component-name",
        x: "0",
        y: (-size.height / 2 - 0.2).toString(),
        "text-anchor": "middle",
        "dominant-baseline": "auto",
      },
      value: (resistance || capacitance || "").toString(),
      children: [],
    })

    children.push({
      name: "text",
      type: "element",
      attributes: {
        class: "component-name",
        x: "0",
        y: (-size.height / 2 - 0.5).toString(),
        "text-anchor": "middle",
        "dominant-baseline": "auto",
      },
      value: "",
      children: [
        {
          type: "text",
          value: componentName || "",
          name: "",
          attributes: {},
          children: [],
        },
      ],
    })
  }

  return [
    {
      name: "g",
      value: "",
      type: "element",
      attributes: { transform: transformString },
      children,
    },
  ]
}
