import type { AnyCircuitElement, SchematicPort, SourcePort } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint, type Matrix } from "transformation-matrix"
import { isSourcePortConnected } from "lib/utils/is-source-port-connected"
import type { ColorMap } from "lib/utils/colors"
import { getSchScreenFontSize } from "lib/utils/get-sch-font-size"

const PIN_CIRCLE_RADIUS_MM = 0.02

/**
 * Creates SVG objects for schematic port indicators (small circles and labels at port positions).
 * Only draws circles for unconnected ports, matching schematic box behavior.
 */
export const createSvgObjectsForSchPortIndicator = ({
  schPort,
  transform,
  circuitJson,
  colorMap,
}: {
  schPort: SchematicPort
  transform: Matrix
  circuitJson: AnyCircuitElement[]
  colorMap: ColorMap
}): SvgObject[] => {
  const isConnected = isSourcePortConnected(circuitJson, schPort.source_port_id)

  const svgObjects: SvgObject[] = []

  const radiusPx = Math.abs(transform.a) * PIN_CIRCLE_RADIUS_MM
  const strokeWidth = Math.abs(transform.a) * PIN_CIRCLE_RADIUS_MM
  const screenPos = applyToPoint(transform, schPort.center)

  // Only draw port circle if not connected (same as schematic box behavior)
  if (!isConnected) {
    svgObjects.push({
      name: "circle",
      type: "element",
      value: "",
      attributes: {
        class: "component-pin",
        cx: screenPos.x.toString(),
        cy: screenPos.y.toString(),
        r: radiusPx.toString(),
        fill: "none",
        stroke: colorMap.schematic.component_outline,
        "stroke-width": strokeWidth.toString(),
        "data-schematic-port-id": schPort.schematic_port_id,
      },
      children: [],
    })
  }

  // Get port label from display_pin_label or source_port name
  const sourcePort = circuitJson.find(
    (e) =>
      e.type === "source_port" && e.source_port_id === schPort.source_port_id,
  ) as SourcePort | undefined
  const label = schPort.display_pin_label ?? sourcePort?.name

  if (label) {
    // Position label at center of stem line (midpoint between port center and component edge)
    // with offset perpendicular to the line to avoid overlap
    const labelPos = { ...schPort.center }
    const stemLength = schPort.distance_from_component_edge ?? 0
    const labelOffset = 0.05 // Offset perpendicular to stem line
    let textAnchor = "middle"
    let rotation = ""

    // Move label to midpoint of stem line (opposite of facing direction toward component)
    // Text anchor and rotation follow schematic box pin label conventions
    switch (schPort.facing_direction) {
      case "left":
        labelPos.x += stemLength / 2
        labelPos.y += labelOffset // Offset below
        textAnchor = "start"
        break
      case "right":
        labelPos.x -= stemLength / 2
        labelPos.y += labelOffset // Offset below
        textAnchor = "end"
        break
      case "up":
        labelPos.y -= stemLength / 2
        labelPos.x -= labelOffset // Offset to the left
        textAnchor = "middle" // Centered on stem midpoint
        break
      case "down":
        labelPos.y += stemLength / 2
        labelPos.x -= labelOffset // Offset to the left
        textAnchor = "middle" // Centered on stem midpoint
        break
    }

    const screenLabelPos = applyToPoint(transform, labelPos)
    const fontSizePx = getSchScreenFontSize(transform, "pin_number")

    // Rotate vertical labels -90 degrees like schematic box pin labels
    if (
      schPort.facing_direction === "up" ||
      schPort.facing_direction === "down"
    ) {
      rotation = `rotate(-90 ${screenLabelPos.x} ${screenLabelPos.y})`
    }

    svgObjects.push({
      name: "text",
      type: "element",
      value: "",
      attributes: {
        class: "port-indicator-label",
        x: screenLabelPos.x.toString(),
        y: screenLabelPos.y.toString(),
        fill: colorMap.schematic.component_outline,
        "font-family": "sans-serif",
        "font-size": `${fontSizePx * 0.7}px`,
        "text-anchor": textAnchor,
        "dominant-baseline": "middle",
        ...(rotation && { transform: rotation }),
      },
      children: [
        {
          type: "text",
          value: label,
          name: "",
          attributes: {},
          children: [],
        },
      ],
    })
  }

  return svgObjects
}
